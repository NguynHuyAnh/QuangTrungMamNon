using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuangTrung.Api.Tests.Support;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Tests;

public sealed class AuthRegisterTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public AuthRegisterTests(ApiWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Register_parent_then_login_ok()
    {
        var client = _factory.CreateClient();
        var email = $"parent_{Guid.NewGuid():N}@test.local";
        var resp = await client.PostAsJsonAsync("/api/auth/register-parent", new
        {
            email,
            password = "Demo@123",
            fullName = "Phụ huynh test",
            studentIdToLink = (Guid?)null
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOptions);
        Assert.NotNull(body?.accessToken);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body!.accessToken);
        var me = await client.GetAsync("/api/students/me/children");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
    }

    [Fact]
    public async Task Register_parent_with_registration_code_links_student()
    {
        var client = _factory.CreateClient();
        var email = $"parent_code_{Guid.NewGuid():N}@test.local";
        var resp = await client.PostAsJsonAsync("/api/auth/register-parent", new
        {
            email,
            password = "Demo@123",
            fullName = "Phụ huynh có mã",
            studentIdToLink = (Guid?)null,
            studentRegistrationCodeToLink = "QT-2025-001"
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOptions);
        Assert.NotNull(body?.accessToken);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body!.accessToken);
        var me = await client.GetFromJsonAsync<List<ChildDto>>("/api/students/me/children", JsonOptions);
        Assert.NotNull(me);
        Assert.NotEmpty(me);
        Assert.Contains(me!, c => c.fullName.Contains("Nguyễn", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Register_parent_with_unique_eight_char_hex_prefix_links_student()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var be = await db.Students.AsNoTracking().FirstAsync(s => s.FullName == "Nguyễn Văn Bé" && !s.IsDeleted);
        var prefix = be.Id.ToString("N")[..8];

        var client = _factory.CreateClient();
        var email = $"parent_prefix_{Guid.NewGuid():N}@test.local";
        var resp = await client.PostAsJsonAsync("/api/auth/register-parent", new
        {
            email,
            password = "Demo@123",
            fullName = "PH tiền tố ID",
            studentIdToLink = (Guid?)null,
            studentRegistrationCodeToLink = prefix,
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOptions);
        Assert.NotNull(body?.accessToken);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body!.accessToken);
        var me = await client.GetFromJsonAsync<List<ChildDto>>("/api/students/me/children", JsonOptions);
        Assert.NotNull(me);
        Assert.Contains(me!, c => c.id == be.Id);
    }

    [Fact]
    public async Task Register_staff_forbidden_for_teacher()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "giaovien@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await client.PostAsJsonAsync("/api/auth/register-staff", new
        {
            email = $"nv_{Guid.NewGuid():N}@test.local",
            password = "Demo@123",
            fullName = "Nhân viên",
            role = "KeToan"
        });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Register_staff_ok_for_bangiamhieu()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "bangiamhieu@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var email = $"ketoan2_{Guid.NewGuid():N}@test.local";
        var resp = await client.PostAsJsonAsync("/api/auth/register-staff", new
        {
            email,
            password = "Demo@123",
            fullName = "Kế toán 2",
            role = "KeToan"
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Register_staff_bangiamhieu_rejects_bangiamhieu_role()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "bangiamhieu@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await client.PostAsJsonAsync("/api/auth/register-staff", new
        {
            email = $"bgh_{Guid.NewGuid():N}@test.local",
            password = "Demo@123",
            fullName = "BGH không hợp lệ",
            role = "BanGiamHieu"
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Register_staff_superadmin_can_create_bangiamhieu()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "superadmin@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var email = $"bgh_new_{Guid.NewGuid():N}@test.local";
        var resp = await client.PostAsJsonAsync("/api/auth/register-staff", new
        {
            email,
            password = "Demo@123",
            fullName = "Ban giám hiệu mới",
            role = "BanGiamHieu"
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Forgot_password_returns_ok_without_leaking_enumeration()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/forgot-password", new { email = $"ghost_{Guid.NewGuid():N}@test.local" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<ForgotPasswordResponseDto>(JsonOptions);
        Assert.NotNull(body?.message);
        Assert.True(body!.message.Length > 10);
    }

    [Fact]
    public async Task Reset_password_fails_with_bad_token()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            email = "superadmin@demo.local",
            token = "invalid-token",
            newPassword = "Demo@456"
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    private static async Task<string?> LoginAsync(HttpClient client, string email, string password)
    {
        var resp = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        if (resp.StatusCode != HttpStatusCode.OK)
            return null;
        var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOptions);
        return body?.accessToken;
    }

    private sealed record LoginResponseDto(string accessToken, DateTime expiresAtUtc, string email, List<string> roles);

    private sealed record ForgotPasswordResponseDto(string message, string? resetToken);

    private sealed record ChildDto(Guid id, string fullName, DateOnly dateOfBirth, int status);
}
