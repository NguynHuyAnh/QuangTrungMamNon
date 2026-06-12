using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using QuangTrung.Api.Tests.Support;

namespace QuangTrung.Api.Tests;

public sealed class PagingAndFilterTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public PagingAndFilterTests(ApiWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Students_filter_q_reduces_total_count()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "bangiamhieu@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var all = await client.GetAsync("/api/students?pageSize=50");
        Assert.True(all.IsSuccessStatusCode);
        var allJson = await all.Content.ReadAsStringAsync();
        using var allDoc = JsonDocument.Parse(allJson);
        var totalAll = allDoc.RootElement.GetProperty("totalCount").GetInt32();

        var filtered = await client.GetAsync("/api/students?q=Tìm+Kiếm&pageSize=50");
        Assert.True(filtered.IsSuccessStatusCode);
        var fJson = await filtered.Content.ReadAsStringAsync();
        using var fDoc = JsonDocument.Parse(fJson);
        var totalFiltered = fDoc.RootElement.GetProperty("totalCount").GetInt32();

        Assert.True(totalFiltered >= 1);
        Assert.True(totalFiltered < totalAll);
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
}
