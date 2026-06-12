using System.Security.Cryptography;
using System.Text;

namespace QuangTrung.Application.Integrations.ZaloPay;

/// <summary>HMAC-SHA256 hex (chữ thường) theo tài liệu ZaloPay v2.</summary>
public static class ZaloPayMac
{
    public static string BuildCreateOrderMac(string key1, string appId, string appTransId, string appUser,
        string amountStr, string appTimeStr, string embedDataJson, string itemJson)
    {
        var data = $"{appId}|{appTransId}|{appUser}|{amountStr}|{appTimeStr}|{embedDataJson}|{itemJson}";
        return HmacSha256HexLower(key1, data);
    }

    /// <summary>MAC truy vấn đơn: <c>app_id|app_trans_id|key1</c> rồi HMAC-SHA256 với secret = key1.</summary>
    public static string BuildQueryMac(string key1, string appId, string appTransId)
    {
        var macInput = $"{appId}|{appTransId}|{key1}";
        return HmacSha256HexLower(key1, macInput);
    }

    public static string BuildCallbackMac(string key2, string dataFieldRaw) =>
        HmacSha256HexLower(key2, dataFieldRaw);

    public static bool CallbackMacValid(string key2, string dataFieldRaw, string macReceived)
    {
        if (string.IsNullOrEmpty(macReceived) || string.IsNullOrEmpty(dataFieldRaw))
            return false;
        macReceived = macReceived.Trim();
        var computed = HmacSha256HexLower(key2, dataFieldRaw);
        return FixedTimeEqualsHex(computed, macReceived);
    }

    static string HmacSha256HexLower(string key, string data)
    {
        using var h = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hash = h.ComputeHash(Encoding.UTF8.GetBytes(data));
        var sb = new StringBuilder(hash.Length * 2);
        foreach (var b in hash)
            sb.Append(b.ToString("x2"));
        return sb.ToString();
    }

    static bool FixedTimeEqualsHex(string computedLower, string received)
    {
        received = received.Trim().ToLowerInvariant();
        if (computedLower.Length != received.Length || received.Length % 2 != 0)
            return false;
        try
        {
            var a = Convert.FromHexString(computedLower);
            var b = Convert.FromHexString(received);
            return CryptographicOperations.FixedTimeEquals(a, b);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
