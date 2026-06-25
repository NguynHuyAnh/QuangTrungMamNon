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

/// <summary>
/// Báo cáo sức khỏe học sinh. Ghi: Giáo viên/Y tế + BGH + SuperAdmin. Đọc: staff (mọi HS) +
/// phụ huynh (chỉ con liên kết). Không tự gửi thông báo — chỉ lưu cờ ParentNotified.
/// </summary>
[ApiController]
[Route("api/health-reports")]
public sealed class HealthReportsController(ApplicationDbContext db) : ControllerBase
{
    public sealed record HealthReportRow(
        Guid Id, Guid StudentId, string StudentName, DateOnly ReportDate,
        decimal? Height, decimal? Weight, decimal? Temperature, int? HeartRate,
        string? BloodPressure, string? Symptoms, string? Diagnosis, string? Medication,
        string? DoctorNote, bool ParentNotified, string CreatedByName, DateTime CreatedAt);

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<List<Guid>> GetParentChildIdsAsync(CancellationToken ct) =>
        await db.UserStudentLinks.AsNoTracking()
            .Where(x => x.UserId == CurrentUserId)
            .Select(x => x.StudentId)
            .ToListAsync(ct);

    [HttpGet]
    [Authorize(Policy = AppPolicies.HealthRead)]
    public async Task<ActionResult<PagedResult<HealthReportRow>>> GetList(
        [FromQuery] Guid? studentId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.HealthReports.AsNoTracking().Where(r => !r.IsDeleted);

        if (User.IsInRole(AppRoles.PhuHuynh))
        {
            var childIds = await GetParentChildIdsAsync(ct);
            query = query.Where(r => childIds.Contains(r.StudentId));
        }

        if (studentId is not null)
            query = query.Where(r => r.StudentId == studentId);
        if (from is not null)
            query = query.Where(r => r.ReportDate >= from);
        if (to is not null)
            query = query.Where(r => r.ReportDate <= to);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(r => r.ReportDate).ThenByDescending(r => r.CreatedAt)
            .Skip(skip).Take(ps)
            .Select(r => new HealthReportRow(
                r.Id, r.StudentId,
                db.Students.Where(s => s.Id == r.StudentId).Select(s => s.FullName).FirstOrDefault() ?? "",
                r.ReportDate, r.Height, r.Weight, r.Temperature, r.HeartRate,
                r.BloodPressure, r.Symptoms, r.Diagnosis, r.Medication, r.DoctorNote, r.ParentNotified,
                db.Users.Where(u => u.Id == r.CreatedByUserId).Select(u => u.FullName).FirstOrDefault() ?? "",
                r.CreatedAt))
            .ToListAsync(ct);
        return Ok(new PagedResult<HealthReportRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AppPolicies.HealthRead)]
    public async Task<ActionResult<HealthReportRow>> GetById(Guid id, CancellationToken ct)
    {
        var r = await db.HealthReports.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (r is null)
            return NotFound();
        if (User.IsInRole(AppRoles.PhuHuynh))
        {
            var childIds = await GetParentChildIdsAsync(ct);
            if (!childIds.Contains(r.StudentId))
                return Forbid();
        }
        var name = await db.Students.Where(s => s.Id == r.StudentId).Select(s => s.FullName).FirstOrDefaultAsync(ct) ?? "";
        var creator = await db.Users.Where(u => u.Id == r.CreatedByUserId).Select(u => u.FullName).FirstOrDefaultAsync(ct) ?? "";
        return Ok(new HealthReportRow(
            r.Id, r.StudentId, name, r.ReportDate, r.Height, r.Weight, r.Temperature, r.HeartRate,
            r.BloodPressure, r.Symptoms, r.Diagnosis, r.Medication, r.DoctorNote, r.ParentNotified, creator, r.CreatedAt));
    }

    public sealed record UpsertHealthReportDto(
        Guid StudentId, DateOnly ReportDate, decimal? Height, decimal? Weight, decimal? Temperature,
        int? HeartRate, string? BloodPressure, string? Symptoms, string? Diagnosis, string? Medication,
        string? DoctorNote, bool ParentNotified);

    [HttpPost]
    [Authorize(Policy = AppPolicies.HealthWrite)]
    public async Task<IActionResult> Create([FromBody] UpsertHealthReportDto dto, CancellationToken ct)
    {
        if (!await db.Students.AnyAsync(s => s.Id == dto.StudentId && !s.IsDeleted, ct))
            return BadRequest("Học sinh không tồn tại.");
        var error = ValidateVitals(dto);
        if (error is not null)
            return BadRequest(error);

        var entity = new HealthReport
        {
            Id = Guid.NewGuid(),
            StudentId = dto.StudentId,
            ReportDate = dto.ReportDate,
            Height = dto.Height,
            Weight = dto.Weight,
            Temperature = dto.Temperature,
            HeartRate = dto.HeartRate,
            BloodPressure = string.IsNullOrWhiteSpace(dto.BloodPressure) ? null : dto.BloodPressure.Trim(),
            Symptoms = string.IsNullOrWhiteSpace(dto.Symptoms) ? null : dto.Symptoms.Trim(),
            Diagnosis = string.IsNullOrWhiteSpace(dto.Diagnosis) ? null : dto.Diagnosis.Trim(),
            Medication = string.IsNullOrWhiteSpace(dto.Medication) ? null : dto.Medication.Trim(),
            DoctorNote = string.IsNullOrWhiteSpace(dto.DoctorNote) ? null : dto.DoctorNote.Trim(),
            ParentNotified = dto.ParentNotified,
            CreatedByUserId = CurrentUserId,
            CreatedAt = DateTime.UtcNow
        };
        db.HealthReports.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/health-reports/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.HealthWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertHealthReportDto dto, CancellationToken ct)
    {
        var entity = await db.HealthReports.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        if (!await db.Students.AnyAsync(s => s.Id == dto.StudentId && !s.IsDeleted, ct))
            return BadRequest("Học sinh không tồn tại.");
        var error = ValidateVitals(dto);
        if (error is not null)
            return BadRequest(error);

        entity.StudentId = dto.StudentId;
        entity.ReportDate = dto.ReportDate;
        entity.Height = dto.Height;
        entity.Weight = dto.Weight;
        entity.Temperature = dto.Temperature;
        entity.HeartRate = dto.HeartRate;
        entity.BloodPressure = string.IsNullOrWhiteSpace(dto.BloodPressure) ? null : dto.BloodPressure.Trim();
        entity.Symptoms = string.IsNullOrWhiteSpace(dto.Symptoms) ? null : dto.Symptoms.Trim();
        entity.Diagnosis = string.IsNullOrWhiteSpace(dto.Diagnosis) ? null : dto.Diagnosis.Trim();
        entity.Medication = string.IsNullOrWhiteSpace(dto.Medication) ? null : dto.Medication.Trim();
        entity.DoctorNote = string.IsNullOrWhiteSpace(dto.DoctorNote) ? null : dto.DoctorNote.Trim();
        entity.ParentNotified = dto.ParentNotified;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.HealthWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.HealthReports.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static string? ValidateVitals(UpsertHealthReportDto dto)
    {
        if (dto.Height is < 0)
            return "Chiều cao không hợp lệ.";
        if (dto.Weight is < 0)
            return "Cân nặng không hợp lệ.";
        if (dto.Temperature is < 30 or > 45)
            return "Nhiệt độ không hợp lệ (30–45°C).";
        if (dto.HeartRate is < 0)
            return "Nhịp tim không hợp lệ.";
        return null;
    }
}
