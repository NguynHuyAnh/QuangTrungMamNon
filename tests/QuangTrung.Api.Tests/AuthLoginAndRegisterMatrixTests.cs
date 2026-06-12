using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using QuangTrung.Api.Tests.Support;

namespace QuangTrung.Api.Tests;

/// <summary>Đăng nhập từng tài khoản seed + đăng ký phụ huynh (happy/negative).</summary>
public sealed class AuthLoginAndRegisterMatrixTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public AuthLoginAndRegisterMatrixTests(ApiWebApplicationFactory factory) => _factory = factory;

    [Theory]
    [InlineData("superadmin@demo.local", "SuperAdmin")]
    [InlineData("bangiamhieu@demo.local", "BanGiamHieu")]
    [InlineData("giaovien@demo.local", "GiaoVien")]
    [InlineData("ketoan@demo.local", "KeToan")]
    [InlineData("phuhuynh@demo.local", "PhuHuynh")]
    public async Task Login_demo_seed_returns_200_token_and_role(string email, string expectedRole)
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/login", new { email, password = "Demo@123" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOptions);
        Assert.False(string.IsNullOrWhiteSpace(body?.accessToken));
        Assert.Equal(email, body!.email);
        Assert.Contains(expectedRole, body.roles);
    }

    [Fact]
    public async Task Login_wrong_password_returns_401()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "superadmin@demo.local",
            password = "WrongPassword!1",
        });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Login_unknown_email_returns_401()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = $"noone_{Guid.NewGuid():N}@test.local",
            password = "Demo@123",
        });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Register_parent_duplicate_email_returns_409()
    {
        var client = _factory.CreateClient();
        const string email = "phuhuynh@demo.local";
        var resp = await client.PostAsJsonAsync("/api/auth/register-parent", new
        {
            email,
            password = "Demo@123",
            fullName = "Trùng email",
            studentIdToLink = (Guid?)null,
        });
        Assert.Equal(HttpStatusCode.Conflict, resp.StatusCode);
    }

    [Fact]
    public async Task Register_parent_weak_password_returns_400()
    {
        var client = _factory.CreateClient();
        var email = $"weak_{Guid.NewGuid():N}@test.local";
        var resp = await client.PostAsJsonAsync("/api/auth/register-parent", new
        {
            email,
            password = "abc",
            fullName = "Yếu mật khẩu",
            studentIdToLink = (Guid?)null,
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task After_superadmin_login_catalog_read_succeeds()
    {
        var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = "superadmin@demo.local", password = "Demo@123" });
        var body = await login.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOptions);
        Assert.NotNull(body?.accessToken);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body!.accessToken);
        var years = await client.GetAsync("/api/school-years");
        Assert.Equal(HttpStatusCode.OK, years.StatusCode);
    }

    private sealed record LoginResponseDto(string accessToken, DateTime expiresAtUtc, string email, List<string> roles);
}
