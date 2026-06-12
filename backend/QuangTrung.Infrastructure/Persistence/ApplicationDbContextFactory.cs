using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace QuangTrung.Infrastructure.Persistence;

public sealed class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        // Trùng với appsettings.json; có thể ghi đè: $env:ConnectionStrings__DefaultConnection="..."
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=quangtrung_mn;Username=postgres;Password=123456";

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString);
        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
