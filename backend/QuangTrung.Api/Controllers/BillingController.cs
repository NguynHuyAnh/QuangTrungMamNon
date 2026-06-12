using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Controllers;

[ApiController]
[Route("api/billing")]
public sealed class BillingController(ApplicationDbContext db) : ControllerBase
{
    public sealed record StudentBalanceDto(decimal ExpectedAmount, decimal PaidAmount, decimal Balance);

    [HttpGet("students/{studentId:guid}/balance")]
    [Authorize(Policy = AppPolicies.FeesRead)]
    public async Task<ActionResult<StudentBalanceDto>> GetStudentBalance(
        Guid studentId,
        [FromQuery] Guid schoolYearId,
        [FromQuery] int month,
        CancellationToken ct = default)
    {
        var expected = await (
            from a in db.StudentFeeAssignments.AsNoTracking()
            join f in db.FeeStructures.AsNoTracking() on a.FeeStructureId equals f.Id
            where a.StudentId == studentId && a.SchoolYearId == schoolYearId && a.Month == month && !f.IsDeleted
            select a.AmountOverride ?? f.Amount
        ).SumAsync(ct);

        var year = await db.SchoolYears.AsNoTracking()
            .Where(s => s.Id == schoolYearId && !s.IsDeleted)
            .Select(s => s.StartDate.Year)
            .FirstOrDefaultAsync(ct);
        if (year == 0)
            return NotFound("Năm học không tồn tại.");

        var paid = await db.Payments.AsNoTracking()
            .Where(p => p.StudentId == studentId && p.PaidAt.Year == year && p.PaidAt.Month == month)
            .SumAsync(p => p.Amount, ct);

        return Ok(new StudentBalanceDto(expected, paid, expected - paid));
    }
}
