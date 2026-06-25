namespace QuangTrung.Domain.Entities;

/// <summary>
/// Một tiết trong thời khóa biểu của lớp theo năm học. Mỗi (lớp, năm học, thứ, tiết) là duy nhất.
/// Tham chiếu danh mục <see cref="Subject"/>; không sửa danh mục khi đổi lịch.
/// </summary>
public class ClassTimetable
{
    public Guid Id { get; set; }
    public Guid SchoolYearId { get; set; }
    public Guid ClassId { get; set; }
    /// <summary>Thứ trong tuần: 2 = Thứ Hai … 7 = Thứ Bảy, 8 = Chủ Nhật.</summary>
    public int DayOfWeek { get; set; }
    /// <summary>Tiết/khung học trong ngày (>0), dùng để sắp xếp.</summary>
    public int SlotNo { get; set; }
    public Guid SubjectId { get; set; }
    /// <summary>Giáo viên phụ trách — null nếu chưa phân.</summary>
    public Guid? TeacherId { get; set; }
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    /// <summary>Phòng học chức năng (tin học, âm nhạc…). Text tự do.</summary>
    public string? Room { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }

    public SchoolYear? SchoolYear { get; set; }
    public SchoolClass? Class { get; set; }
    public Subject? Subject { get; set; }
}
