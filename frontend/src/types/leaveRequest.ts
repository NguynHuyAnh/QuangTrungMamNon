export type LeaveRequest = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  leaveType: 0 | 1 | 2 | 3 | 4;      // Annual/Sick/Personal/Unpaid/Other
  leaveTypeName: string;               // "Nghỉ phép năm"
  leaveDate: string;                   // "2025-09-15"
  leaveDateEnd?: string;               // "2025-09-16" nếu nhiều ngày
  totalDays: number;                   // Số ngày nghỉ
  reason: string;
  status: 0 | 1 | 2 | 3;              // Pending/Approved/Rejected/Cancelled
  statusName: string;                  // "Chờ duyệt"
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
};

export type CreateLeaveRequestBody = {
  leaveType: number;
  leaveDate: string;
  leaveDateEnd?: string;
  reason: string;
};

export type ReviewLeaveRequestBody = {
  reviewNote?: string;
};

