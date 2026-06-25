using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using QuangTrung.Domain.Entities;
using QuangTrung.Infrastructure.Identity;

namespace QuangTrung.Infrastructure.Persistence;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>(options)
{
    public DbSet<SchoolYear> SchoolYears => Set<SchoolYear>();
    public DbSet<Grade> Grades => Set<Grade>();
    public DbSet<SchoolClass> Classes => Set<SchoolClass>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<StudentClassAssignment> StudentClassAssignments => Set<StudentClassAssignment>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<FeeStructure> FeeStructures => Set<FeeStructure>();
    public DbSet<StudentFeeAssignment> StudentFeeAssignments => Set<StudentFeeAssignment>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<ZaloPayOrder> ZaloPayOrders => Set<ZaloPayOrder>();
    public DbSet<UserStudentLink> UserStudentLinks => Set<UserStudentLink>();
    public DbSet<Dish> Dishes => Set<Dish>();
    public DbSet<DailyMenu> DailyMenus => Set<DailyMenu>();
    public DbSet<DailyMenuItem> DailyMenuItems => Set<DailyMenuItem>();
    public DbSet<Subject> Subjects => Set<Subject>();
    public DbSet<ClassTimetable> ClassTimetables => Set<ClassTimetable>();
    public DbSet<HealthReport> HealthReports => Set<HealthReport>();
    public DbSet<ExternalSubject> ExternalSubjects => Set<ExternalSubject>();
    public DbSet<StudentExternalSubject> StudentExternalSubjects => Set<StudentExternalSubject>();
    public DbSet<StudentLeaveRequest> StudentLeaveRequests => Set<StudentLeaveRequest>();
    public DbSet<StaffLeaveRequest> StaffLeaveRequests => Set<StaffLeaveRequest>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<SchoolYear>(e =>
        {
            e.HasIndex(x => x.Name);
            e.Property(x => x.Name).HasMaxLength(128);
        });

        builder.Entity<Grade>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(128);
        });

        builder.Entity<SchoolClass>(e =>
        {
            e.ToTable("Classes");
            e.Property(x => x.Name).HasMaxLength(128);
            e.HasOne(c => c.SchoolYear).WithMany().HasForeignKey(c => c.SchoolYearId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(c => c.Grade).WithMany().HasForeignKey(c => c.GradeId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(c => c.HomeroomTeacherId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Student>(e =>
        {
            e.Property(x => x.FullName).HasMaxLength(256);
            e.Property(x => x.Ethnicity).HasMaxLength(64);
            e.Property(x => x.Address).HasMaxLength(512);
            e.Property(x => x.RegistrationCode).HasMaxLength(64);
            e.HasIndex(x => x.RegistrationCode).IsUnique();
        });

        builder.Entity<StudentClassAssignment>(e =>
        {
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Class).WithMany().HasForeignKey(x => x.ClassId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.SchoolYear).WithMany().HasForeignKey(x => x.SchoolYearId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AttendanceRecord>(e =>
        {
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Class).WithMany().HasForeignKey(x => x.ClassId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.RecordedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.ClassId, x.Date, x.StudentId }).IsUnique();
        });

        builder.Entity<Announcement>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(256);
            e.HasOne(x => x.Class).WithMany().HasForeignKey(x => x.ClassId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<FeeStructure>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(128);
            e.HasOne(x => x.SchoolYear).WithMany().HasForeignKey(x => x.SchoolYearId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<StudentFeeAssignment>(e =>
        {
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SchoolYear).WithMany().HasForeignKey(x => x.SchoolYearId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.FeeStructure).WithMany().HasForeignKey(x => x.FeeStructureId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Payment>(e =>
        {
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.StudentFeeAssignment).WithMany().HasForeignKey(x => x.StudentFeeAssignmentId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.RecordedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ZaloPayOrder>(e =>
        {
            e.HasIndex(x => x.AppTransId).IsUnique();
            e.Property(x => x.AppTransId).HasMaxLength(64);
            e.Property(x => x.Description).HasMaxLength(512);
            e.Property(x => x.ZpTransId).HasMaxLength(64);
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.StudentFeeAssignment).WithMany().HasForeignKey(x => x.StudentFeeAssignmentId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Payment).WithMany().HasForeignKey(x => x.PaymentId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.RecordedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<UserStudentLink>(e =>
        {
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Relationship).HasMaxLength(64);
        });

        builder.Entity<Dish>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(256);
            e.HasIndex(x => x.Name);
        });

        builder.Entity<DailyMenu>(e =>
        {
            e.HasOne(x => x.Class).WithMany().HasForeignKey(x => x.ClassId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.SchoolYear).WithMany().HasForeignKey(x => x.SchoolYearId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.ApprovedByUserId).OnDelete(DeleteBehavior.Restrict);
            // Mỗi (ngày, bữa, lớp) tối đa một thực đơn. ClassId NULL (toàn trường) được kiểm tra thêm ở controller
            // vì Postgres coi các NULL là khác nhau trong unique index.
            e.HasIndex(x => new { x.MenuDate, x.MealType, x.ClassId }).IsUnique();
        });

        builder.Entity<DailyMenuItem>(e =>
        {
            e.Property(x => x.DishName).HasMaxLength(256);
            e.HasOne(x => x.DailyMenu).WithMany(m => m.Items).HasForeignKey(x => x.DailyMenuId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Dish).WithMany().HasForeignKey(x => x.DishId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Subject>(e =>
        {
            e.Property(x => x.Code).HasMaxLength(50);
            e.Property(x => x.Name).HasMaxLength(256);
            e.Property(x => x.ColorCode).HasMaxLength(16);
            e.HasIndex(x => x.Code).IsUnique();
        });

        builder.Entity<ClassTimetable>(e =>
        {
            e.Property(x => x.Room).HasMaxLength(64);
            e.HasOne(x => x.SchoolYear).WithMany().HasForeignKey(x => x.SchoolYearId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Class).WithMany().HasForeignKey(x => x.ClassId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Subject).WithMany().HasForeignKey(x => x.SubjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.SetNull);
            // Mỗi (lớp, năm học, thứ, tiết) tối đa một tiết. Check trùng GV/phòng làm thêm ở controller.
            e.HasIndex(x => new { x.ClassId, x.SchoolYearId, x.DayOfWeek, x.SlotNo }).IsUnique();
        });

        builder.Entity<HealthReport>(e =>
        {
            e.Property(x => x.Height).HasColumnType("numeric(5,2)");
            e.Property(x => x.Weight).HasColumnType("numeric(5,2)");
            e.Property(x => x.Temperature).HasColumnType("numeric(4,1)");
            e.Property(x => x.BloodPressure).HasMaxLength(20);
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.StudentId, x.ReportDate });
        });

        builder.Entity<ExternalSubject>(e =>
        {
            e.Property(x => x.Code).HasMaxLength(50);
            e.Property(x => x.Name).HasMaxLength(256);
            e.Property(x => x.FeeAmount).HasColumnType("numeric(18,2)");
            e.HasIndex(x => x.Code).IsUnique();
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.TeacherId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<StudentExternalSubject>(e =>
        {
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ExternalSubject).WithMany().HasForeignKey(x => x.ExternalSubjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.CollectedByUserId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.StudentId, x.ExternalSubjectId });
        });

        builder.Entity<StudentLeaveRequest>(e =>
        {
            e.Property(x => x.AttachmentUrl).HasMaxLength(512);
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.RequestedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.ApprovedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.StudentId, x.FromDate });
        });

        builder.Entity<StaffLeaveRequest>(e =>
        {
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.StaffUserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.ReviewedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.StaffUserId, x.FromDate });
        });
    }
}
