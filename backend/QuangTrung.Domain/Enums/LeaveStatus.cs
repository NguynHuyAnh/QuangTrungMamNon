namespace QuangTrung.Domain.Enums;

/// <summary>Trạng thái xử lý đơn nghỉ phép (dùng chung cho đơn của học sinh và của nhân viên).</summary>
public enum LeaveStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Cancelled = 3
}
