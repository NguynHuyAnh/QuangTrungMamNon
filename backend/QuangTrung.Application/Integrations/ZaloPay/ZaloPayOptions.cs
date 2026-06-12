namespace QuangTrung.Application.Integrations.ZaloPay;

public sealed class ZaloPayOptions
{
    public const string SectionName = "ZaloPay";

    /// <summary>Bật/tắt (ví dụ tắt trong môi trường test không gọi sandbox).</summary>
    public bool Enabled { get; set; } = true;

    public string AppId { get; set; } = string.Empty;
    public string Key1 { get; set; } = string.Empty;
    public string Key2 { get; set; } = string.Empty;

    public string CreateEndpoint { get; set; } = "https://sb-openapi.zalopay.vn/v2/create";
    public string QueryEndpoint { get; set; } = "https://sb-openapi.zalopay.vn/v2/query";

    /// <summary>URL gốc HTTPS công khai (vd. ngrok), không có dấu / cuối. Ghép <c>/api/payments/zalopay/callback</c> gửi kèm lúc tạo đơn. Để trống = ZaloPay dùng callback mặc định của app (localhost thường không nhận được) — khi đó dùng API <c>sync-from-query</c> sau khi thanh toán.</summary>
    public string? CallbackBaseUrl { get; set; }

    /// <summary>Giá trị <c>embed_data.redirecturl</c> (SPA sau thanh toán).</summary>
    public string? ReturnRedirectUrl { get; set; }
}
