using Microsoft.EntityFrameworkCore;
using QuangTrung.Domain.Entities;
using QuangTrung.Domain.Enums;
using QuangTrung.Infrastructure.Persistence;

namespace QuangTrung.Infrastructure;

/// <summary>
/// Seed dữ liệu trưng bày (demo) cho HẦU HẾT chức năng để các trang không bị trống:
/// lớp/khối, học sinh, điểm danh, môn học + thời khóa biểu, sức khỏe, môn năng khiếu + đăng ký,
/// đơn nghỉ phép học sinh/nhân viên, thông báo, và khoản phải thu (fee structure + assignment).
///
/// KHÔNG seed: tài khoản người dùng (dùng lại 5 tài khoản demo có sẵn) và giao dịch
/// (Payment / hóa đơn / ZaloPay). Mọi khối đều idempotent — chạy lại không nhân đôi dữ liệu.
/// Ngày điểm danh/sức khỏe neo theo "hôm nay" (giờ VN) để trang mặc định theo ngày có sẵn dữ liệu.
/// </summary>
public static class ShowcaseDataSeeder
{
    public static async Task EnsureShowcaseDataAsync(ApplicationDbContext db, CancellationToken ct = default)
    {
        var year = await db.SchoolYears.AsNoTracking()
            .OrderByDescending(y => y.IsCurrent).ThenByDescending(y => y.StartDate)
            .FirstOrDefaultAsync(ct);
        if (year is null)
            return;

        // Tài khoản demo sẵn có (không tạo mới) — lấy id để gán người tạo/duyệt/giáo viên.
        var emails = new[] { "superadmin@demo.local", "bangiamhieu@demo.local", "giaovien@demo.local", "ketoan@demo.local", "phuhuynh@demo.local" };
        var users = await db.Users.AsNoTracking()
            .Where(u => emails.Contains(u.Email))
            .Select(u => new { u.Id, u.Email })
            .ToListAsync(ct);
        Guid UserId(string email) => users.FirstOrDefault(u => u.Email == email)?.Id ?? Guid.Empty;

        var teacherId = UserId("giaovien@demo.local");
        var parentId = UserId("phuhuynh@demo.local");
        var bghId = UserId("bangiamhieu@demo.local");
        var ketoanId = UserId("ketoan@demo.local");
        var publisherId = bghId != Guid.Empty ? bghId : teacherId;
        Guid? teacherRef = teacherId == Guid.Empty ? (Guid?)null : teacherId;

        var now = DateTime.UtcNow;
        var todayVn = DateOnly.FromDateTime(now.AddHours(7));
        var rnd = new Random(20260706);

        // ---- Khối (Grade): tạo theo tên nếu chưa có ----
        async Task<Grade> EnsureGrade(string name, int sort)
        {
            var g = await db.Grades.FirstOrDefaultAsync(x => x.Name == name && !x.IsDeleted, ct);
            if (g is not null) return g;
            g = new Grade { Id = Guid.NewGuid(), Name = name, SortOrder = sort, CreatedAt = now };
            db.Grades.Add(g);
            await db.SaveChangesAsync(ct);
            return g;
        }

        var gradeMam = await EnsureGrade("Mầm (3-4 tuổi)", 2);
        var gradeChoi = await EnsureGrade("Chồi (4-5 tuổi)", 3);
        var gradeLa = await EnsureGrade("Lá (5-6 tuổi)", 4);

        // ---- Lớp: dùng lại lớp có sẵn + bổ sung cho đủ ~3 lớp ----
        async Task<SchoolClass> EnsureClass(string name, Guid gradeId)
        {
            var c = await db.Classes.FirstOrDefaultAsync(x => x.Name == name && x.SchoolYearId == year.Id && !x.IsDeleted, ct);
            if (c is not null) return c;
            c = new SchoolClass
            {
                Id = Guid.NewGuid(),
                SchoolYearId = year.Id,
                GradeId = gradeId,
                Name = name,
                HomeroomTeacherId = teacherRef,
                Capacity = 30,
                CreatedAt = now
            };
            db.Classes.Add(c);
            await db.SaveChangesAsync(ct);
            return c;
        }

        var classA = await db.Classes.FirstOrDefaultAsync(c => c.SchoolYearId == year.Id && !c.IsDeleted, ct)
                     ?? await EnsureClass("Lớp Chồi A", gradeChoi.Id);
        var classB = await EnsureClass("Lớp Mầm B", gradeMam.Id);
        var classC = await EnsureClass("Lớp Lá C", gradeLa.Id);
        var classes = new[] { classA, classB, classC };

        // ---- Học sinh: thêm theo mã đăng ký (idempotent), rải đều 3 lớp ----
        var kids = new (string Name, Gender G, int Y, int M, int D, string? Health, string? Allergy)[]
        {
            ("Nguyễn Minh Anh", Gender.Female, 2020, 2, 12, null, null),
            ("Trần Gia Bảo", Gender.Male, 2020, 6, 3, null, "Dị ứng hải sản"),
            ("Lê Hoàng Long", Gender.Male, 2021, 1, 22, null, null),
            ("Phạm Ngọc Diệp", Gender.Female, 2021, 4, 8, "Hen suyễn nhẹ", null),
            ("Vũ Đức Duy", Gender.Male, 2020, 9, 15, null, null),
            ("Đặng Thảo Vy", Gender.Female, 2021, 3, 30, null, "Dị ứng đậu phộng"),
            ("Bùi Quang Huy", Gender.Male, 2020, 11, 5, null, null),
            ("Hoàng Bảo Ngọc", Gender.Female, 2021, 7, 18, null, null),
            ("Đỗ Nhật Nam", Gender.Male, 2020, 5, 26, null, null),
            ("Ngô Khánh Chi", Gender.Female, 2021, 2, 14, null, null),
            ("Dương Tuấn Kiệt", Gender.Male, 2020, 8, 9, null, null),
            ("Lý Phương Linh", Gender.Female, 2021, 10, 2, null, null),
            ("Phan Gia Hân", Gender.Female, 2020, 12, 20, null, null),
            ("Trịnh Bá Đạt", Gender.Male, 2021, 5, 11, null, null),
            ("Cao Mỹ Duyên", Gender.Female, 2020, 3, 7, null, null),
            ("Đinh Hải Đăng", Gender.Male, 2021, 6, 25, null, null),
            ("Tô Thanh Trúc", Gender.Female, 2020, 10, 16, null, null),
            ("Hồ Minh Khoa", Gender.Male, 2021, 1, 4, null, null),
            ("Mai Ngọc Lan", Gender.Female, 2020, 7, 29, null, null),
            ("Chu Đình Phong", Gender.Male, 2021, 9, 13, null, null),
            ("Nguyễn Bảo Trâm", Gender.Female, 2020, 4, 21, null, null),
            ("Trần Quốc Huy", Gender.Male, 2021, 11, 6, null, null),
            ("Lê Khánh Vân", Gender.Female, 2020, 6, 17, null, null),
            ("Võ Anh Tuấn", Gender.Male, 2021, 8, 1, null, null),
        };

        var existingCodes = await db.Students.AsNoTracking()
            .Where(s => s.RegistrationCode != null)
            .Select(s => s.RegistrationCode!)
            .ToListAsync(ct);
        var codeSet = new HashSet<string>(existingCodes);

        for (var i = 0; i < kids.Length; i++)
        {
            var code = $"QT-2025-{100 + i}";
            if (codeSet.Contains(code))
                continue;
            var k = kids[i];
            var sid = Guid.NewGuid();
            db.Students.Add(new Student
            {
                Id = sid,
                FullName = k.Name,
                Gender = k.G,
                DateOfBirth = new DateOnly(k.Y, k.M, k.D),
                RegistrationCode = code,
                HealthNote = k.Health,
                AllergyNote = k.Allergy,
                Status = StudentStatus.DangHoc,
                CreatedAt = now
            });
            db.StudentClassAssignments.Add(new StudentClassAssignment
            {
                Id = Guid.NewGuid(),
                StudentId = sid,
                ClassId = classes[i % classes.Length].Id,
                SchoolYearId = year.Id,
                FromDate = new DateOnly(2025, 9, 1),
                CreatedAt = now
            });
        }
        await db.SaveChangesAsync(ct);

        // Danh sách học sinh đang học kèm lớp — nguồn cho điểm danh/sức khỏe/nghỉ phép/năng khiếu/phí.
        var roster = await (
            from a in db.StudentClassAssignments.AsNoTracking()
            where a.ToDate == null
            join s in db.Students.AsNoTracking() on a.StudentId equals s.Id
            where !s.IsDeleted
            select new { StudentId = s.Id, a.ClassId, s.FullName })
            .ToListAsync(ct);

        // ---- Môn học chính khóa (danh mục) ----
        var subjectDefs = new (string Code, string Name, string Color)[]
        {
            ("KPKH", "Khám phá khoa học", "#0EA5E9"),
            ("LQVT", "Làm quen với Toán", "#6366F1"),
            ("LQCC", "Làm quen chữ cái", "#F59E0B"),
            ("AMN", "Âm nhạc", "#EC4899"),
            ("TAOHINH", "Tạo hình", "#10B981"),
            ("THECHAT", "Thể chất", "#EF4444"),
            ("KNS", "Kỹ năng sống", "#8B5CF6"),
        };
        var existingSubjectCodes = await db.Subjects.AsNoTracking().Select(s => s.Code).ToListAsync(ct);
        var subjCodeSet = new HashSet<string>(existingSubjectCodes);
        foreach (var s in subjectDefs)
        {
            if (subjCodeSet.Contains(s.Code)) continue;
            db.Subjects.Add(new Subject
            {
                Id = Guid.NewGuid(),
                Code = s.Code,
                Name = s.Name,
                ColorCode = s.Color,
                IsActive = true,
                CreatedAt = now
            });
        }
        await db.SaveChangesAsync(ct);
        var subjects = await db.Subjects.AsNoTracking().Where(s => !s.IsDeleted).ToListAsync(ct);
        Guid Subj(string code) => subjects.First(s => s.Code == code).Id;

        // ---- Thời khóa biểu: mỗi lớp một lịch T2–T6 (chỉ seed khi chưa có tiết nào) ----
        if (!await db.ClassTimetables.AnyAsync(ct))
        {
            var slotTimes = new (TimeOnly Start, TimeOnly End)[]
            {
                (new TimeOnly(8, 0), new TimeOnly(8, 35)),
                (new TimeOnly(8, 45), new TimeOnly(9, 20)),
                (new TimeOnly(9, 30), new TimeOnly(10, 5)),
            };
            // Mỗi thứ (2..6) có tối đa 3 tiết; chọn môn theo lịch cố định cho gọn.
            var weekly = new (int Day, string[] Codes)[]
            {
                (2, new[] { "KPKH", "AMN", "THECHAT" }),
                (3, new[] { "LQVT", "TAOHINH" }),
                (4, new[] { "LQCC", "AMN", "KNS" }),
                (5, new[] { "KPKH", "LQVT" }),
                (6, new[] { "TAOHINH", "THECHAT", "KNS" }),
            };
            foreach (var c in classes)
            {
                foreach (var day in weekly)
                {
                    for (var slot = 0; slot < day.Codes.Length; slot++)
                    {
                        db.ClassTimetables.Add(new ClassTimetable
                        {
                            Id = Guid.NewGuid(),
                            SchoolYearId = year.Id,
                            ClassId = c.Id,
                            DayOfWeek = day.Day,
                            SlotNo = slot + 1,
                            SubjectId = Subj(day.Codes[slot]),
                            TeacherId = teacherRef,
                            StartTime = slotTimes[slot].Start,
                            EndTime = slotTimes[slot].End,
                            Room = null,
                            CreatedAt = now
                        });
                    }
                }
            }
            await db.SaveChangesAsync(ct);
        }

        // ---- Điểm danh: ~12 ngày học gần nhất (tính đến hôm nay), mọi học sinh ----
        if (!await db.AttendanceRecords.AnyAsync(ct) && teacherId != Guid.Empty)
        {
            var days = new List<DateOnly>();
            var cursor = todayVn;
            while (days.Count < 12)
            {
                if (cursor.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday))
                    days.Add(cursor);
                cursor = cursor.AddDays(-1);
            }
            foreach (var d in days)
            {
                foreach (var r in roster)
                {
                    var roll = rnd.Next(100);
                    var status = roll < 85 ? AttendanceStatus.CoMat
                        : roll < 92 ? AttendanceStatus.Vang
                        : roll < 97 ? AttendanceStatus.Muon
                        : AttendanceStatus.NghiCoPhep;
                    string? reason = status switch
                    {
                        AttendanceStatus.Vang => "Nghỉ không phép",
                        AttendanceStatus.Muon => "Đến muộn",
                        AttendanceStatus.NghiCoPhep => "Nghỉ ốm có phép",
                        _ => null
                    };
                    db.AttendanceRecords.Add(new AttendanceRecord
                    {
                        Id = Guid.NewGuid(),
                        StudentId = r.StudentId,
                        ClassId = r.ClassId,
                        Date = d,
                        Status = status,
                        Reason = reason,
                        RecordedByUserId = teacherId,
                        RecordedAt = now
                    });
                }
            }
            await db.SaveChangesAsync(ct);
        }

        // ---- Sức khỏe: 1 bản ghi/học sinh cho ~2/3 số học sinh ----
        if (!await db.HealthReports.AnyAsync(ct) && publisherId != Guid.Empty)
        {
            var idx = 0;
            foreach (var r in roster)
            {
                idx++;
                if (idx % 3 == 0) continue; // bỏ bớt để không phải ai cũng có
                var temp = 36.4m + (decimal)(rnd.Next(0, 15)) / 10m; // 36.4 – 37.8
                var hasSymptom = temp > 37.4m;
                db.HealthReports.Add(new HealthReport
                {
                    Id = Guid.NewGuid(),
                    StudentId = r.StudentId,
                    ReportDate = todayVn.AddDays(-rnd.Next(0, 10)),
                    Height = 95m + rnd.Next(0, 25),
                    Weight = 14m + (decimal)(rnd.Next(0, 90)) / 10m,
                    Temperature = temp,
                    HeartRate = 90 + rnd.Next(0, 25),
                    BloodPressure = null,
                    Symptoms = hasSymptom ? "Sốt nhẹ, ho" : null,
                    Diagnosis = hasSymptom ? "Cảm cúm thông thường" : "Sức khỏe bình thường",
                    Medication = hasSymptom ? "Hạ sốt theo cân nặng" : null,
                    DoctorNote = null,
                    ParentNotified = hasSymptom,
                    CreatedByUserId = publisherId,
                    CreatedAt = now
                });
            }
            await db.SaveChangesAsync(ct);
        }

        // ---- Môn năng khiếu (danh mục) ----
        var extDefs = new (string Code, string Name, decimal Fee, int Max)[]
        {
            ("SWIM", "Bơi lội", 300_000m, 20),
            ("DANCE", "Múa", 250_000m, 25),
            ("ENGLISH_CLUB", "Tiếng Anh tăng cường", 400_000m, 30),
            ("VOVINAM", "Võ Vovinam", 200_000m, 20),
            ("PIANO", "Piano", 500_000m, 12),
        };
        var existingExtCodes = await db.ExternalSubjects.AsNoTracking().Select(e => e.Code).ToListAsync(ct);
        var extCodeSet = new HashSet<string>(existingExtCodes);
        foreach (var e in extDefs)
        {
            if (extCodeSet.Contains(e.Code)) continue;
            db.ExternalSubjects.Add(new ExternalSubject
            {
                Id = Guid.NewGuid(),
                Code = e.Code,
                Name = e.Name,
                TeacherId = teacherRef,
                FeeAmount = e.Fee,
                MaxStudents = e.Max,
                IsActive = true,
                CreatedAt = now
            });
        }
        await db.SaveChangesAsync(ct);
        var extSubjects = await db.ExternalSubjects.AsNoTracking().Where(e => !e.IsDeleted).ToListAsync(ct);

        // ---- Đăng ký môn năng khiếu: ~1/2 học sinh, rải các môn, xen kẽ đã đóng/chưa đóng ----
        if (!await db.StudentExternalSubjects.AnyAsync(ct) && extSubjects.Count > 0)
        {
            var idx = 0;
            foreach (var r in roster)
            {
                if (idx % 2 == 0) // một nửa số học sinh có đăng ký
                {
                    var subj = extSubjects[idx % extSubjects.Count];
                    var paid = idx % 3 != 0;
                    db.StudentExternalSubjects.Add(new StudentExternalSubject
                    {
                        Id = Guid.NewGuid(),
                        StudentId = r.StudentId,
                        ExternalSubjectId = subj.Id,
                        EnrollDate = new DateOnly(2025, 9, 15),
                        Status = EnrollmentStatus.Active,
                        PaymentStatus = paid ? FeePaymentStatus.Paid : FeePaymentStatus.Unpaid,
                        PaidAt = paid ? now : (DateTime?)null,
                        CollectedByUserId = paid && ketoanId != Guid.Empty ? ketoanId : (Guid?)null,
                        CreatedAt = now
                    });
                }
                idx++;
            }
            await db.SaveChangesAsync(ct);
        }

        // ---- Đơn nghỉ phép học sinh: vài đơn với trạng thái khác nhau ----
        if (!await db.StudentLeaveRequests.AnyAsync(ct) && roster.Count >= 3)
        {
            var requester = parentId != Guid.Empty ? parentId : teacherId;
            var samples = new (int RosterIdx, int FromOffset, int Days, string Reason, LeaveStatus Status)[]
            {
                (0, 1, 2, "Gia đình về quê có việc", LeaveStatus.Pending),
                (1, -3, 3, "Con bị sốt virus, xin nghỉ theo dõi", LeaveStatus.Approved),
                (2, -7, 1, "Đi khám sức khỏe định kỳ", LeaveStatus.Approved),
                (3 % roster.Count, 5, 2, "Xin nghỉ do lịch cá nhân", LeaveStatus.Rejected),
            };
            foreach (var s in samples)
            {
                var r = roster[s.RosterIdx % roster.Count];
                var from = todayVn.AddDays(s.FromOffset);
                var approved = s.Status is LeaveStatus.Approved or LeaveStatus.Rejected;
                db.StudentLeaveRequests.Add(new StudentLeaveRequest
                {
                    Id = Guid.NewGuid(),
                    StudentId = r.StudentId,
                    FromDate = from,
                    ToDate = from.AddDays(s.Days - 1),
                    Reason = s.Reason,
                    Status = s.Status,
                    RequestedByUserId = requester,
                    ApprovedByUserId = approved ? publisherId : (Guid?)null,
                    ApprovedAt = approved ? now : (DateTime?)null,
                    RejectReason = s.Status == LeaveStatus.Rejected ? "Trùng lịch hoạt động ngoại khóa của lớp" : null,
                    CreatedAt = now
                });
            }
            await db.SaveChangesAsync(ct);
        }

        // ---- Đơn nghỉ phép nhân viên ----
        if (!await db.StaffLeaveRequests.AnyAsync(ct) && teacherId != Guid.Empty)
        {
            void AddStaffLeave(Guid staff, StaffLeaveType type, int fromOffset, int days, string reason, LeaveStatus status)
            {
                if (staff == Guid.Empty) return;
                var from = todayVn.AddDays(fromOffset);
                var reviewed = status is LeaveStatus.Approved or LeaveStatus.Rejected;
                db.StaffLeaveRequests.Add(new StaffLeaveRequest
                {
                    Id = Guid.NewGuid(),
                    StaffUserId = staff,
                    LeaveType = type,
                    FromDate = from,
                    ToDate = from.AddDays(days - 1),
                    TotalDays = days,
                    Reason = reason,
                    Status = status,
                    ReviewedByUserId = reviewed ? bghId : (Guid?)null,
                    ReviewNote = status == LeaveStatus.Rejected ? "Chưa sắp xếp được giáo viên thay lớp" : null,
                    ReviewedAt = reviewed ? now : (DateTime?)null,
                    CreatedAt = now
                });
            }
            AddStaffLeave(teacherId, StaffLeaveType.NghiBenh, -2, 2, "Bị cảm, xin nghỉ hồi phục", LeaveStatus.Approved);
            AddStaffLeave(teacherId, StaffLeaveType.ViecRieng, 6, 1, "Giải quyết việc gia đình", LeaveStatus.Pending);
            AddStaffLeave(ketoanId, StaffLeaveType.PhepNam, 10, 3, "Nghỉ phép năm", LeaveStatus.Pending);
            await db.SaveChangesAsync(ct);
        }

        // ---- Thông báo: bổ sung theo tiêu đề (idempotent) ----
        var annDefs = new (string Title, string Body, AnnouncementScope Scope, Guid? ClassId)[]
        {
            ("Lịch nghỉ lễ và hoạt động tháng", "Nhà trường thông báo lịch hoạt động và các buổi ngoại khóa trong tháng tới.", AnnouncementScope.ToanTruong, null),
            ("Nhắc đóng học phí đầu tháng", "Kính đề nghị quý phụ huynh hoàn tất học phí trong tuần đầu tháng.", AnnouncementScope.ToanTruong, null),
            ($"Họp phụ huynh {classA.Name}", $"Mời phụ huynh {classA.Name} tham dự buổi họp cuối tuần này.", AnnouncementScope.TheoLop, classA.Id),
        };
        var existingTitles = await db.Announcements.AsNoTracking().Select(a => a.Title).ToListAsync(ct);
        var titleSet = new HashSet<string>(existingTitles);
        foreach (var a in annDefs)
        {
            if (titleSet.Contains(a.Title)) continue;
            db.Announcements.Add(new Announcement
            {
                Id = Guid.NewGuid(),
                Title = a.Title,
                Body = a.Body,
                Scope = a.Scope,
                ClassId = a.ClassId,
                Status = AnnouncementStatus.Published,
                PublishedAt = now,
                CreatedByUserId = publisherId,
                CreatedAt = now
            });
        }
        await db.SaveChangesAsync(ct);

        // Seed default FeeCategories if none exist in ShowcaseDataSeeder
        var catHocPhi = await db.FeeCategories.FirstOrDefaultAsync(x => x.Name == "Học phí", ct);
        if (catHocPhi is null)
        {
            catHocPhi = new FeeCategory { Id = Guid.NewGuid(), Name = "Học phí", Description = "Khoản học phí chính quy", CreatedAt = now };
            db.FeeCategories.Add(catHocPhi);
        }
        var catTienAn = await db.FeeCategories.FirstOrDefaultAsync(x => x.Name == "Tiền ăn", ct);
        if (catTienAn is null)
        {
            catTienAn = new FeeCategory { Id = Guid.NewGuid(), Name = "Tiền ăn", Description = "Tiền ăn bán trú của học sinh", CreatedAt = now };
            db.FeeCategories.Add(catTienAn);
        }
        var catKhac = await db.FeeCategories.FirstOrDefaultAsync(x => x.Name == "Khác", ct);
        if (catKhac is null)
        {
            catKhac = new FeeCategory { Id = Guid.NewGuid(), Name = "Khác", Description = "Các khoản phụ phí khác", CreatedAt = now };
            db.FeeCategories.Add(catKhac);
        }
        await db.SaveChangesAsync(ct);

        async Task<FeeStructure> EnsureFee(string name, decimal amount, FeeType type, Guid feeCategoryId)
        {
            var f = await db.FeeStructures.FirstOrDefaultAsync(x => x.Name == name && x.SchoolYearId == year.Id, ct);
            if (f is not null)
            {
                if (f.FeeCategoryId == null)
                {
                    f.FeeCategoryId = feeCategoryId;
                    await db.SaveChangesAsync(ct);
                }
                return f;
            }
            f = new FeeStructure { Id = Guid.NewGuid(), SchoolYearId = year.Id, Name = name, Amount = amount, FeeType = type, FeeCategoryId = feeCategoryId, CreatedAt = now };
            db.FeeStructures.Add(f);
            await db.SaveChangesAsync(ct);
            return f;
        }

        var feeHocPhi = await EnsureFee("Học phí tháng", 500_000m, FeeType.HocPhi, catHocPhi.Id);
        var feeTienAn = await EnsureFee("Tiền ăn tháng", 660_000m, FeeType.TienAn, catTienAn.Id);
        var feeBanTru = await EnsureFee("Phí bán trú", 200_000m, FeeType.Khac, catKhac.Id);

        var existingAssign = await db.StudentFeeAssignments.AsNoTracking()
            .Select(a => new { a.StudentId, a.FeeStructureId, a.Month })
            .ToListAsync(ct);
        var assignKeys = new HashSet<string>(existingAssign.Select(a => $"{a.StudentId}|{a.FeeStructureId}|{a.Month}"));
        var feeList = new[] { feeHocPhi, feeTienAn, feeBanTru };
        var months = new[] { 9, 10, 11 };
        foreach (var r in roster)
        {
            foreach (var m in months)
            {
                foreach (var f in feeList)
                {
                    var key = $"{r.StudentId}|{f.Id}|{m}";
                    if (assignKeys.Contains(key)) continue;
                    assignKeys.Add(key);
                    db.StudentFeeAssignments.Add(new StudentFeeAssignment
                    {
                        Id = Guid.NewGuid(),
                        StudentId = r.StudentId,
                        SchoolYearId = year.Id,
                        FeeStructureId = f.Id,
                        Month = m,
                        AmountOverride = null,
                        CreatedAt = now
                    });
                }
            }
        }
        await db.SaveChangesAsync(ct);

        // ---- Thực đơn ĐÃ CÔNG BỐ cho vài ngày học (để trang thực đơn + cổng phụ huynh có dữ liệu) ----
        var dishes = await db.Dishes.AsNoTracking().Where(d => !d.IsDeleted).ToListAsync(ct);
        if (dishes.Count > 0 && publisherId != Guid.Empty)
        {
            Dish? Find(string name) => dishes.FirstOrDefault(d => d.Name == name);
            DailyMenuItem Snapshot(Dish? d, int order) => new()
            {
                Id = Guid.NewGuid(),
                DishId = d?.Id,
                DishName = d?.Name ?? "Món",
                Ingredients = d?.Ingredients,
                NutritionNote = d?.NutritionNote,
                CaloriesKcal = d?.CaloriesKcal,
                ContainsAllergen = d?.ContainsAllergen ?? false,
                AllergenNote = d?.AllergenNote,
                DisplayOrder = order
            };

            // 4 ngày học gần nhất (gồm hôm nay) + 1 ngày học kế tiếp.
            var menuDays = new List<DateOnly>();
            var back = todayVn;
            while (menuDays.Count < 4)
            {
                if (back.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday))
                    menuDays.Add(back);
                back = back.AddDays(-1);
            }
            var fwd = todayVn.AddDays(1);
            while (fwd.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                fwd = fwd.AddDays(1);
            menuDays.Add(fwd);

            foreach (var d in menuDays)
            {
                foreach (var meal in new[] { MealType.BuaSang, MealType.BuaTrua })
                {
                    if (await db.DailyMenus.AnyAsync(m => m.MenuDate == d && m.MealType == meal && m.ClassId == null, ct))
                        continue;
                    var items = meal == MealType.BuaSang
                        ? new List<DailyMenuItem> { Snapshot(Find("Cháo thịt bằm rau củ"), 0), Snapshot(Find("Sữa tươi tiệt trùng"), 1) }
                        : new List<DailyMenuItem> { Snapshot(Find("Cơm trắng"), 0), Snapshot(Find("Thịt kho trứng cút"), 1), Snapshot(Find("Canh rau ngót nấu thịt"), 2), Snapshot(Find("Dưa hấu tráng miệng"), 3) };
                    db.DailyMenus.Add(new DailyMenu
                    {
                        Id = Guid.NewGuid(),
                        MenuDate = d,
                        MealType = meal,
                        ClassId = null,
                        SchoolYearId = year.Id,
                        Description = meal == MealType.BuaSang ? "Bữa sáng dinh dưỡng, dễ tiêu hóa." : "Bữa trưa đầy đủ 4 nhóm chất.",
                        Status = MenuStatus.Published,
                        ApprovedByUserId = publisherId,
                        ApprovedAt = now,
                        CreatedByUserId = publisherId,
                        CreatedAt = now,
                        Items = items
                    });
                }
            }
            await db.SaveChangesAsync(ct);
        }
    }
}
