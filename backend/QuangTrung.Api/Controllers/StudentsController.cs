using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Api.Helpers;
using QuangTrung.Application.Common;
using QuangTrung.Application.Constants;
using QuangTrung.Domain.Entities;
using QuangTrung.Domain.Enums;
using QuangTrung.Infrastructure.Persistence;
using System.Security.Claims;

namespace QuangTrung.Api.Controllers;

[ApiController]
[Route("api/students")]
public sealed class StudentsController(ApplicationDbContext db) : ControllerBase
{
    public sealed record StudentRow(Guid Id, string FullName, DateOnly DateOfBirth, StudentStatus Status);

    public sealed record StudentListRow(
        Guid Id,
        string FullName,
        DateOnly DateOfBirth,
        StudentStatus Status,
        string? RegistrationCode,
        Guid? CurrentClassId,
        string? CurrentClassName,
        Guid? CurrentGradeId);

    public sealed record StudentStatsDto(int Total, int DangHoc, int TamNghi, int NghiHoc);

    private IQueryable<Student> StudentsFilteredQuery(Guid userId, string? q, StudentStatus? status, Guid? classId, Guid? schoolYearId)
    {
        var query = db.Students.AsNoTracking().Where(s => !s.IsDeleted);

        if (User.IsInRole(AppRoles.GiaoVien))
        {
            query = query.Where(s => db.StudentClassAssignments.Any(a =>
                a.StudentId == s.Id
                && a.ToDate == null
                && db.Classes.Any(c => c.Id == a.ClassId && !c.IsDeleted && c.HomeroomTeacherId == userId)));
        }

        if (status is not null)
            query = query.Where(s => s.Status == status);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(s => s.FullName.Contains(q.Trim()));

        if (classId is not null)
        {
            query = query.Where(s => db.StudentClassAssignments.Any(a =>
                a.StudentId == s.Id
                && a.ToDate == null
                && a.ClassId == classId
                && (schoolYearId == null || a.SchoolYearId == schoolYearId)));
        }
        else if (schoolYearId is not null)
        {
            // Có phân công trong năm này, hoặc chưa gán lớp (mới tạo — chưa có bản ghi ToDate == null)
            query = query.Where(s =>
                !db.StudentClassAssignments.Any(a => a.StudentId == s.Id && a.ToDate == null)
                || db.StudentClassAssignments.Any(a =>
                    a.StudentId == s.Id && a.ToDate == null && a.SchoolYearId == schoolYearId));
        }

        return query;
    }

    [HttpGet("stats")]
    [Authorize(Policy = AppPolicies.StudentsReadInternal)]
    public async Task<ActionResult<StudentStatsDto>> GetStats(
        [FromQuery] string? q,
        [FromQuery] StudentStatus? status,
        [FromQuery] Guid? classId,
        [FromQuery] Guid? schoolYearId,
        CancellationToken ct = default)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var query = StudentsFilteredQuery(userId, q, status, classId, schoolYearId);
        var total = await query.CountAsync(ct);
        var dangHoc = await query.CountAsync(s => s.Status == StudentStatus.DangHoc, ct);
        var tamNghi = await query.CountAsync(s => s.Status == StudentStatus.TamNghi, ct);
        var nghiHoc = await query.CountAsync(s => s.Status == StudentStatus.DaNghiHoc, ct);
        return Ok(new StudentStatsDto(total, dangHoc, tamNghi, nghiHoc));
    }

    [HttpGet]
    [Authorize(Policy = AppPolicies.StudentsReadInternal)]
    public async Task<ActionResult<PagedResult<StudentListRow>>> GetList(
        [FromQuery] string? q,
        [FromQuery] StudentStatus? status,
        [FromQuery] Guid? classId,
        [FromQuery] Guid? schoolYearId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = StudentsFilteredQuery(userId, q, status, classId, schoolYearId);

        var total = await query.CountAsync(ct);
        var pageIds = await query.OrderBy(s => s.FullName).Skip(skip).Take(ps).Select(s => s.Id).ToListAsync(ct);
        if (pageIds.Count == 0)
            return Ok(new PagedResult<StudentListRow> { Items = [], TotalCount = total, Page = p, PageSize = ps });

        var studentData = await db.Students.AsNoTracking()
            .Where(s => pageIds.Contains(s.Id))
            .Select(s => new { s.Id, s.FullName, s.DateOfBirth, s.Status, s.RegistrationCode })
            .ToListAsync(ct);
        var byId = studentData.ToDictionary(x => x.Id);

        var assigns = await db.StudentClassAssignments.AsNoTracking()
            .Where(a => pageIds.Contains(a.StudentId) && a.ToDate == null)
            .Join(db.Classes.Where(c => !c.IsDeleted), a => a.ClassId, c => c.Id, (a, c) => new { a.StudentId, c.Id, c.Name, c.GradeId })
            .ToListAsync(ct);
        var classByStudent = assigns
            .GroupBy(x => x.StudentId)
            .ToDictionary(g => g.Key, g => g.First());

        var items = pageIds.Select(id =>
        {
            var s = byId[id];
            classByStudent.TryGetValue(id, out var cls);
            return new StudentListRow(s.Id, s.FullName, s.DateOfBirth, s.Status, s.RegistrationCode, cls?.Id, cls?.Name, cls?.GradeId);
        }).ToList();

        return Ok(new PagedResult<StudentListRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    [HttpGet("me/children")]
    [Authorize(Policy = AppPolicies.StudentsReadOwnChildren)]
    public async Task<IActionResult> GetMyChildren(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var ids = await db.UserStudentLinks.AsNoTracking().Where(x => x.UserId == userId).Select(x => x.StudentId).ToListAsync(ct);
        var rows = await db.Students.AsNoTracking()
            .Where(s => ids.Contains(s.Id) && !s.IsDeleted)
            .Select(s => new { s.Id, s.FullName, s.DateOfBirth, s.Status })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AppPolicies.StudentsReadInternal)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var q = db.Students.AsNoTracking().Where(s => s.Id == id && !s.IsDeleted);
        if (User.IsInRole(AppRoles.GiaoVien))
        {
            q = q.Where(s => db.StudentClassAssignments.Any(a =>
                a.StudentId == s.Id && a.ToDate == null &&
                db.Classes.Any(c => c.Id == a.ClassId && !c.IsDeleted && c.HomeroomTeacherId == userId)));
        }
        var row = await q.Select(s => new
        {
            s.Id,
            s.FullName,
            s.Gender,
            s.DateOfBirth,
            s.Status,
            s.RegistrationCode,
            s.Address,
            s.HealthNote,
            s.AllergyNote
        }).FirstOrDefaultAsync(ct);
        return row is null ? NotFound() : Ok(row);
    }

    public sealed record StudentBillingViewRow(
        Guid Id,
        string FullName,
        DateOnly DateOfBirth,
        StudentStatus Status,
        string? RegistrationCode,
        string? CurrentClassName);

    [HttpGet("billing-view")]
    [Authorize(Policy = AppPolicies.StudentsBillingRead)]
    public async Task<ActionResult<PagedResult<StudentBillingViewRow>>> GetBillingView(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.Students.AsNoTracking().Where(s => !s.IsDeleted);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(s => s.FullName.Contains(q.Trim()));
        var total = await query.CountAsync(ct);
        var pageIds = await query.OrderBy(s => s.FullName).Skip(skip).Take(ps).Select(s => s.Id).ToListAsync(ct);
        if (pageIds.Count == 0)
            return Ok(new PagedResult<StudentBillingViewRow> { Items = [], TotalCount = total, Page = p, PageSize = ps });

        var studentData = await db.Students.AsNoTracking()
            .Where(s => pageIds.Contains(s.Id))
            .Select(s => new { s.Id, s.FullName, s.DateOfBirth, s.Status, s.RegistrationCode })
            .ToListAsync(ct);
        var byId = studentData.ToDictionary(x => x.Id);

        var assigns = await db.StudentClassAssignments.AsNoTracking()
            .Where(a => pageIds.Contains(a.StudentId) && a.ToDate == null)
            .Join(db.Classes.Where(c => !c.IsDeleted), a => a.ClassId, c => c.Id, (a, c) => new { a.StudentId, c.Name })
            .ToListAsync(ct);
        var classByStudent = assigns
            .GroupBy(x => x.StudentId)
            .ToDictionary(g => g.Key, g => g.First().Name);

        var items = pageIds.Select(id =>
        {
            var s = byId[id];
            classByStudent.TryGetValue(id, out var cls);
            return new StudentBillingViewRow(s.Id, s.FullName, s.DateOfBirth, s.Status, s.RegistrationCode, cls);
        }).ToList();

        return Ok(new PagedResult<StudentBillingViewRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    public sealed record CreateStudentDto(string FullName, Gender Gender, DateOnly DateOfBirth, string? Address, string? HealthNote, string? AllergyNote);

    public sealed record UpsertStudentDto(string FullName, Gender Gender, DateOnly DateOfBirth, string? Address, string? HealthNote, string? AllergyNote, StudentStatus Status);

    [HttpPost]
    [Authorize(Policy = AppPolicies.StudentsWrite)]
    public async Task<IActionResult> Create([FromBody] CreateStudentDto dto, CancellationToken ct)
    {
        var entity = new Student
        {
            Id = Guid.NewGuid(),
            FullName = dto.FullName.Trim(),
            Gender = dto.Gender,
            DateOfBirth = dto.DateOfBirth,
            Address = dto.Address,
            HealthNote = dto.HealthNote,
            AllergyNote = dto.AllergyNote,
            Status = StudentStatus.DangHoc,
            CreatedAt = DateTime.UtcNow
        };
        db.Students.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/students/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.StudentsWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertStudentDto dto, CancellationToken ct)
    {
        var entity = await db.Students.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        entity.FullName = dto.FullName.Trim();
        entity.Gender = dto.Gender;
        entity.DateOfBirth = dto.DateOfBirth;
        entity.Address = dto.Address;
        entity.HealthNote = dto.HealthNote;
        entity.AllergyNote = dto.AllergyNote;
        entity.Status = dto.Status;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.StudentsWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.Students.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    public sealed record AssignClassDto(Guid ClassId, Guid SchoolYearId, DateOnly FromDate);

    [HttpPost("{id:guid}/class-assignments")]
    [Authorize(Policy = AppPolicies.StudentsWrite)]
    public async Task<IActionResult> AssignClass(Guid id, [FromBody] AssignClassDto dto, CancellationToken ct)
    {
        if (!await db.Students.AnyAsync(s => s.Id == id && !s.IsDeleted, ct))
            return NotFound();
        if (!await db.Classes.AnyAsync(c => c.Id == dto.ClassId && !c.IsDeleted, ct))
            return BadRequest("Lớp không tồn tại.");
        await db.StudentClassAssignments.Where(a => a.StudentId == id && a.ToDate == null)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.ToDate, DateOnly.FromDateTime(DateTime.UtcNow)), ct);
        db.StudentClassAssignments.Add(new StudentClassAssignment
        {
            Id = Guid.NewGuid(),
            StudentId = id,
            ClassId = dto.ClassId,
            SchoolYearId = dto.SchoolYearId,
            FromDate = dto.FromDate,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);
        return Ok();
    }
}
