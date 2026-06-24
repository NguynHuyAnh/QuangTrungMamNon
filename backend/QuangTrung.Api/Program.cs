using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using QuangTrung.Api.Authorization;
using QuangTrung.Api.Config;
using QuangTrung.Application.Constants;
using QuangTrung.Infrastructure;
using QuangTrung.Infrastructure.Identity;

EnvBootstrap.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("spa", policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var useInMemoryDatabase = builder.Configuration.GetValue("UseInMemoryDatabase", false)
                        || builder.Environment.IsEnvironment("Testing");
builder.Services.AddInfrastructure(builder.Configuration, useInMemoryDatabase);

var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
                 ?? throw new InvalidOperationException("Jwt configuration section is missing.");
var jwtKeyBytes = Encoding.UTF8.GetBytes(jwtSection.Key);
if (jwtKeyBytes.Length < 32)
{
    throw new InvalidOperationException(
        $"Jwt:Key phải dài tối thiểu 32 byte UTF-8 (hiện {jwtKeyBytes.Length}). Đặt Jwt__Key trong .env (hoặc appsettings / User Secrets).");
}

var signingKey = new SymmetricSecurityKey(jwtKeyBytes);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection.Issuer,
            ValidAudience = jwtSection.Audience,
            IssuerSigningKey = signingKey,
            ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.NameIdentifier
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AppPolicies.AuthenticatedOnly, p => p.RequireAuthenticatedUser());

    options.AddPolicy(AppPolicies.CatalogRead,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.GiaoVien, AppRoles.KeToan, AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.CatalogWrite,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.SuperAdmin));

    options.AddPolicy(AppPolicies.ClassesRead,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.GiaoVien, AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.ClassesWrite,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.SuperAdmin));

    options.AddPolicy(AppPolicies.StudentsReadInternal,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.GiaoVien, AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.StudentsWrite,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.StudentsReadOwnChildren,
        p => p.RequireRole(AppRoles.PhuHuynh));
    options.AddPolicy(AppPolicies.StudentsBillingRead,
        p => p.RequireRole(AppRoles.KeToan, AppRoles.BanGiamHieu, AppRoles.SuperAdmin));

    options.AddPolicy(AppPolicies.AttendanceRead,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.GiaoVien, AppRoles.SuperAdmin, AppRoles.PhuHuynh));
    options.AddPolicy(AppPolicies.AttendanceWrite,
        p => p.RequireRole(AppRoles.GiaoVien, AppRoles.BanGiamHieu, AppRoles.SuperAdmin));

    options.AddPolicy(AppPolicies.AnnouncementsRead, p => p.RequireAuthenticatedUser());
    options.AddPolicy(AppPolicies.AnnouncementsPublishSchool,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.AnnouncementsClassDraft,
        p => p.RequireRole(AppRoles.GiaoVien, AppRoles.BanGiamHieu, AppRoles.SuperAdmin));

    options.AddPolicy(AppPolicies.DishesRead,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.GiaoVien, AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.DishesWrite,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.SuperAdmin));

    options.AddPolicy(AppPolicies.MenuRead, p => p.RequireAuthenticatedUser());
    options.AddPolicy(AppPolicies.MenuWrite,
        p => p.RequireRole(AppRoles.GiaoVien, AppRoles.BanGiamHieu, AppRoles.SuperAdmin));

    options.AddPolicy(AppPolicies.FeesRead,
        p => p.RequireRole(AppRoles.KeToan, AppRoles.BanGiamHieu, AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.FeesWrite,
        p => p.RequireRole(AppRoles.KeToan, AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.FeesReadAssignments,
        p => p.RequireRole(AppRoles.KeToan, AppRoles.BanGiamHieu, AppRoles.SuperAdmin, AppRoles.PhuHuynh));

    options.AddPolicy(AppPolicies.PaymentsReadSummary,
        p => p.RequireRole(AppRoles.KeToan, AppRoles.BanGiamHieu, AppRoles.SuperAdmin, AppRoles.PhuHuynh));
    options.AddPolicy(AppPolicies.PaymentsWrite,
        p => p.RequireRole(AppRoles.KeToan, AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.PaymentsZaloPayCreate,
        p => p.RequireRole(AppRoles.KeToan, AppRoles.SuperAdmin, AppRoles.PhuHuynh));

    options.AddPolicy(AppPolicies.UsersReadDirectory,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.UsersCreateStaff,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.UsersManage,
        p => p.RequireRole(AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.ParentLinksManage,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.SuperAdmin));

    options.AddPolicy(AppPolicies.DashboardRead,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.GiaoVien, AppRoles.KeToan, AppRoles.SuperAdmin));
    options.AddPolicy(AppPolicies.DashboardExport,
        p => p.RequireRole(AppRoles.BanGiamHieu, AppRoles.SuperAdmin));
});

var app = builder.Build();

// Luôn trả JSON cho lỗi không bắt trên /api (Vite proxy + fetch dễ gặp body rỗng nếu chỉ có HTML lỗi).
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        if (context.Response.HasStarted)
            throw;
        if (!context.Request.Path.StartsWithSegments("/api"))
            throw;
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json; charset=utf-8";
        var detail = app.Environment.IsDevelopment() ? ex.ToString() : ex.Message;
        await context.Response.WriteAsJsonAsync(new { title = "Lỗi máy chủ", detail });
    }
});

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

// Tránh redirect HTTP→HTTPS khi FE (Vite) gọi API qua http://localhost — dễ gây lỗi proxy / mất body.
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors("spa");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

var useInMemoryAtRuntime = app.Configuration.GetValue("UseInMemoryDatabase", false)
                           || app.Environment.IsEnvironment("Testing");
var applyMigrations = !app.Environment.IsEnvironment("Testing") && !useInMemoryAtRuntime;
await DataSeeder.SeedAsync(app.Services, applyMigrations);

app.Run();

public partial class Program { }

