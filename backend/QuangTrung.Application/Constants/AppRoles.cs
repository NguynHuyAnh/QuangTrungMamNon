namespace QuangTrung.Application.Constants;

public static class AppRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string BanGiamHieu = "BanGiamHieu";
    public const string GiaoVien = "GiaoVien";
    public const string KeToan = "KeToan";
    public const string PhuHuynh = "PhuHuynh";

    public static readonly IReadOnlyList<string> All = new[]
    {
        SuperAdmin, BanGiamHieu, GiaoVien, KeToan, PhuHuynh
    };
}
