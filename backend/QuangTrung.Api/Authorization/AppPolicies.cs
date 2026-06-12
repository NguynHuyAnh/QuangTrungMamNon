namespace QuangTrung.Api.Authorization;

/// <summary>Policy names for role-based authorization.</summary>
public static class AppPolicies
{
    public const string AuthenticatedOnly = "Authenticated";

    public const string CatalogRead = "Catalog.Read";
    public const string CatalogWrite = "Catalog.Write";

    public const string ClassesRead = "Classes.Read";
    public const string ClassesWrite = "Classes.Write";

    public const string StudentsReadInternal = "Students.ReadInternal";
    public const string StudentsWrite = "Students.Write";
    public const string StudentsReadOwnChildren = "Students.ReadOwnChildren";
    public const string StudentsBillingRead = "Students.BillingRead";

    public const string AttendanceRead = "Attendance.Read";
    public const string AttendanceWrite = "Attendance.Write";

    public const string AnnouncementsRead = "Announcements.Read";
    public const string AnnouncementsPublishSchool = "Announcements.PublishSchool";
    public const string AnnouncementsClassDraft = "Announcements.ClassDraft";

    public const string FeesRead = "Fees.Read";
    public const string FeesWrite = "Fees.Write";
    /// <summary>Đọc phân công học phí theo học sinh (kế toán + phụ huynh chỉ thấy con liên kết).</summary>
    public const string FeesReadAssignments = "Fees.ReadAssignments";

    public const string PaymentsReadSummary = "Payments.ReadSummary";
    public const string PaymentsWrite = "Payments.Write";
    /// <summary>Tạo đơn ZaloPay: kế toán / superadmin / phụ huynh (chỉ con liên kết).</summary>
    public const string PaymentsZaloPayCreate = "Payments.ZaloPayCreate";

    /// <summary>Xem danh sách tài khoản (BGH + SuperAdmin).</summary>
    public const string UsersReadDirectory = "Users.ReadDirectory";
    /// <summary>Tạo tài khoản nội bộ GV / Kế toán (BGH + SuperAdmin).</summary>
    public const string UsersCreateStaff = "Users.CreateStaff";
    /// <summary>Sửa / xóa / đổi role / khóa tài khoản — chỉ SuperAdmin.</summary>
    public const string UsersManage = "Users.Manage";

    public const string ParentLinksManage = "ParentLinks.Manage";

    public const string DashboardRead = "Dashboard.Read";
    /// <summary>Xuất báo cáo tổng quan (CSV) — Ban giám hiệu + SuperAdmin.</summary>
    public const string DashboardExport = "Dashboard.Export";
}
