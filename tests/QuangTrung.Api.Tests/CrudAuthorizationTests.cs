using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using QuangTrung.Api.Tests.Support;

namespace QuangTrung.Api.Tests;

public sealed class CrudAuthorizationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public CrudAuthorizationTests(ApiWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task SchoolYears_POST_403_for_teacher()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "giaovien@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await client.PostAsJsonAsync("/api/school-years", new
        {
            name = "2026-2027",
            startDate = new DateOnly(2026, 9, 1),
            endDate = new DateOnly(2027, 6, 30),
            isCurrent = false
        });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task SchoolYears_POST_201_for_bgh()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "bangiamhieu@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await client.PostAsJsonAsync("/api/school-years", new
        {
            name = $"Nam-hoc-{Guid.NewGuid():N}",
            startDate = new DateOnly(2026, 9, 1),
            endDate = new DateOnly(2027, 6, 30),
            isCurrent = false
        });
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
    }

    [Fact]
    public async Task FeeStructures_POST_403_for_bgh()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "bangiamhieu@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var yearId = await GetFirstSchoolYearId(client);
        Assert.NotNull(yearId);
        var resp = await client.PostAsJsonAsync("/api/fee-structures", new
        {
            schoolYearId = yearId,
            name = "Phí test",
            amount = 100_000,
            feeType = 2
        });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task FeeStructures_POST_200_for_ketoan()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "ketoan@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var yearId = await GetFirstSchoolYearId(client);
        Assert.NotNull(yearId);
        var resp = await client.PostAsJsonAsync("/api/fee-structures", new
        {
            schoolYearId = yearId,
            name = $"Phí test {Guid.NewGuid():N}",
            amount = 100_000,
            feeType = 2
        });
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
    }

    private static async Task<string?> LoginAsync(HttpClient client, string email, string password)
    {
        var resp = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        if (resp.StatusCode != HttpStatusCode.OK)
            return null;
        var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOptions);
        return body?.accessToken;
    }

    private static async Task<Guid?> GetFirstSchoolYearId(HttpClient client)
    {
        var resp = await client.GetAsync("/api/school-years?pageSize=1");
        if (!resp.IsSuccessStatusCode)
            return null;
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("items", out var items) || items.GetArrayLength() == 0)
            return null;
        return items[0].GetProperty("id").GetGuid();
    }

    private sealed record LoginResponseDto(string accessToken, DateTime expiresAtUtc, string email, List<string> roles);
}
