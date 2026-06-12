using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using QuangTrung.Application.Integrations.ZaloPay;
using QuangTrung.Domain.Entities;
using QuangTrung.Domain.Enums;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Infrastructure.Payments;

public sealed class ZaloPayGateway(
    IHttpClientFactory httpClientFactory,
    IOptions<ZaloPayOptions> options,
    ApplicationDbContext db,
    ILogger<ZaloPayGateway> logger)
{
    public const string HttpClientName = "ZaloPay";

    private static readonly JsonSerializerOptions EmbedJsonOptions = new()
    {
        PropertyNamingPolicy = null,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public async Task<ZaloPayCreateOrderResult> CreateOrderAsync(
        Guid studentId,
        long amountVnd,
        string? description,
        Guid recordedByUserId,
        Guid? studentFeeAssignmentId,
        CancellationToken ct)
    {
        var opt = options.Value;
        if (!opt.Enabled)
            return new(false, null, null, "ZaloPay đang tắt (ZaloPay:Enabled=false).", null, null);

        if (string.IsNullOrWhiteSpace(opt.AppId) || string.IsNullOrWhiteSpace(opt.Key1))
            return new(false, null, null, "Thiếu cấu hình ZaloPay:AppId hoặc ZaloPay:Key1.", null, null);

        if (amountVnd <= 0)
            return new(false, null, null, "Số tiền phải > 0 (VND, số nguyên).", null, null);

        var studentOk = await db.Students.AsNoTracking().AnyAsync(s => s.Id == studentId && !s.IsDeleted, ct);
        if (!studentOk)
            return new(false, null, null, "Học sinh không tồn tại.", null, null);

        var appTransId = BuildAppTransId();
        var appTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        var appUser = recordedByUserId.ToString("N");
        var amountStr = amountVnd.ToString();
        var desc = string.IsNullOrWhiteSpace(description) ? $"Thu học phí #{appTransId}" : description.Trim();
        if (desc.Length > 240)
            desc = desc[..240];

        var returnUrl = string.IsNullOrWhiteSpace(opt.ReturnRedirectUrl)
            ? "http://localhost:5173/parent/payments?from=zalopay"
            : opt.ReturnRedirectUrl.Trim();
        var embedDataJson = JsonSerializer.Serialize(new Dictionary<string, string> { ["redirecturl"] = returnUrl }, EmbedJsonOptions);
        const string itemJson = "[]";

        var mac = ZaloPayMac.BuildCreateOrderMac(opt.Key1, opt.AppId, appTransId, appUser, amountStr, appTime, embedDataJson, itemJson);

        var order = new ZaloPayOrder
        {
            Id = Guid.NewGuid(),
            AppTransId = appTransId,
            StudentId = studentId,
            StudentFeeAssignmentId = studentFeeAssignmentId,
            AmountVnd = amountVnd,
            Description = desc,
            Status = ZaloPayOrderStatus.Pending,
            RecordedByUserId = recordedByUserId,
            CreatedAt = DateTime.UtcNow
        };
        db.ZaloPayOrders.Add(order);
        await db.SaveChangesAsync(ct);

        var form = new List<KeyValuePair<string, string>>
        {
            new("app_id", opt.AppId),
            new("app_user", appUser),
            new("app_time", appTime),
            new("app_trans_id", appTransId),
            new("amount", amountStr),
            new("description", desc),
            new("embed_data", embedDataJson),
            new("item", itemJson),
            new("bank_code", ""),
            new("mac", mac)
        };

        if (!string.IsNullOrWhiteSpace(opt.CallbackBaseUrl))
        {
            var cb = opt.CallbackBaseUrl.TrimEnd('/') + "/api/payments/zalopay/callback";
            form.Add(new KeyValuePair<string, string>("callback_url", cb));
        }

        try
        {
            var client = httpClientFactory.CreateClient(HttpClientName);
            using var content = new FormUrlEncodedContent(form);
            using var resp = await client.PostAsync(opt.CreateEndpoint, content, ct);
            var json = await resp.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var returnCode = ReadReturnCode(root);

            if (returnCode != 1)
            {
                var msg = root.TryGetProperty("return_message", out var rm) ? rm.GetString() : json;
                order.Status = ZaloPayOrderStatus.Failed;
                await db.SaveChangesAsync(ct);
                logger.LogWarning("ZaloPay create failed: {Msg}", msg);
                return new(false, null, null, msg ?? "ZaloPay tạo đơn thất bại.", appTransId, order.Id);
            }

            var orderUrl = root.TryGetProperty("order_url", out var ou) ? ou.GetString() : null;
            var qr = root.TryGetProperty("qr_code", out var qrEl) ? qrEl.GetString() : null;
            if (string.IsNullOrEmpty(orderUrl))
            {
                order.Status = ZaloPayOrderStatus.Failed;
                await db.SaveChangesAsync(ct);
                return new(false, null, null, "Thiếu order_url trong phản hồi ZaloPay.", appTransId, order.Id);
            }

            return new(true, orderUrl, qr, null, appTransId, order.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "ZaloPay create HTTP error");
            order.Status = ZaloPayOrderStatus.Failed;
            await db.SaveChangesAsync(ct);
            return new(false, null, null, "Lỗi kết nối ZaloPay: " + ex.Message, appTransId, order.Id);
        }
    }

    public async Task<string?> QueryOrderRawJsonAsync(string appTransId, CancellationToken ct)
    {
        var opt = options.Value;
        if (!opt.Enabled || string.IsNullOrWhiteSpace(opt.AppId) || string.IsNullOrWhiteSpace(opt.Key1))
            return null;

        var mac = ZaloPayMac.BuildQueryMac(opt.Key1, opt.AppId, appTransId);
        var form = new Dictionary<string, string>
        {
            ["app_id"] = opt.AppId,
            ["app_trans_id"] = appTransId,
            ["mac"] = mac
        };

        var client = httpClientFactory.CreateClient(HttpClientName);
        using var content = new FormUrlEncodedContent(form);
        using var resp = await client.PostAsync(opt.QueryEndpoint, content, ct);
        return await resp.Content.ReadAsStringAsync(ct);
    }

    /// <summary>Xử lý callback server-to-server ZaloPay (JSON body). Trả mã phản hồi theo tài liệu ZaloPay.</summary>
    public async Task<ZaloPayCallbackAck> ProcessCallbackAsync(string dataRaw, string macReceived, CancellationToken ct)
    {
        var opt = options.Value;
        if (string.IsNullOrWhiteSpace(opt.Key2))
            return new(2, "missing key2");

        if (!ZaloPayMac.CallbackMacValid(opt.Key2, dataRaw, macReceived))
        {
            logger.LogWarning("ZaloPay callback MAC không hợp lệ.");
            return new(2, "invalid mac");
        }

        try
        {
            using var payload = JsonDocument.Parse(dataRaw);
            var root = payload.RootElement;
            var appTransId = GetString(root, "app_trans_id");
            if (string.IsNullOrEmpty(appTransId))
                return new(2, "missing app_trans_id");

            var amountCb = GetInt64(root, "amount");
            var zpTransId = GetString(root, "zp_trans_id");

            var order = await db.ZaloPayOrders.FirstOrDefaultAsync(o => o.AppTransId == appTransId, ct);
            if (order is null)
                return new(2, "unknown app_trans_id");

            if (order.Status == ZaloPayOrderStatus.Completed)
                return new(1, "success");

            if (order.Status != ZaloPayOrderStatus.Pending)
                return new(2, "order not pending");

            if (amountCb != order.AmountVnd)
            {
                logger.LogWarning("ZaloPay callback amount mismatch: cb={Cb} order={Ord}", amountCb, order.AmountVnd);
                order.Status = ZaloPayOrderStatus.Failed;
                await db.SaveChangesAsync(ct);
                return new(2, "amount mismatch");
            }

            return await ConfirmOrderPaidAsync(order, amountCb, zpTransId, appTransId, ct);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "ZaloPay callback data không phải JSON.");
            return new(2, "invalid data json");
        }
    }

    /// <summary>
    /// Khi callback không tới được máy dev (thiếu HTTPS/ngrok), gọi API query ZaloPay để đối soát và ghi <see cref="Payment"/> nếu đã thu tiền.
    /// </summary>
    public async Task<ZaloPaySyncFromQueryResult> TrySyncCompletedFromQueryAsync(string appTransId, CancellationToken ct)
    {
        var opt = options.Value;
        if (!opt.Enabled || string.IsNullOrWhiteSpace(opt.AppId) || string.IsNullOrWhiteSpace(opt.Key1))
            return new(ZaloPaySyncStatus.Disabled, "ZaloPay chưa bật hoặc thiếu AppId/Key1.");

        var tid = appTransId.Trim();
        if (tid.Length == 0)
            return new(ZaloPaySyncStatus.Invalid, "Thiếu app_trans_id.");

        var order = await db.ZaloPayOrders.FirstOrDefaultAsync(o => o.AppTransId == tid, ct);
        if (order is null)
            return new(ZaloPaySyncStatus.NotFound, "Không tìm thấy đơn.");

        if (order.Status == ZaloPayOrderStatus.Completed)
            return new(ZaloPaySyncStatus.AlreadyCompleted, "Đơn đã được ghi nhận thanh toán.");

        if (order.Status != ZaloPayOrderStatus.Pending)
            return new(ZaloPaySyncStatus.NotPending, "Đơn không còn ở trạng thái chờ thanh toán.");

        var json = await QueryOrderRawJsonAsync(tid, ct);
        if (json is null)
            return new(ZaloPaySyncStatus.QueryFailed, "Không gọi được API truy vấn ZaloPay.");

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var rc = ReadReturnCode(root);
            if (rc == 3)
                return new(ZaloPaySyncStatus.Pending, "ZaloPay báo đơn chưa thanh toán hoặc đang xử lý.");

            if (rc != 1)
            {
                var msg = root.TryGetProperty("return_message", out var rm) ? rm.GetString() : json;
                return new(ZaloPaySyncStatus.QueryFailed, msg ?? $"return_code={rc}");
            }

            var isProcessing = true;
            if (root.TryGetProperty("is_processing", out var ipEl))
            {
                isProcessing = ipEl.ValueKind switch
                {
                    JsonValueKind.False => false,
                    JsonValueKind.True => true,
                    JsonValueKind.String => !string.Equals(ipEl.GetString(), "false", StringComparison.OrdinalIgnoreCase),
                    _ => true,
                };
            }

            if (isProcessing)
                return new(ZaloPaySyncStatus.Pending, "Đơn vẫn đang xử lý tại ZaloPay.");

            var amt = GetInt64(root, "amount");
            if (amt < 1)
                return new(ZaloPaySyncStatus.Pending, "ZaloPay chưa trả về số tiền — thử lại sau vài giây.");

            if (amt != order.AmountVnd)
            {
                logger.LogWarning("ZaloPay query amount mismatch: q={Q} order={Ord}", amt, order.AmountVnd);
                return new(ZaloPaySyncStatus.AmountMismatch, $"Số tiền ZaloPay ({amt}) không khớp đơn ({order.AmountVnd}).");
            }

            var zpTransId = GetString(root, "zp_trans_id");
            var ack = await ConfirmOrderPaidAsync(order, amt, zpTransId, tid, ct);
            return ack.ReturnCode == 1
                ? new(ZaloPaySyncStatus.Completed, "Đã ghi nhận thanh toán.")
                : new(ZaloPaySyncStatus.Failed, ack.ReturnMessage);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "ZaloPay query JSON không hợp lệ.");
            return new(ZaloPaySyncStatus.QueryFailed, "Phản hồi query không phải JSON hợp lệ.");
        }
    }

    async Task<ZaloPayCallbackAck> ConfirmOrderPaidAsync(
        ZaloPayOrder order,
        long amountCb,
        string? zpTransId,
        string appTransIdForNote,
        CancellationToken ct)
    {
        if (order.Status == ZaloPayOrderStatus.Completed)
            return new(1, "success");

        if (order.Status != ZaloPayOrderStatus.Pending)
            return new(2, "order not pending");

        if (amountCb != order.AmountVnd)
        {
            logger.LogWarning("ZaloPay confirm amount mismatch: cb={Cb} order={Ord}", amountCb, order.AmountVnd);
            order.Status = ZaloPayOrderStatus.Failed;
            await db.SaveChangesAsync(ct);
            return new(2, "amount mismatch");
        }

        var receipt = string.IsNullOrEmpty(zpTransId) ? appTransIdForNote : zpTransId;
        if (receipt.Length > 128)
            receipt = receipt[..128];

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            StudentId = order.StudentId,
            StudentFeeAssignmentId = order.StudentFeeAssignmentId,
            Amount = order.AmountVnd,
            PaidAt = DateTime.UtcNow,
            Method = PaymentMethod.ZaloPay,
            ReceiptNumber = receipt,
            Note = order.StudentFeeAssignmentId is { } aid
                ? $"ZaloPay app_trans_id={appTransIdForNote}, gán_phí={aid:N}"
                : $"ZaloPay app_trans_id={appTransIdForNote}",
            RecordedByUserId = order.RecordedByUserId,
            CreatedAt = DateTime.UtcNow
        };
        db.Payments.Add(payment);
        order.Status = ZaloPayOrderStatus.Completed;
        order.ZpTransId = zpTransId;
        order.PaymentId = payment.Id;
        order.CompletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return new(1, "success");
    }

    static string? GetString(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var el))
            return null;
        return el.ValueKind switch
        {
            JsonValueKind.String => el.GetString(),
            JsonValueKind.Number => el.GetRawText(),
            _ => null
        };
    }

    static long GetInt64(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var el))
            return 0;
        return el.ValueKind switch
        {
            JsonValueKind.Number => el.GetInt64(),
            JsonValueKind.String => long.TryParse(el.GetString(), out var n) ? n : 0,
            _ => 0
        };
    }

    static string BuildAppTransId() =>
        DateTime.UtcNow.ToString("yyMMdd") + "_" + Guid.NewGuid().ToString("N")[..12];

    static int ReadReturnCode(JsonElement root)
    {
        if (!root.TryGetProperty("return_code", out var rc))
            return 2;
        return rc.ValueKind switch
        {
            JsonValueKind.Number => rc.GetInt32(),
            JsonValueKind.String => int.TryParse(rc.GetString(), out var n) ? n : 2,
            _ => 2
        };
    }
}

public sealed record ZaloPayCreateOrderResult(
    bool Ok,
    string? OrderUrl,
    string? QrCode,
    string? ErrorMessage,
    string? AppTransId,
    Guid? LocalOrderId);

public sealed record ZaloPayCallbackAck(int ReturnCode, string ReturnMessage);

public enum ZaloPaySyncStatus
{
    Completed,
    AlreadyCompleted,
    Pending,
    NotFound,
    NotPending,
    AmountMismatch,
    QueryFailed,
    Failed,
    Disabled,
    Invalid,
}

public sealed record ZaloPaySyncFromQueryResult(ZaloPaySyncStatus Status, string Message);
