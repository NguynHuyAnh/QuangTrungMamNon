using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using QuangTrung.Application.Constants;
using QuangTrung.Domain.Entities;
using QuangTrung.Domain.Enums;
using QuangTrung.Infrastructure.Identity;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Infrastructure;

public static class DataSeeder
{
    private const string DemoPassword = "Demo@123";

    public static async Task SeedAsync(IServiceProvider services, bool applyMigrations = true, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;
        var logger = provider.GetRequiredService<ILoggerFactory>().CreateLogger("DataSeeder");
        var roleManager = provider.GetRequiredService<RoleManager<ApplicationRole>>();
        var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var db = provider.GetRequiredService<ApplicationDbContext>();

        if (applyMigrations)
            await db.Database.MigrateAsync(ct);
        else
            await db.Database.EnsureCreatedAsync(ct);

        foreach (var r in AppRoles.All)
        {
            if (await roleManager.RoleExistsAsync(r))
                continue;
            var res = await roleManager.CreateAsync(new ApplicationRole { Name = r });
            if (!res.Succeeded)
                logger.LogWarning("Role {Role} create failed: {Errors}", r, string.Join(",", res.Errors.Select(e => e.Description)));
        }

        async Task EnsureUser(string email, string fullName, string role)
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user is not null)
                return;
            user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                Email = email,
                UserName = email,
                NormalizedEmail = email.ToUpperInvariant(),
                NormalizedUserName = email.ToUpperInvariant(),
                EmailConfirmed = true,
                FullName = fullName,
                SecurityStamp = Guid.NewGuid().ToString("D")
            };
            var create = await userManager.CreateAsync(user, DemoPassword);
            if (!create.Succeeded)
            {
                logger.LogWarning("User {Email} create failed: {Errors}", email, string.Join(",", create.Errors.Select(e => e.Description)));
                return;
            }
            var addRole = await userManager.AddToRoleAsync(user, role);
            if (!addRole.Succeeded)
                logger.LogWarning("User {Email} role {Role} failed: {Errors}", email, role, string.Join(",", addRole.Errors.Select(e => e.Description)));
        }

        await EnsureUser("superadmin@demo.local", "Super Admin", AppRoles.SuperAdmin);
        await EnsureUser("bangiamhieu@demo.local", "Ban Giám Hiệu", AppRoles.BanGiamHieu);
        await EnsureUser("giaovien@demo.local", "Giáo Viên", AppRoles.GiaoVien);
        await EnsureUser("ketoan@demo.local", "Kế Toán", AppRoles.KeToan);
        await EnsureUser("phuhuynh@demo.local", "Phụ Huynh", AppRoles.PhuHuynh);

        if (!await db.SchoolYears.AnyAsync(ct))
        {
            var yearId = Guid.NewGuid();
            var gradeId = Guid.NewGuid();
            var classId = Guid.NewGuid();
            var studentId = Guid.NewGuid();
            var teacher = await userManager.FindByEmailAsync("giaovien@demo.local");
            var parent = await userManager.FindByEmailAsync("phuhuynh@demo.local");
            var bgh = await userManager.FindByEmailAsync("bangiamhieu@demo.local");
            var publisherId = bgh?.Id ?? teacher?.Id ?? Guid.Empty;

            db.SchoolYears.Add(new SchoolYear
            {
                Id = yearId,
                Name = "2025-2026",
                StartDate = new DateOnly(2025, 9, 1),
                EndDate = new DateOnly(2026, 6, 30),
                IsCurrent = true,
                CreatedAt = DateTime.UtcNow
            });
            db.Grades.Add(new Grade
            {
                Id = gradeId,
                Name = "Mẫu giá",
                SortOrder = 1,
                CreatedAt = DateTime.UtcNow
            });
            db.Classes.Add(new SchoolClass
            {
                Id = classId,
                SchoolYearId = yearId,
                GradeId = gradeId,
                Name = "MG 4 tuổi A",
                HomeroomTeacherId = teacher?.Id,
                Capacity = 30,
                CreatedAt = DateTime.UtcNow
            });
            db.Students.Add(new Student
            {
                Id = studentId,
                FullName = "Nguyễn Văn Bé",
                RegistrationCode = "QT-2025-001",
                Gender = Gender.Male,
                DateOfBirth = new DateOnly(2021, 5, 10),
                Status = StudentStatus.DangHoc,
                CreatedAt = DateTime.UtcNow
            });
            db.StudentClassAssignments.Add(new StudentClassAssignment
            {
                Id = Guid.NewGuid(),
                StudentId = studentId,
                ClassId = classId,
                SchoolYearId = yearId,
                FromDate = new DateOnly(2025, 9, 1),
                CreatedAt = DateTime.UtcNow
            });

            if (parent is not null)
            {
                db.UserStudentLinks.Add(new UserStudentLink
                {
                    Id = Guid.NewGuid(),
                    UserId = parent.Id,
                    StudentId = studentId,
                    Relationship = "Bố",
                    IsPrimary = true,
                    CreatedAt = DateTime.UtcNow
                });
            }

            var feeId = Guid.NewGuid();
            db.FeeStructures.Add(new FeeStructure
            {
                Id = feeId,
                SchoolYearId = yearId,
                Name = "Học phí tháng",
                Amount = 500_000,
                FeeType = FeeType.HocPhi,
                CreatedAt = DateTime.UtcNow
            });
            db.StudentFeeAssignments.Add(new StudentFeeAssignment
            {
                Id = Guid.NewGuid(),
                StudentId = studentId,
                SchoolYearId = yearId,
                FeeStructureId = feeId,
                Month = 9,
                AmountOverride = null,
                CreatedAt = DateTime.UtcNow
            });
            db.Announcements.Add(new Announcement
            {
                Id = Guid.NewGuid(),
                Title = "Khai giảng năm học mới",
                Body = "Thông báo toàn trường.",
                Scope = AnnouncementScope.ToanTruong,
                ClassId = null,
                Status = AnnouncementStatus.Published,
                PublishedAt = DateTime.UtcNow,
                CreatedByUserId = publisherId,
                CreatedAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync(ct);
        }

        await EnsureExtraDemoData(db, ct);
        await RemoveDemoStudentLeVanTimKiem(db, ct);
        await EnsureStudentRegistrationCodes(db, ct);
    }

    /// <summary>Xóa học sinh demo từng dùng cho test tiền tố ID — tránh fee/thanh toán thử làm phiền production demo.</summary>
    private static async Task RemoveDemoStudentLeVanTimKiem(ApplicationDbContext db, CancellationToken ct)
    {
        var le = await db.Students.FirstOrDefaultAsync(s => s.FullName == "Lê Văn Tìm Kiếm" && !s.IsDeleted, ct);
        if (le is null)
            return;

        var zalo = await db.ZaloPayOrders.Where(z => z.StudentId == le.Id).ToListAsync(ct);
        if (zalo.Count > 0)
            db.ZaloPayOrders.RemoveRange(zalo);

        db.Students.Remove(le);
        await db.SaveChangesAsync(ct);
    }

    private static async Task EnsureStudentRegistrationCodes(ApplicationDbContext db, CancellationToken ct)
    {
        var be = await db.Students.FirstOrDefaultAsync(
            s => !s.IsDeleted && s.FullName == "Nguyễn Văn Bé" && s.RegistrationCode == null,
            ct);
        if (be is not null)
        {
            be.RegistrationCode = "QT-2025-001";
            await db.SaveChangesAsync(ct);
        }
    }

    private static async Task EnsureExtraDemoData(ApplicationDbContext db, CancellationToken ct)
    {
        var year = await db.SchoolYears.AsNoTracking().OrderByDescending(y => y.StartDate).FirstOrDefaultAsync(ct);
        if (year is null)
            return;

        var classEntity = await db.Classes.AsNoTracking().FirstOrDefaultAsync(c => c.SchoolYearId == year.Id && !c.IsDeleted, ct);
        if (classEntity is null)
            return;

        if (!await db.Students.AnyAsync(s => s.FullName.Contains("Trần Thị") && !s.IsDeleted, ct))
        {
            var s2 = Guid.NewGuid();
            db.Students.Add(new Student
            {
                Id = s2,
                FullName = "Trần Thị Mai",
                Gender = Gender.Female,
                DateOfBirth = new DateOnly(2020, 3, 15),
                Status = StudentStatus.DangHoc,
                CreatedAt = DateTime.UtcNow
            });
            db.StudentClassAssignments.Add(new StudentClassAssignment
            {
                Id = Guid.NewGuid(),
                StudentId = s2,
                ClassId = classEntity.Id,
                SchoolYearId = year.Id,
                FromDate = new DateOnly(2025, 9, 1),
                CreatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync(ct);
    }
}
