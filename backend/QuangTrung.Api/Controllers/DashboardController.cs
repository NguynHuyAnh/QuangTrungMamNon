using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Api.Authorization;
using QuangTrung.Application.Constants;
using QuangTrung.Domain.Entities;
using QuangTrung.Domain.Enums;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController(ApplicationDbContext db) : ControllerBase
{
    public sealed record AgeSliceDto(string Label, int Count);

    public sealed record StaffSummaryDto(
        int StudentCount,
        int ClassCount,
        int PublishedAnnouncementsCount,
        decimal? PaymentsTotalThisMonthUtc,
        IReadOnlyList<int> NewStudentsLast6MonthsUtc,
        IReadOnlyList<AgeSliceDto> StudentAgeSlices);

    [HttpGet("staff-summary")]
    [Authorize(Policy = AppPolicies.DashboardRead)]
    public async Task<ActionResult<StaffSummaryDto>> GetStaffSummary(CancellationToken ct) =>
        Ok(await ComputeStaffSummaryAsync(ct));

    /// <summary>Báo cáo tổng quan UTF-8 (BOM) — mở được bằng Excel; dữ liệu khớp staff-summary toàn trường (không phụ thuộc phạm vi giáo viên).</summary>
    [HttpGet("export-report")]
    [Authorize(Policy = AppPolicies.DashboardExport)]
    public async Task<IActionResult> ExportReport(CancellationToken ct)
    {
        var dto = await ComputeLeadershipExportSummaryAsync(ct);
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? "";
        var generated = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss") + " UTC";

        static string Esc(string? s)
        {
            if (string.IsNullOrEmpty(s)) return "\"\"";
            var t = s.Replace("\"", "\"\"");
            if (t.Contains(',') || t.Contains('\n') || t.Contains('\r'))
                return $"\"{t}\"";
            return t.Contains('"') ? $"\"{t}\"" : t;
        }

        var sb = new StringBuilder();
        sb.Append('\uFEFF');
        sb.AppendLine("Báo cáo tổng quan,Quang Trung MN");
        sb.AppendLine($"Thời điểm xuất,{Esc(generated)}");
        sb.AppendLine($"Tài khoản,{Esc(email)}");
        sb.AppendLine();
        sb.AppendLine("Chỉ số,Giá trị");
        sb.AppendLine($"Tổng số học sinh,{dto.StudentCount}");
        sb.AppendLine($"Số lớp học,{dto.ClassCount}");
        sb.AppendLine($"Thông báo đã publish,{dto.PublishedAnnouncementsCount}");
        sb.AppendLine(
            dto.PaymentsTotalThisMonthUtc is null
                ? "Tổng thu tháng hiện tại (UTC),"
                : $"Tổng thu tháng hiện tại (UTC),{dto.PaymentsTotalThisMonthUtc.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)}");

        sb.AppendLine();
        sb.AppendLine("Học sinh mới theo tháng (UTC — 6 tháng gần nhất từ cũ đến mới)");
        sb.AppendLine("Thứ tự tháng,Số lượng");
        for (var i = 0; i < dto.NewStudentsLast6MonthsUtc.Count; i++)
            sb.AppendLine($"{i + 1},{dto.NewStudentsLast6MonthsUtc[i]}");

        sb.AppendLine();
        sb.AppendLine("Học sinh theo độ tuổi (ước tính tại thời điểm xuất)");
        sb.AppendLine("Nhóm,Số lượng");
        foreach (var s in dto.StudentAgeSlices)
            sb.AppendLine($"{Esc(s.Label)},{s.Count}");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var file = $"bao-cao-tong-quan-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
        return File(bytes, "text/csv; charset=utf-8", file);
    }

    /// <summary>Dùng cho xuất báo cáo: luôn phạm vi toàn trường (BGH / SuperAdmin).</summary>
    private async Task<StaffSummaryDto> ComputeLeadershipExportSummaryAsync(CancellationToken ct)
    {
        var classCount = await db.Classes.AsNoTracking().CountAsync(c => !c.IsDeleted, ct);
        var activeStudents = db.Students.AsNoTracking().Where(s => !s.IsDeleted);
        var studentCount = await activeStudents.CountAsync(ct);

        var publishedAnnouncements = await db.Announcements.AsNoTracking()
            .CountAsync(a => a.Status == AnnouncementStatus.Published, ct);

        var now = DateTime.UtcNow;
        var start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthPayments = await db.Payments.AsNoTracking()
            .Where(p => p.PaidAt >= start && p.PaidAt < start.AddMonths(1))
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;

        var utcNow = DateTime.UtcNow;
        var firstMonthStart = new DateTime(utcNow.Year, utcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-5);
        var newByMonth = new List<int>(6);
        for (var i = 0; i < 6; i++)
        {
            var monthStart = firstMonthStart.AddMonths(i);
            var monthEnd = monthStart.AddMonths(1);
            var n = await activeStudents.CountAsync(s => s.CreatedAt >= monthStart && s.CreatedAt < monthEnd, ct);
            newByMonth.Add(n);
        }

        var dobs = await activeStudents.Select(s => s.DateOfBirth).ToListAsync(ct);
        var today = DateOnly.FromDateTime(utcNow);
        var b0 = 0;
        var b3 = 0;
        var b4 = 0;
        var b5 = 0;
        foreach (var dob in dobs)
        {
            var age = today.Year - dob.Year;
            if (today.Month < dob.Month || (today.Month == dob.Month && today.Day < dob.Day))
                age--;
            if (age < 3) b0++;
            else if (age == 3) b3++;
            else if (age == 4) b4++;
            else b5++;
        }

        IReadOnlyList<AgeSliceDto> slices =
        [
            new AgeSliceDto("Dưới 3 tuổi", b0),
            new AgeSliceDto("3 tuổi", b3),
            new AgeSliceDto("4 tuổi", b4),
            new AgeSliceDto("5 tuổi trở lên", b5),
        ];

        return new StaffSummaryDto(
            studentCount,
            classCount,
            publishedAnnouncements,
            monthPayments,
            newByMonth,
            slices);
    }

    private async Task<StaffSummaryDto> ComputeStaffSummaryAsync(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        int classCount;
        IQueryable<Student> activeStudents = db.Students.AsNoTracking().Where(s => !s.IsDeleted);
        if (User.IsInRole(AppRoles.GiaoVien))
        {
            classCount = await db.Classes.AsNoTracking()
                .CountAsync(c => !c.IsDeleted && c.HomeroomTeacherId == userId, ct);
            activeStudents = activeStudents.Where(s =>
                db.StudentClassAssignments.Any(a =>
                    a.StudentId == s.Id
                    && a.ToDate == null
                    && db.Classes.Any(c =>
                        c.Id == a.ClassId && !c.IsDeleted && c.HomeroomTeacherId == userId)));
        }
        else
        {
            classCount = await db.Classes.AsNoTracking().CountAsync(c => !c.IsDeleted, ct);
        }

        var studentCount = await activeStudents.CountAsync(ct);

        var publishedAnnouncements = await db.Announcements.AsNoTracking()
            .CountAsync(a => a.Status == AnnouncementStatus.Published, ct);

        decimal? monthPayments = null;
        if (User.IsInRole(AppRoles.KeToan) || User.IsInRole(AppRoles.BanGiamHieu) || User.IsInRole(AppRoles.SuperAdmin))
        {
            var now = DateTime.UtcNow;
            var start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var end = start.AddMonths(1);
            monthPayments = await db.Payments.AsNoTracking()
                .Where(p => p.PaidAt >= start && p.PaidAt < end)
                .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;
        }

        var utcNow = DateTime.UtcNow;
        var firstMonthStart = new DateTime(utcNow.Year, utcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-5);
        var newByMonth = new List<int>(6);
        for (var i = 0; i < 6; i++)
        {
            var monthStart = firstMonthStart.AddMonths(i);
            var monthEnd = monthStart.AddMonths(1);
            var n = await activeStudents.CountAsync(s => s.CreatedAt >= monthStart && s.CreatedAt < monthEnd, ct);
            newByMonth.Add(n);
        }

        var dobs = await activeStudents.Select(s => s.DateOfBirth).ToListAsync(ct);
        var today = DateOnly.FromDateTime(utcNow);
        var b0 = 0;
        var b3 = 0;
        var b4 = 0;
        var b5 = 0;
        foreach (var dob in dobs)
        {
            var age = today.Year - dob.Year;
            if (today.Month < dob.Month || (today.Month == dob.Month && today.Day < dob.Day))
                age--;
            if (age < 3) b0++;
            else if (age == 3) b3++;
            else if (age == 4) b4++;
            else b5++;
        }

        IReadOnlyList<AgeSliceDto> slices =
        [
            new AgeSliceDto("Dưới 3 tuổi", b0),
            new AgeSliceDto("3 tuổi", b3),
            new AgeSliceDto("4 tuổi", b4),
            new AgeSliceDto("5 tuổi trở lên", b5),
        ];

        return new StaffSummaryDto(
            studentCount,
            classCount,
            publishedAnnouncements,
            monthPayments,
            newByMonth,
            slices);
    }
}
