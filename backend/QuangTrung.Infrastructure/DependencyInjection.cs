using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using QuangTrung.Application.Abstractions;
using QuangTrung.Application.Integrations.ZaloPay;
using QuangTrung.Infrastructure.Identity;
using QuangTrung.Infrastructure.Payments;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration, bool useInMemoryDatabase = false)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<ZaloPayOptions>(configuration.GetSection(ZaloPayOptions.SectionName));
        services.AddHttpClient(ZaloPayGateway.HttpClientName, client =>
        {
            client.Timeout = TimeSpan.FromSeconds(60);
        });
        services.AddScoped<ZaloPayGateway>();

        var inMemoryDatabaseName = $"QT_{Guid.NewGuid():N}";
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            if (useInMemoryDatabase)
                options.UseInMemoryDatabase(inMemoryDatabaseName);
            else
            {
                var conn = configuration.GetConnectionString("DefaultConnection")
                           ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");
                options.UseNpgsql(conn);
            }
        });

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.Password.RequiredLength = 6;
                options.Password.RequireDigit = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = true;
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromDays(365 * 50);
            })
            .AddRoles<ApplicationRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders(); // Provider "Default" cho reset mật khẩu

        services.AddScoped<IJwtTokenService, JwtTokenService>();

        return services;
    }
}
