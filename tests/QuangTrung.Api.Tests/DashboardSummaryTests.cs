using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using QuangTrung.Api.Tests.Support;

namespace QuangTrung.Api.Tests;

public sealed class DashboardSummaryTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public DashboardSummaryTests(ApiWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Staff_summary_ok_for_superadmin()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "superadmin@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await client.GetAsync("/api/dashboard/staff-summary");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<StaffSummaryDto>(JsonOptions);
        Assert.NotNull(body);
        Assert.True(body!.StudentCount >= 1);
        Assert.Equal(6, body.NewStudentsLast6MonthsUtc.Count);
        Assert.NotEmpty(body.StudentAgeSlices);
    }

    [Fact]
    public async Task Staff_summary_forbidden_for_parent()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "phuhuynh@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await client.GetAsync("/api/dashboard/staff-summary");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
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

    private sealed record StaffSummaryDto(
        int StudentCount,
        int ClassCount,
        int PublishedAnnouncementsCount,
        decimal? PaymentsTotalThisMonthUtc,
        List<int> NewStudentsLast6MonthsUtc,
        List<AgeSliceDto> StudentAgeSlices);

    private sealed record AgeSliceDto(string Label, int Count);
}
