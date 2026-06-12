using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using QuangTrung.Api.Tests.Support;

namespace QuangTrung.Api.Tests;

public sealed class ParentPortalTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public ParentPortalTests(ApiWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task School_years_ok_empty_when_no_children()
    {
        var client = _factory.CreateClient();
        var email = $"parent_sy_{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync("/api/auth/register-parent", new
        {
            email,
            password = "Demo@123",
            fullName = "PH test sy",
            studentIdToLink = (Guid?)null,
            studentRegistrationCodeToLink = (string?)null,
        });
        Assert.Equal(HttpStatusCode.OK, reg.StatusCode);
        var login = await reg.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOptions);
        Assert.NotNull(login?.accessToken);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login!.accessToken);

        var resp = await client.GetAsync("/api/parent/school-years");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<List<SchoolYearBriefDto>>(JsonOptions);
        Assert.NotNull(body);
        Assert.Empty(body!);
    }

    [Fact]
    public async Task School_years_returns_year_when_child_linked()
    {
        var client = _factory.CreateClient();
        var email = $"parent_cls_{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync("/api/auth/register-parent", new
        {
            email,
            password = "Demo@123",
            fullName = "PH class year",
            studentIdToLink = (Guid?)null,
            studentRegistrationCodeToLink = "QT-2025-001",
        });
        Assert.Equal(HttpStatusCode.OK, reg.StatusCode);
        var login = await reg.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOptions);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login!.accessToken);

        var resp = await client.GetAsync("/api/parent/school-years");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<List<SchoolYearBriefDto>>(JsonOptions);
        Assert.NotNull(body);
        Assert.NotEmpty(body!);
    }

    [Fact]
    public async Task Link_student_after_register_without_code()
    {
        var client = _factory.CreateClient();
        var email = $"parent_lk_{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync("/api/auth/register-parent", new
        {
            email,
            password = "Demo@123",
            fullName = "PH link later",
            studentIdToLink = (Guid?)null,
            studentRegistrationCodeToLink = (string?)null,
        });
        Assert.Equal(HttpStatusCode.OK, reg.StatusCode);
        var login = await reg.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOptions);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login!.accessToken);

        var link = await client.PostAsJsonAsync("/api/parent/link-student", new { code = "QT-2025-001" });
        Assert.Equal(HttpStatusCode.OK, link.StatusCode);

        var kids = await client.GetFromJsonAsync<List<ChildDto>>("/api/students/me/children", JsonOptions);
        Assert.NotNull(kids);
        Assert.NotEmpty(kids!);
    }

    [Fact]
    public async Task PhuHuynh_payments_list_and_summary_ok_when_linked()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "phuhuynh@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token!);
        var resp = await client.GetAsync("/api/payments?page=1&pageSize=10");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var sum = await client.GetAsync("/api/payments/summary");
        Assert.Equal(HttpStatusCode.OK, sum.StatusCode);
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

    private sealed record SchoolYearBriefDto(Guid id, string name, bool isCurrent);

    private sealed record ChildDto(Guid id, string fullName, string dateOfBirth, int status);
}
