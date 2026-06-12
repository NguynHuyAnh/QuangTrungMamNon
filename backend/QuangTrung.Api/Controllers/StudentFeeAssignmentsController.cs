using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Api.Helpers;
using QuangTrung.Application.Common;
using QuangTrung.Application.Constants;
using QuangTrung.Domain.Entities;
using QuangTrung.Infrastructure.Persistence;
using System.Security.Claims;

namespace QuangTrung.Api.Controllers;

[ApiController]
[Route("api/student-fee-assignments")]
public sealed class StudentFeeAssignmentsController(ApplicationDbContext db) : ControllerBase
{
    public sealed record AssignmentRow(
        Guid Id,
        Guid StudentId,
        string StudentFullName,
        Guid SchoolYearId,
        string SchoolYearName,
        Guid FeeStructureId,
        string FeeStructureName,
        int Month,
        decimal? AmountOverride,
        decimal ResolvedAmount,
        decimal PaidAmount,
        decimal RemainingAmount);

    [HttpGet]
    [Authorize(Policy = AppPolicies.FeesReadAssignments)]
    public async Task<ActionResult<PagedResult<AssignmentRow>>> GetList(
        [FromQuery] Guid? studentId,
        [FromQuery] Guid? schoolYearId,
        [FromQuery] int? month,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = from a in db.StudentFeeAssignments.AsNoTracking()
                    join f in db.FeeStructures.AsNoTracking() on a.FeeStructureId equals f.Id
                    join st in db.Students.AsNoTracking() on a.StudentId equals st.Id
                    join y in db.SchoolYears.AsNoTracking() on a.SchoolYearId equals y.Id
                    where !f.IsDeleted && !st.IsDeleted && !y.IsDeleted
                    select new { a, BaseAmount = f.Amount, FeeName = f.Name, StudentName = st.FullName, YearName = y.Name };

        if (User.IsInRole(AppRoles.PhuHuynh))
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var childIds = await db.UserStudentLinks.AsNoTracking()
                .Where(x => x.UserId == userId)
                .Select(x => x.StudentId)
                .ToListAsync(ct);
            query = query.Where(x => childIds.Contains(x.a.StudentId));
            if (studentId is not null && !childIds.Contains(studentId.Value))
                return Forbid();
        }

        if (studentId is not null)
            query = query.Where(x => x.a.StudentId == studentId);
        if (schoolYearId is not null)
            query = query.Where(x => x.a.SchoolYearId == schoolYearId);
        if (month is not null)
            query = query.Where(x => x.a.Month == month);

        var total = await query.CountAsync(ct);
        var raw = await query.OrderBy(x => x.a.StudentId).ThenBy(x => x.a.Month).Skip(skip).Take(ps)
            .Select(x => new
            {
                x.a.Id,
                x.a.StudentId,
                StudentFullName = x.StudentName,
                x.a.SchoolYearId,
                SchoolYearName = x.YearName,
                x.a.FeeStructureId,
                FeeStructureName = x.FeeName,
                x.a.Month,
                x.a.AmountOverride,
                ResolvedAmount = x.a.AmountOverride ?? x.BaseAmount,
            })
            .ToListAsync(ct);

        IReadOnlyDictionary<Guid, decimal> paidByAssignment;
        if (raw.Count == 0)
            paidByAssignment = new Dictionary<Guid, decimal>();
        else
        {
            var ids = raw.Select(r => r.Id).ToList();
            paidByAssignment = await db.Payments.AsNoTracking()
                .Where(p => p.StudentFeeAssignmentId != null && ids.Contains(p.StudentFeeAssignmentId.Value))
                .GroupBy(p => p.StudentFeeAssignmentId!.Value)
                .Select(g => new { Id = g.Key, Total = g.Sum(x => x.Amount) })
                .ToDictionaryAsync(x => x.Id, x => x.Total, ct);
        }

        var items = raw.Select(x =>
        {
            var paid = paidByAssignment.TryGetValue(x.Id, out var s) ? s : 0m;
            var remaining = x.ResolvedAmount - paid;
            if (remaining < 0m) remaining = 0m;
            return new AssignmentRow(
                x.Id,
                x.StudentId,
                x.StudentFullName,
                x.SchoolYearId,
                x.SchoolYearName,
                x.FeeStructureId,
                x.FeeStructureName,
                x.Month,
                x.AmountOverride,
                x.ResolvedAmount,
                paid,
                remaining);
        }).ToList();
        return Ok(new PagedResult<AssignmentRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    public sealed record UpsertAssignmentDto(Guid StudentId, Guid SchoolYearId, Guid FeeStructureId, int Month, decimal? AmountOverride);

    [HttpPost]
    [Authorize(Policy = AppPolicies.FeesWrite)]
    public async Task<IActionResult> Create([FromBody] UpsertAssignmentDto dto, CancellationToken ct)
    {
        var entity = new StudentFeeAssignment
        {
            Id = Guid.NewGuid(),
            StudentId = dto.StudentId,
            SchoolYearId = dto.SchoolYearId,
            FeeStructureId = dto.FeeStructureId,
            Month = dto.Month,
            AmountOverride = dto.AmountOverride,
            CreatedAt = DateTime.UtcNow
        };
        db.StudentFeeAssignments.Add(entity);
        await db.SaveChangesAsync(ct);
        return Ok(new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.FeesWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertAssignmentDto dto, CancellationToken ct)
    {
        var entity = await db.StudentFeeAssignments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null)
            return NotFound();
        entity.StudentId = dto.StudentId;
        entity.SchoolYearId = dto.SchoolYearId;
        entity.FeeStructureId = dto.FeeStructureId;
        entity.Month = dto.Month;
        entity.AmountOverride = dto.AmountOverride;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.FeesWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.StudentFeeAssignments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null)
            return NotFound();
        db.StudentFeeAssignments.Remove(entity);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
