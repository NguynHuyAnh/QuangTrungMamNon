using Microsoft.EntityFrameworkCore;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Helpers;

/// <summary>Giải mã mã đăng ký / UUID / tiền tố Id (8–31 hex, duy nhất) → học sinh.</summary>
public static class StudentLinkCodeResolution
{
    public static async Task<Guid?> ResolveAsync(ApplicationDbContext db, string code, CancellationToken ct)
    {
        if (Guid.TryParse(code, out var parsedGuid))
        {
            return await db.Students.AsNoTracking()
                .Where(s => s.Id == parsedGuid && !s.IsDeleted)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefaultAsync(ct);
        }

        var byReg = await db.Students.AsNoTracking()
            .Where(s => !s.IsDeleted && s.RegistrationCode != null && s.RegistrationCode.ToUpper() == code.ToUpper())
            .Select(s => (Guid?)s.Id)
            .FirstOrDefaultAsync(ct);
        if (byReg is not null)
            return byReg;

        var upper = code.ToUpperInvariant();
        if (upper.Length is < 8 or > 31 || !upper.All(static c => c is (>= '0' and <= '9') or (>= 'A' and <= 'F')))
            return null;

        var ids = await db.Students.AsNoTracking().Where(s => !s.IsDeleted).Select(s => s.Id).ToListAsync(ct);
        var matches = ids.Where(id => id.ToString("N").StartsWith(upper, StringComparison.OrdinalIgnoreCase)).ToList();
        return matches.Count == 1 ? matches[0] : null;
    }
}
