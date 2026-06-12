using System.Security.Claims;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QuangTrung.Api.Authorization;
using QuangTrung.Application.Constants;
using QuangTrung.Application.Integrations.ZaloPay;
using QuangTrung.Domain.Enums;
using QuangTrung.Infrastructure.Payments;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Controllers;

[ApiController]
[Route("api/payments/zalopay")]
public sealed class ZaloPayPaymentsController(
    ZaloPayGateway zaloPay,
    IOptions<ZaloPayOptions> zaloOptions,
    ApplicationDbContext db) : ControllerBase
{
    public sealed record CreateZaloPayOrderRequest(Guid StudentId, long AmountVnd, string? Description, Guid? StudentFeeAssignmentId);

    public sealed record QueryZaloPayOrderRequest(string AppTransId);

    public sealed record SyncZaloPayFromQueryRequest(string AppTransId);

    public sealed class ZaloPayIpnDto
    {
        [JsonPropertyName("data")]
        public string Data { get; set; } = "";

        [JsonPropertyName("mac")]
        public string Mac { get; set; } = "";

        [JsonPropertyName("type")]
        public int Type { get; set; }
    }

    /// <summary>Tạo đơn ZaloPay sandbox/production, trả <c>order_url</c> (và có thể <c>qr_code</c>).</summary>
    [HttpPost("create")]
    [Authorize(Policy = AppPolicies.PaymentsZaloPayCreate)]
    public async Task<IActionResult> CreateOrder([FromBody] CreateZaloPayOrderRequest dto, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (User.IsInRole(AppRoles.PhuHuynh))
        {
            var linked = await db.UserStudentLinks.AsNoTracking()
                .AnyAsync(l => l.UserId == userId && l.StudentId == dto.StudentId, ct);
            if (!linked) return Forbid();
        }

        long amountVnd = dto.AmountVnd;
        string? description = dto.Description;
        Guid? assignmentId = dto.StudentFeeAssignmentId;

        if (assignmentId is { } aid)
        {
            var pack = await (
                from a in db.StudentFeeAssignments.AsNoTracking()
                join f in db.FeeStructures.AsNoTracking() on a.FeeStructureId equals f.Id
                join st in db.Students.AsNoTracking() on a.StudentId equals st.Id
                join y in db.SchoolYears.AsNoTracking() on a.SchoolYearId equals y.Id
                where a.Id == aid && !f.IsDeleted && !st.IsDeleted && !y.IsDeleted
                select new
                {
                    a.StudentId,
                    a.Month,
                    StudentName = st.FullName,
                    FeeName = f.Name,
                    Base = f.Amount,
                    a.AmountOverride,
                    YearName = y.Name,
                }).FirstOrDefaultAsync(ct);
            if (pack is null)
                return BadRequest(new { message = "Không tìm thấy khoản phí được gán." });
            if (pack.StudentId != dto.StudentId)
                return BadRequest(new { message = "Học sinh không khớp với khoản phí được gán." });

            if (User.IsInRole(AppRoles.PhuHuynh))
            {
                var okChild = await db.UserStudentLinks.AsNoTracking()
                    .AnyAsync(l => l.UserId == userId && l.StudentId == pack.StudentId, ct);
                if (!okChild) return Forbid();
            }

            var resolvedAmount = pack.AmountOverride ?? pack.Base;
            var paid = await db.Payments.AsNoTracking()
                .Where(p => p.StudentFeeAssignmentId == aid)
                .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;
            var remainingDec = resolvedAmount - paid;
            if (remainingDec <= 0m)
                return BadRequest(new { message = "Khoản phí này đã được thanh toán đủ." });

            // Nếu còn đơn pending, thử đối soát ngay với ZaloPay để tránh kẹt trạng thái
            // khi callback không về localhost/dev.
            var pendingOrder = await db.ZaloPayOrders.AsNoTracking()
                .Where(o => o.StudentFeeAssignmentId == aid && o.Status == ZaloPayOrderStatus.Pending)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync(ct);
            if (pendingOrder is not null)
            {
                var sync = await zaloPay.TrySyncCompletedFromQueryAsync(pendingOrder.AppTransId, ct);
                if (sync.Status is ZaloPaySyncStatus.Pending)
                    return BadRequest(new
                    {
                        message = "Đã có đơn ZaloPay đang chờ cho khoản này. Hoàn tất hoặc hủy đơn cũ trước khi tạo đơn mới.",
                        appTransId = pendingOrder.AppTransId
                    });

                // Sau khi sync thử xong (completed/already_completed/not_pending/failed...),
                // tính lại phần còn nợ để quyết định có tạo đơn mới hay không.
                paid = await db.Payments.AsNoTracking()
                    .Where(p => p.StudentFeeAssignmentId == aid)
                    .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;
                remainingDec = resolvedAmount - paid;
                if (remainingDec <= 0m)
                    return BadRequest(new { message = "Khoản phí này đã được thanh toán đủ." });
            }

            amountVnd = (long)Math.Round(remainingDec, 0, MidpointRounding.AwayFromZero);
            if (amountVnd < 1)
                return BadRequest(new { message = "Số tiền còn lại không hợp lệ." });

            description ??= $"{pack.FeeName} — Tháng {pack.Month}/{pack.YearName} — {pack.StudentName}";
        }

        var result = await zaloPay.CreateOrderAsync(dto.StudentId, amountVnd, description, userId, assignmentId, ct);
        if (!result.Ok)
            return BadRequest(new { message = result.ErrorMessage, appTransId = result.AppTransId, localOrderId = result.LocalOrderId });

        return Ok(new
        {
            orderUrl = result.OrderUrl,
            qrCode = result.QrCode,
            appTransId = result.AppTransId,
            localOrderId = result.LocalOrderId
        });
    }

    /// <summary>Callback server-to-server từ ZaloPay (POST JSON). Không dùng JWT.</summary>
    [HttpPost("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> IpnCallback([FromBody] ZaloPayIpnDto body, CancellationToken ct)
    {
        if (body is null || string.IsNullOrEmpty(body.Data))
            return Ok(new { return_code = 2, return_message = "empty body" });

        var ack = await zaloPay.ProcessCallbackAsync(body.Data, body.Mac, ct);
        return Ok(new { return_code = ack.ReturnCode, return_message = ack.ReturnMessage });
    }

    /// <summary>Tra cứu đơn qua API ZaloPay <c>/v2/query</c> (đối soát khi nghi miss callback).</summary>
    [HttpPost("query")]
    [Authorize(Policy = AppPolicies.PaymentsReadSummary)]
    public async Task<IActionResult> QueryOrder([FromBody] QueryZaloPayOrderRequest dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.AppTransId))
            return BadRequest("AppTransId bắt buộc.");

        var json = await zaloPay.QueryOrderRawJsonAsync(dto.AppTransId.Trim(), ct);
        if (json is null)
            return BadRequest("ZaloPay chưa bật hoặc thiếu AppId/Key1.");

        return Content(json, "application/json");
    }

    /// <summary>
    /// Gọi ZaloPay <c>/v2/query</c> và ghi thanh toán nếu đơn đã thành công (khi callback không tới localhost).
    /// </summary>
    [HttpPost("sync-from-query")]
    [Authorize(Policy = AppPolicies.PaymentsZaloPayCreate)]
    public async Task<IActionResult> SyncFromQuery([FromBody] SyncZaloPayFromQueryRequest dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.AppTransId))
            return BadRequest(new { status = "invalid", message = "AppTransId bắt buộc." });

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var tid = dto.AppTransId.Trim();
        var order = await db.ZaloPayOrders.AsNoTracking()
            .FirstOrDefaultAsync(o => o.AppTransId == tid, ct);
        if (order is null)
            return NotFound(new { status = "not_found", message = "Không tìm thấy đơn." });

        if (User.IsInRole(AppRoles.PhuHuynh))
        {
            var linked = await db.UserStudentLinks.AsNoTracking()
                .AnyAsync(l => l.UserId == userId && l.StudentId == order.StudentId, ct);
            if (!linked) return Forbid();
        }

        var result = await zaloPay.TrySyncCompletedFromQueryAsync(tid, ct);
        return Ok(new { status = SyncStatusApi(result.Status), message = result.Message });
    }

    static string SyncStatusApi(ZaloPaySyncStatus s) => s switch
    {
        ZaloPaySyncStatus.Completed => "completed",
        ZaloPaySyncStatus.AlreadyCompleted => "already_completed",
        ZaloPaySyncStatus.Pending => "pending",
        ZaloPaySyncStatus.NotFound => "not_found",
        ZaloPaySyncStatus.NotPending => "not_pending",
        ZaloPaySyncStatus.AmountMismatch => "amount_mismatch",
        ZaloPaySyncStatus.QueryFailed => "query_failed",
        ZaloPaySyncStatus.Failed => "failed",
        ZaloPaySyncStatus.Disabled => "disabled",
        ZaloPaySyncStatus.Invalid => "invalid",
        _ => "unknown",
    };

    /// <summary>Trang đích sau thanh toán (redirect từ <c>embed_data.redirecturl</c>); chuyển tiếp query string.</summary>
    [HttpGet("return")]
    [AllowAnonymous]
    public IActionResult PaymentReturn()
    {
        var url = zaloOptions.Value.ReturnRedirectUrl;
        if (string.IsNullOrWhiteSpace(url))
            return NotFound("Chưa cấu hình ZaloPay:ReturnRedirectUrl.");

        var baseUrl = url.TrimEnd('/');
        var extra = Request.QueryString.HasValue ? Request.QueryString.Value! : "";
        if (string.IsNullOrEmpty(extra))
            return Redirect(baseUrl);
        var tail = extra.StartsWith("?", StringComparison.Ordinal) ? extra[1..] : extra;
        var join = baseUrl.Contains("?", StringComparison.Ordinal) ? '&' : '?';
        return Redirect($"{baseUrl}{join}{tail}");
    }
}
