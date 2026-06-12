using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuangTrung.Api.Tests.Support;
using QuangTrung.Application.Integrations.ZaloPay;
using QuangTrung.Domain.Entities;
using QuangTrung.Domain.Enums;
using QuangTrung.Infrastructure.Identity;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Tests;

public sealed class ZaloPayCallbackTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;
    public ZaloPayCallbackTests(ApiWebApplicationFactory factory) => _factory = factory;

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
    public async Task Callback_valid_mac_creates_zalopay_payment()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var student = await db.Students.AsNoTracking().FirstAsync();
        var ketoan = await users.FindByEmailAsync("ketoan@demo.local");
        Assert.NotNull(ketoan);

        var appTransId = "250501_" + Guid.NewGuid().ToString("N")[..12];
        db.ZaloPayOrders.Add(new ZaloPayOrder
        {
            Id = Guid.NewGuid(),
            AppTransId = appTransId,
            StudentId = student.Id,
            AmountVnd = 50_000,
            Description = "Test ZaloPay",
            Status = ZaloPayOrderStatus.Pending,
            RecordedByUserId = ketoan.Id,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        const string key2 = "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf";
        var dataRaw = $$"""{"app_trans_id":"{{appTransId}}","amount":50000,"zp_trans_id":"zp_test_1"}""";
        var mac = ZaloPayMac.BuildCallbackMac(key2, dataRaw);

        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/payments/zalopay/callback", new { data = dataRaw, mac, type = 1 });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var paid = await db2.Payments.AsNoTracking()
            .AnyAsync(p => p.StudentId == student.Id && p.Method == PaymentMethod.ZaloPay && p.Amount == 50_000);
        Assert.True(paid);

        var order = await db2.ZaloPayOrders.AsNoTracking().SingleAsync(o => o.AppTransId == appTransId);
        Assert.Equal(ZaloPayOrderStatus.Completed, order.Status);
        Assert.NotNull(order.PaymentId);
    }

    [Fact]
    public async Task Callback_invalid_mac_returns_return_code_2()
    {
        var client = _factory.CreateClient();
        var dataRaw = """{"app_trans_id":"x","amount":1,"zp_trans_id":"z"}""";
        var resp = await client.PostAsJsonAsync("/api/payments/zalopay/callback", new { data = dataRaw, mac = "deadbeef", type = 1 });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        using var doc = System.Text.Json.JsonDocument.Parse(body);
        Assert.Equal(2, doc.RootElement.GetProperty("return_code").GetInt32());
    }

    [Fact]
    public async Task SyncFromQuery_unknown_order_returns_404()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, "ketoan@demo.local", "Demo@123");
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await client.PostAsJsonAsync("/api/payments/zalopay/sync-from-query", new { appTransId = "250501_notexist000" });
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}
