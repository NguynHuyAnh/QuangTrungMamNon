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
    public DbSet<Timetable> Timetables => Set<Timetable>();

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

        builder.Entity<Timetable>(e =>
{
    e.ToTable("Timetables");

    e.Property(x => x.Subject)
        .HasMaxLength(128);

    e.HasIndex(x => new
    {
        x.ClassId,
        x.DayOfWeek,
        x.Period
    }).IsUnique();
});
    }
}
