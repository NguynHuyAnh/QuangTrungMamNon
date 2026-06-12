using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using QuangTrung.Api.Tests.Support;

namespace QuangTrung.Api.Tests;

public sealed class AuthAndAuthorizationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public AuthAndAuthorizationTests(ApiWebApplicationFactory factory) => _factory = factory;

    private static async Task<string?> LoginAsync(HttpClient client, string email, string password)
    {
        var resp = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        if (resp.StatusCode != HttpStatusCode.OK)
            return null;
        var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>();
        return body?.accessToken;
    }

    private sealed record LoginResponseDto(string accessToken, DateTime expiresAtUtc, string email, List<string> roles);

    [Fact]
    public async Task Login_returns_token_for_demo_teacher()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "giaovien@demo.local", "Demo@123");
        Assert.NotNull(token);
    }

    [Fact]
    public async Task Classes_GET_returns_401_without_token()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/classes");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Classes_GET_returns_403_for_ketoan()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "ketoan@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await client.GetAsync("/api/classes");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Classes_GET_returns_200_for_bangiamhieu()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "bangiamhieu@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await client.GetAsync("/api/classes");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Students_GET_returns_403_for_ketoan()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "ketoan@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await client.GetAsync("/api/students");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Students_billing_view_returns_200_for_ketoan()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "ketoan@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await client.GetAsync("/api/students/billing-view");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Attendance_POST_returns_403_for_phuhuynh()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "phuhuynh@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var payload = new
        {
            studentId = Guid.NewGuid(),
            classId = Guid.NewGuid(),
            date = new DateOnly(2025, 9, 2),
            status = 0,
            reason = (string?)null
        };
        var resp = await client.PostAsJsonAsync("/api/attendance/records", payload);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Payments_POST_returns_403_for_bangiamhieu()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "bangiamhieu@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var payload = new { studentId = Guid.NewGuid(), amount = 100_000m, method = 0, receiptNumber = "R1", note = (string?)null };
        var resp = await client.PostAsJsonAsync("/api/payments", payload);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}
