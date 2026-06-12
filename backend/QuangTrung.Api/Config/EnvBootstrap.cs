using DotNetEnv;

namespace QuangTrung.Api.Config;

/// <summary>
/// Nạp file .env trước khi <see cref="WebApplication.CreateBuilder"/> —
/// biến môi trường ghi đè <c>appsettings.json</c> theo chuẩn ASP.NET Core (ví dụ <c>Jwt__Key</c>).
/// Thứ tự ưu tiên: thư mục chạy lệnh hiện tại, rồi thư mục project Api, rồi lên tới 6 cấp (tìm .env ở root repo).
/// </summary>
public static class EnvBootstrap
{
    public static void Load()
    {
        var path = ResolveEnvFilePath();
        if (path is null)
            return;

        // Mặc định: không ghi đè biến môi trường đã tồn tại (CI, User Secrets, máy chủ).
        Env.Load(path);
    }

    private static string? ResolveEnvFilePath()
    {
        foreach (var start in StartingDirectories())
        {
            var dir = start;
            for (var depth = 0; depth < 8 && !string.IsNullOrEmpty(dir); depth++)
            {
                var candidate = Path.Combine(dir, ".env");
                if (File.Exists(candidate))
                    return Path.GetFullPath(candidate);
                dir = Directory.GetParent(dir)?.FullName ?? "";
            }
        }

        return null;
    }

    private static IEnumerable<string> StartingDirectories()
    {
        var cwd = Directory.GetCurrentDirectory();
        if (!string.IsNullOrEmpty(cwd))
            yield return cwd;

        // dotnet run: BaseDirectory = .../bin/Debug/net10.0
        var apiProject = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", ".."));
        if (Directory.Exists(apiProject))
            yield return apiProject;

        if (!string.IsNullOrEmpty(AppContext.BaseDirectory))
            yield return AppContext.BaseDirectory;
    }
}
