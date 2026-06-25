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

/// <summary>
/// Môn năng khiếu (ngoài giờ): danh mục + đăng ký học sinh + cờ thu học phí.
/// Danh mục ghi: BGH/SuperAdmin. Đăng ký/hủy: GV/BGH/SuperAdmin. Thu phí: Kế toán/SuperAdmin.
/// </summary>
[ApiController]
[Route("api/external-subjects")]
public sealed class ExternalSubjectsController(ApplicationDbContext db) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ===================== Danh mục môn năng khiếu =====================

    public sealed record ExternalSubjectRow(
        Guid Id, string Code, string Name, Guid? TeacherId, string? TeacherName,
        decimal? FeeAmount, int? MaxStudents, int ActiveCount, bool IsActive, string? Note);

    [HttpGet]
    [Authorize(Policy = AppPolicies.ExternalSubjectsRead)]
    public async Task<ActionResult<PagedResult<ExternalSubjectRow>>> GetList(
        [FromQuery] string? q,
        [FromQuery] bool? activeOnly,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.ExternalSubjects.AsNoTracking().Where(s => !s.IsDeleted);

        if (activeOnly == true)
            query = query.Where(s => s.IsActive);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(s => s.Name.Contains(term) || s.Code.Contains(term));
        }

        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(s => s.Name).Skip(skip).Take(ps)
            .Select(s => new ExternalSubjectRow(
                s.Id, s.Code, s.Name, s.TeacherId,
                s.TeacherId != null ? db.Users.Where(u => u.Id == s.TeacherId).Select(u => u.FullName).FirstOrDefault() : null,
                s.FeeAmount, s.MaxStudents,
                db.StudentExternalSubjects.Count(e => e.ExternalSubjectId == s.Id && !e.IsDeleted && e.Status == EnrollmentStatus.Active),
                s.IsActive, s.Note))
            .ToListAsync(ct);
        return Ok(new PagedResult<ExternalSubjectRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    public sealed record UpsertExternalSubjectDto(
        string Code, string Name, Guid? TeacherId, decimal? FeeAmount, int? MaxStudents, bool IsActive, string? Note);

    [HttpPost]
    [Authorize(Policy = AppPolicies.ExternalSubjectsWrite)]
    public async Task<IActionResult> Create([FromBody] UpsertExternalSubjectDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
            return BadRequest("Mã môn không được để trống.");
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("Tên môn không được để trống.");
        if (dto.FeeAmount is < 0)
            return BadRequest("Học phí không hợp lệ.");
        if (dto.MaxStudents is <= 0)
            return BadRequest("Sĩ số tối đa phải lớn hơn 0.");

        var code = dto.Code.Trim();
        if (await db.ExternalSubjects.AnyAsync(s => s.Code == code && !s.IsDeleted, ct))
            return Conflict("Mã môn đã tồn tại.");
        if (dto.TeacherId is not null && !await db.Users.AnyAsync(u => u.Id == dto.TeacherId, ct))
            return BadRequest("Giáo viên không tồn tại.");

        var entity = new ExternalSubject
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = dto.Name.Trim(),
            TeacherId = dto.TeacherId,
            FeeAmount = dto.FeeAmount,
            MaxStudents = dto.MaxStudents,
            IsActive = dto.IsActive,
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        db.ExternalSubjects.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/external-subjects/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.ExternalSubjectsWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertExternalSubjectDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
            return BadRequest("Mã môn không được để trống.");
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("Tên môn không được để trống.");
        if (dto.FeeAmount is < 0)
            return BadRequest("Học phí không hợp lệ.");
        if (dto.MaxStudents is <= 0)
            return BadRequest("Sĩ số tối đa phải lớn hơn 0.");

        var entity = await db.ExternalSubjects.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();

        var code = dto.Code.Trim();
        if (await db.ExternalSubjects.AnyAsync(s => s.Id != id && s.Code == code && !s.IsDeleted, ct))
            return Conflict("Mã môn đã tồn tại.");
        if (dto.TeacherId is not null && !await db.Users.AnyAsync(u => u.Id == dto.TeacherId, ct))
            return BadRequest("Giáo viên không tồn tại.");

        entity.Code = code;
        entity.Name = dto.Name.Trim();
        entity.TeacherId = dto.TeacherId;
        entity.FeeAmount = dto.FeeAmount;
        entity.MaxStudents = dto.MaxStudents;
        entity.IsActive = dto.IsActive;
        entity.Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.ExternalSubjectsWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.ExternalSubjects.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        if (await db.StudentExternalSubjects.AnyAsync(e => e.ExternalSubjectId == id && !e.IsDeleted && e.Status == EnrollmentStatus.Active, ct))
            return Conflict("Môn đang có học sinh đăng ký, không thể xóa. Hãy tắt trạng thái thay vì xóa.");

        entity.IsDeleted = true;
        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ===================== Đăng ký môn năng khiếu =====================

    public sealed record EnrollmentRow(
        Guid Id, Guid StudentId, string StudentName, Guid ExternalSubjectId, string ExternalSubjectName,
        decimal? FeeAmount, DateOnly EnrollDate, DateOnly? WithdrawDate, EnrollmentStatus Status,
        FeePaymentStatus PaymentStatus, DateTime? PaidAt, string? CollectedByName);

    private IQueryable<EnrollmentRow> ProjectEnrollment(IQueryable<StudentExternalSubject> q) =>
        q.Select(e => new EnrollmentRow(
            e.Id, e.StudentId,
            db.Students.Where(s => s.Id == e.StudentId).Select(s => s.FullName).FirstOrDefault() ?? "",
            e.ExternalSubjectId,
            db.ExternalSubjects.Where(x => x.Id == e.ExternalSubjectId).Select(x => x.Name).FirstOrDefault() ?? "",
            db.ExternalSubjects.Where(x => x.Id == e.ExternalSubjectId).Select(x => x.FeeAmount).FirstOrDefault(),
            e.EnrollDate, e.WithdrawDate, e.Status, e.PaymentStatus, e.PaidAt,
            e.CollectedByUserId != null ? db.Users.Where(u => u.Id == e.CollectedByUserId).Select(u => u.FullName).FirstOrDefault() : null));

    [HttpGet("enrollments")]
    [Authorize(Policy = AppPolicies.EnrollmentRead)]
    public async Task<ActionResult<PagedResult<EnrollmentRow>>> GetEnrollments(
        [FromQuery] Guid? externalSubjectId,
        [FromQuery] Guid? studentId,
        [FromQuery] EnrollmentStatus? status,
        [FromQuery] FeePaymentStatus? paymentStatus,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (p, ps, skip) = Pagination.Normalize(page, pageSize);
        var query = db.StudentExternalSubjects.AsNoTracking().Where(e => !e.IsDeleted);

        if (User.IsInRole(AppRoles.PhuHuynh))
        {
            var childIds = await db.UserStudentLinks.AsNoTracking()
                .Where(x => x.UserId == CurrentUserId).Select(x => x.StudentId).ToListAsync(ct);
            query = query.Where(e => childIds.Contains(e.StudentId));
        }

        if (externalSubjectId is not null)
            query = query.Where(e => e.ExternalSubjectId == externalSubjectId);
        if (studentId is not null)
            query = query.Where(e => e.StudentId == studentId);
        if (status is not null)
            query = query.Where(e => e.Status == status);
        if (paymentStatus is not null)
            query = query.Where(e => e.PaymentStatus == paymentStatus);

        var total = await query.CountAsync(ct);
        var items = await ProjectEnrollment(query.OrderByDescending(e => e.EnrollDate).Skip(skip).Take(ps)).ToListAsync(ct);
        return Ok(new PagedResult<EnrollmentRow> { Items = items, TotalCount = total, Page = p, PageSize = ps });
    }

    public sealed record EnrollDto(Guid StudentId, Guid ExternalSubjectId, DateOnly EnrollDate);

    [HttpPost("enrollments")]
    [Authorize(Policy = AppPolicies.EnrollmentWrite)]
    public async Task<IActionResult> Enroll([FromBody] EnrollDto dto, CancellationToken ct)
    {
        if (!await db.Students.AnyAsync(s => s.Id == dto.StudentId && !s.IsDeleted, ct))
            return BadRequest("Học sinh không tồn tại.");
        var subject = await db.ExternalSubjects.FirstOrDefaultAsync(x => x.Id == dto.ExternalSubjectId && !x.IsDeleted, ct);
        if (subject is null)
            return BadRequest("Môn năng khiếu không tồn tại.");
        if (!subject.IsActive)
            return BadRequest("Môn đang tắt, không thể đăng ký.");

        // Chặn đăng ký trùng (đang Active).
        var dup = await db.StudentExternalSubjects.AnyAsync(
            e => e.StudentId == dto.StudentId && e.ExternalSubjectId == dto.ExternalSubjectId
                 && !e.IsDeleted && e.Status == EnrollmentStatus.Active, ct);
        if (dup)
            return Conflict("Học sinh đã đăng ký môn này.");

        // Check sĩ số.
        if (subject.MaxStudents is not null)
        {
            var activeCount = await db.StudentExternalSubjects.CountAsync(
                e => e.ExternalSubjectId == dto.ExternalSubjectId && !e.IsDeleted && e.Status == EnrollmentStatus.Active, ct);
            if (activeCount >= subject.MaxStudents.Value)
                return Conflict("Môn đã đủ sĩ số tối đa.");
        }

        var entity = new StudentExternalSubject
        {
            Id = Guid.NewGuid(),
            StudentId = dto.StudentId,
            ExternalSubjectId = dto.ExternalSubjectId,
            EnrollDate = dto.EnrollDate,
            Status = EnrollmentStatus.Active,
            PaymentStatus = FeePaymentStatus.Unpaid,
            CreatedAt = DateTime.UtcNow
        };
        db.StudentExternalSubjects.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/external-subjects/enrollments/{entity.Id}", new { entity.Id });
    }

    /// <summary>Hủy/rút đăng ký: đặt WithdrawDate + Status=Cancelled (không xóa cứng).</summary>
    [HttpPost("enrollments/{id:guid}/withdraw")]
    [Authorize(Policy = AppPolicies.EnrollmentWrite)]
    public async Task<IActionResult> Withdraw(Guid id, CancellationToken ct)
    {
        var entity = await db.StudentExternalSubjects.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        if (entity.Status == EnrollmentStatus.Cancelled)
            return BadRequest("Đăng ký đã hủy trước đó.");

        entity.Status = EnrollmentStatus.Cancelled;
        entity.WithdrawDate = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Xác nhận thu học phí: PaymentStatus=Paid + người thu + thời điểm. Kế toán/SuperAdmin.</summary>
    [HttpPost("enrollments/{id:guid}/collect-fee")]
    [Authorize(Policy = AppPolicies.EnrollmentCollectFee)]
    public async Task<IActionResult> CollectFee(Guid id, CancellationToken ct)
    {
        var entity = await db.StudentExternalSubjects.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        if (entity.PaymentStatus == FeePaymentStatus.Paid)
            return BadRequest("Đăng ký này đã đóng học phí.");

        entity.PaymentStatus = FeePaymentStatus.Paid;
        entity.PaidAt = DateTime.UtcNow;
        entity.CollectedByUserId = CurrentUserId;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
