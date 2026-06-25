using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuangTrung.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSchoolFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ===== Thực đơn: thêm trạng thái duyệt (mặc định Published cho dữ liệu cũ) =====
            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "DailyMenus",
                type: "integer",
                nullable: false,
                defaultValue: 2);

            migrationBuilder.AddColumn<Guid>(
                name: "ApprovedByUserId",
                table: "DailyMenus",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "DailyMenus",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DailyMenus_ApprovedByUserId",
                table: "DailyMenus",
                column: "ApprovedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_DailyMenus_AspNetUsers_ApprovedByUserId",
                table: "DailyMenus",
                column: "ApprovedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // ===== Danh mục môn học chính khóa =====
            migrationBuilder.CreateTable(
                name: "Subjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ColorCode = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subjects", x => x.Id);
                });

            // ===== Môn năng khiếu (ngoài giờ) =====
            migrationBuilder.CreateTable(
                name: "ExternalSubjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    TeacherId = table.Column<Guid>(type: "uuid", nullable: true),
                    FeeAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    MaxStudents = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Note = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalSubjects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExternalSubjects_AspNetUsers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            // ===== Báo cáo sức khỏe =====
            migrationBuilder.CreateTable(
                name: "HealthReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReportDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Height = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    Weight = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    Temperature = table.Column<decimal>(type: "numeric(4,1)", nullable: true),
                    HeartRate = table.Column<int>(type: "integer", nullable: true),
                    BloodPressure = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Symptoms = table.Column<string>(type: "text", nullable: true),
                    Diagnosis = table.Column<string>(type: "text", nullable: true),
                    Medication = table.Column<string>(type: "text", nullable: true),
                    DoctorNote = table.Column<string>(type: "text", nullable: true),
                    ParentNotified = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HealthReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HealthReports_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HealthReports_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ===== Đơn nghỉ phép học sinh =====
            migrationBuilder.CreateTable(
                name: "StudentLeaveRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ToDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    AttachmentUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RequestedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ApprovedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectReason = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentLeaveRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudentLeaveRequests_AspNetUsers_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentLeaveRequests_AspNetUsers_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentLeaveRequests_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ===== Đơn nghỉ phép giáo viên/nhân viên =====
            migrationBuilder.CreateTable(
                name: "StaffLeaveRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LeaveType = table.Column<int>(type: "integer", nullable: false),
                    FromDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ToDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TotalDays = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewNote = table.Column<string>(type: "text", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffLeaveRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StaffLeaveRequests_AspNetUsers_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StaffLeaveRequests_AspNetUsers_StaffUserId",
                        column: x => x.StaffUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ===== Thời khóa biểu (tham chiếu Subjects) =====
            migrationBuilder.CreateTable(
                name: "ClassTimetables",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClassId = table.Column<Guid>(type: "uuid", nullable: false),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    SlotNo = table.Column<int>(type: "integer", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeacherId = table.Column<Guid>(type: "uuid", nullable: true),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    Room = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Note = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassTimetables", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassTimetables_AspNetUsers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ClassTimetables_Classes_ClassId",
                        column: x => x.ClassId,
                        principalTable: "Classes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClassTimetables_SchoolYears_SchoolYearId",
                        column: x => x.SchoolYearId,
                        principalTable: "SchoolYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClassTimetables_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // ===== Bảng nối học sinh ↔ môn năng khiếu =====
            migrationBuilder.CreateTable(
                name: "StudentExternalSubjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExternalSubjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    EnrollDate = table.Column<DateOnly>(type: "date", nullable: false),
                    WithdrawDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PaymentStatus = table.Column<int>(type: "integer", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CollectedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentExternalSubjects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudentExternalSubjects_AspNetUsers_CollectedByUserId",
                        column: x => x.CollectedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StudentExternalSubjects_ExternalSubjects_ExternalSubjectId",
                        column: x => x.ExternalSubjectId,
                        principalTable: "ExternalSubjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentExternalSubjects_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ===== Indexes =====
            migrationBuilder.CreateIndex(
                name: "IX_Subjects_Code",
                table: "Subjects",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalSubjects_Code",
                table: "ExternalSubjects",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalSubjects_TeacherId",
                table: "ExternalSubjects",
                column: "TeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_HealthReports_CreatedByUserId",
                table: "HealthReports",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_HealthReports_StudentId_ReportDate",
                table: "HealthReports",
                columns: new[] { "StudentId", "ReportDate" });

            migrationBuilder.CreateIndex(
                name: "IX_StudentLeaveRequests_ApprovedByUserId",
                table: "StudentLeaveRequests",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentLeaveRequests_RequestedByUserId",
                table: "StudentLeaveRequests",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentLeaveRequests_StudentId_FromDate",
                table: "StudentLeaveRequests",
                columns: new[] { "StudentId", "FromDate" });

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveRequests_ReviewedByUserId",
                table: "StaffLeaveRequests",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveRequests_StaffUserId_FromDate",
                table: "StaffLeaveRequests",
                columns: new[] { "StaffUserId", "FromDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ClassTimetables_ClassId_SchoolYearId_DayOfWeek_SlotNo",
                table: "ClassTimetables",
                columns: new[] { "ClassId", "SchoolYearId", "DayOfWeek", "SlotNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClassTimetables_SchoolYearId",
                table: "ClassTimetables",
                column: "SchoolYearId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassTimetables_SubjectId",
                table: "ClassTimetables",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassTimetables_TeacherId",
                table: "ClassTimetables",
                column: "TeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentExternalSubjects_CollectedByUserId",
                table: "StudentExternalSubjects",
                column: "CollectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentExternalSubjects_ExternalSubjectId",
                table: "StudentExternalSubjects",
                column: "ExternalSubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentExternalSubjects_StudentId_ExternalSubjectId",
                table: "StudentExternalSubjects",
                columns: new[] { "StudentId", "ExternalSubjectId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ClassTimetables");
            migrationBuilder.DropTable(name: "HealthReports");
            migrationBuilder.DropTable(name: "StudentExternalSubjects");
            migrationBuilder.DropTable(name: "StudentLeaveRequests");
            migrationBuilder.DropTable(name: "StaffLeaveRequests");
            migrationBuilder.DropTable(name: "ExternalSubjects");
            migrationBuilder.DropTable(name: "Subjects");

            migrationBuilder.DropForeignKey(
                name: "FK_DailyMenus_AspNetUsers_ApprovedByUserId",
                table: "DailyMenus");
            migrationBuilder.DropIndex(
                name: "IX_DailyMenus_ApprovedByUserId",
                table: "DailyMenus");
            migrationBuilder.DropColumn(name: "Status", table: "DailyMenus");
            migrationBuilder.DropColumn(name: "ApprovedByUserId", table: "DailyMenus");
            migrationBuilder.DropColumn(name: "ApprovedAt", table: "DailyMenus");
        }
    }
}
