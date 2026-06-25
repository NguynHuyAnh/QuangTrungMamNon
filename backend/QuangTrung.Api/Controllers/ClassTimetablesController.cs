using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Application.Constants;
using QuangTrung.Domain.Entities;
using QuangTrung.Infrastructure.Persistence;
using System.Security.Claims;

namespace QuangTrung.Api.Controllers;

/// <summary>
/// Thời khóa biểu theo lớp/năm học. Xem: mọi tài khoản (phụ huynh chỉ lớp con). Ghi: BGH/SuperAdmin.
/// Khi lưu kiểm tra trùng tiết (lớp), trùng giáo viên và trùng phòng theo (năm học, thứ, tiết).
/// </summary>
[ApiController]
[Route("api/class-timetables")]
public sealed class ClassTimetablesController(ApplicationDbContext db) : ControllerBase
{
    public sealed record TimetableSlotRow(
        Guid Id, Guid SchoolYearId, Guid ClassId, int DayOfWeek, int SlotNo,
        Guid SubjectId, string SubjectName, string? SubjectColor,
        Guid? TeacherId, string? TeacherName,
        TimeOnly? StartTime, TimeOnly? EndTime, string? Room, string? Note);

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<List<Guid>> GetParentClassIdsAsync(CancellationToken ct)
    {
        var childIds = await db.UserStudentLinks.AsNoTracking()
            .Where(x => x.UserId == CurrentUserId)
            .Select(x => x.StudentId)
            .ToListAsync(ct);
        return await db.StudentClassAssignments.AsNoTracking()
            .Where(a => childIds.Contains(a.StudentId) && a.ToDate == null)
            .Select(a => a.ClassId)
            .Distinct()
            .ToListAsync(ct);
    }

    /// <summary>Danh sách tiết của một lớp trong một năm học (toàn tuần).</summary>
    [HttpGet]
    [Authorize(Policy = AppPolicies.TimetableRead)]
    public async Task<ActionResult<IReadOnlyList<TimetableSlotRow>>> GetByClass(
        [FromQuery] Guid classId,
        [FromQuery] Guid schoolYearId,
        CancellationToken ct = default)
    {
        if (classId == Guid.Empty || schoolYearId == Guid.Empty)
            return BadRequest("Cần truyền classId và schoolYearId.");

        if (User.IsInRole(AppRoles.PhuHuynh))
        {
            var classIds = await GetParentClassIdsAsync(ct);
            if (!classIds.Contains(classId))
                return Forbid();
        }

        var items = await db.ClassTimetables.AsNoTracking()
            .Where(t => !t.IsDeleted && t.ClassId == classId && t.SchoolYearId == schoolYearId)
            .OrderBy(t => t.DayOfWeek).ThenBy(t => t.SlotNo)
            .Select(t => new TimetableSlotRow(
                t.Id, t.SchoolYearId, t.ClassId, t.DayOfWeek, t.SlotNo,
                t.SubjectId,
                t.Subject != null ? t.Subject.Name : "",
                t.Subject != null ? t.Subject.ColorCode : null,
                t.TeacherId,
                t.TeacherId != null ? db.Users.Where(u => u.Id == t.TeacherId).Select(u => u.FullName).FirstOrDefault() : null,
                t.StartTime, t.EndTime, t.Room, t.Note))
            .ToListAsync(ct);
        return Ok(items);
    }

    public sealed record UpsertTimetableSlotDto(
        Guid SchoolYearId, Guid ClassId, int DayOfWeek, int SlotNo, Guid SubjectId,
        Guid? TeacherId, TimeOnly? StartTime, TimeOnly? EndTime, string? Room, string? Note);

    [HttpPost]
    [Authorize(Policy = AppPolicies.TimetableWrite)]
    public async Task<IActionResult> Create([FromBody] UpsertTimetableSlotDto dto, CancellationToken ct)
    {
        var error = await ValidateAsync(dto, null, ct);
        if (error is not null)
            return error;

        var entity = new ClassTimetable
        {
            Id = Guid.NewGuid(),
            SchoolYearId = dto.SchoolYearId,
            ClassId = dto.ClassId,
            DayOfWeek = dto.DayOfWeek,
            SlotNo = dto.SlotNo,
            SubjectId = dto.SubjectId,
            TeacherId = dto.TeacherId,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            Room = string.IsNullOrWhiteSpace(dto.Room) ? null : dto.Room.Trim(),
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        db.ClassTimetables.Add(entity);
        await db.SaveChangesAsync(ct);
        return Created($"/api/class-timetables/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AppPolicies.TimetableWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertTimetableSlotDto dto, CancellationToken ct)
    {
        var entity = await db.ClassTimetables.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();

        var error = await ValidateAsync(dto, id, ct);
        if (error is not null)
            return error;

        entity.SchoolYearId = dto.SchoolYearId;
        entity.ClassId = dto.ClassId;
        entity.DayOfWeek = dto.DayOfWeek;
        entity.SlotNo = dto.SlotNo;
        entity.SubjectId = dto.SubjectId;
        entity.TeacherId = dto.TeacherId;
        entity.StartTime = dto.StartTime;
        entity.EndTime = dto.EndTime;
        entity.Room = string.IsNullOrWhiteSpace(dto.Room) ? null : dto.Room.Trim();
        entity.Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AppPolicies.TimetableWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await db.ClassTimetables.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (entity is null)
            return NotFound();
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Kiểm tra dữ liệu + trùng tiết/giáo viên/phòng. Trả về ActionResult lỗi nếu không hợp lệ, null nếu OK.</summary>
    private async Task<IActionResult?> ValidateAsync(UpsertTimetableSlotDto dto, Guid? excludeId, CancellationToken ct)
    {
        if (dto.DayOfWeek is < 2 or > 8)
            return BadRequest("Thứ phải trong khoảng 2 (Thứ Hai) đến 8 (Chủ Nhật).");
        if (dto.SlotNo <= 0)
            return BadRequest("Tiết học phải lớn hơn 0.");
        if (dto.EndTime is not null && dto.StartTime is not null && dto.EndTime <= dto.StartTime)
            return BadRequest("Giờ kết thúc phải sau giờ bắt đầu.");
        if (!await db.SchoolYears.AnyAsync(y => y.Id == dto.SchoolYearId && !y.IsDeleted, ct))
            return BadRequest("Năm học không tồn tại.");
        if (!await db.Classes.AnyAsync(c => c.Id == dto.ClassId && !c.IsDeleted, ct))
            return BadRequest("Lớp không tồn tại.");
        if (!await db.Subjects.AnyAsync(s => s.Id == dto.SubjectId && !s.IsDeleted, ct))
            return BadRequest("Môn học không tồn tại.");

        // Trùng tiết của lớp (theo unique index): cùng lớp/năm/thứ/tiết.
        var classClash = await db.ClassTimetables.AnyAsync(
            t => !t.IsDeleted && t.Id != excludeId
                 && t.ClassId == dto.ClassId && t.SchoolYearId == dto.SchoolYearId
                 && t.DayOfWeek == dto.DayOfWeek && t.SlotNo == dto.SlotNo, ct);
        if (classClash)
            return Conflict("Lớp đã có tiết ở khung giờ này.");

        // Trùng giáo viên: cùng GV dạy 2 lớp cùng (năm/thứ/tiết).
        if (dto.TeacherId is not null)
        {
            var teacherClash = await db.ClassTimetables.AnyAsync(
                t => !t.IsDeleted && t.Id != excludeId
                     && t.SchoolYearId == dto.SchoolYearId && t.DayOfWeek == dto.DayOfWeek
                     && t.SlotNo == dto.SlotNo && t.TeacherId == dto.TeacherId, ct);
            if (teacherClash)
                return Conflict("Giáo viên đã có tiết ở khung giờ này tại lớp khác.");
        }

        // Trùng phòng (best-effort vì Room là text tự do).
        if (!string.IsNullOrWhiteSpace(dto.Room))
        {
            var room = dto.Room.Trim();
            var roomClash = await db.ClassTimetables.AnyAsync(
                t => !t.IsDeleted && t.Id != excludeId
                     && t.SchoolYearId == dto.SchoolYearId && t.DayOfWeek == dto.DayOfWeek
                     && t.SlotNo == dto.SlotNo && t.Room == room, ct);
            if (roomClash)
                return Conflict("Phòng học đã bị dùng ở khung giờ này.");
        }

        return null;
    }
}
