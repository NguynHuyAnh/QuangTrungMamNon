using Microsoft.AspNetCore.Identity;

namespace QuangTrung.Infrastructure.Identity;

public class ApplicationUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;
}

public class ApplicationRole : IdentityRole<Guid>
{
}
