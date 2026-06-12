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

// Mock data //
export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: "lr-001",
    teacherId: "user-gv-01",
    teacherName: "Nguyễn Thị Lan",
    teacherEmail: "lan.nguyen@demo.local",
    leaveType: 1,
    leaveTypeName: "Nghỉ bệnh",
    leaveDate: "2025-09-20",
    leaveDateEnd: "2025-09-21",
    totalDays: 2,
    reason: "Bị cảm cúm, sốt cao, có giấy xác nhận của bác sĩ.",
    status: 1,
    statusName: "Đã duyệt",
    reviewedByName: "Hiệu trưởng Phạm Thị Bích",
    reviewNote: "Chúc cô mau hồi phục.",
    reviewedAt: "2025-09-18T08:30:00Z",
    createdAt: "2025-09-17T14:22:00Z",
  },
  {
    id: "lr-002",
    teacherId: "user-gv-02",
    teacherName: "Trần Văn Minh",
    teacherEmail: "minh.tran@demo.local",
    leaveType: 2,
    leaveTypeName: "Việc riêng",
    leaveDate: "2025-10-05",
    totalDays: 1,
    reason: "Đưa con đi khám bệnh theo lịch định kỳ.",
    status: 0,
    statusName: "Chờ duyệt",
    createdAt: "2025-10-01T09:10:00Z",
  },
  {
    id: "lr-003",
    teacherId: "user-gv-03",
    teacherName: "Lê Thị Hoa",
    teacherEmail: "hoa.le@demo.local",
    leaveType: 0,
    leaveTypeName: "Nghỉ phép năm",
    leaveDate: "2025-10-10",
    leaveDateEnd: "2025-10-14",
    totalDays: 5,
    reason: "Nghỉ phép năm theo chế độ. Gia đình có kế hoạch du lịch.",
    status: 2,
    statusName: "Từ chối",
    reviewedByName: "Hiệu trưởng Phạm Thị Bích",
    reviewNote: "Tháng 10 gần Ngày Nhà giáo, nhà trường cần đủ giáo viên. Đề nghị điều chỉnh sang tháng 11.",
    reviewedAt: "2025-10-03T11:00:00Z",
    createdAt: "2025-10-02T15:40:00Z",
  },
  {
    id: "lr-004",
    teacherId: "user-gv-01",
    teacherName: "Nguyễn Thị Lan",
    teacherEmail: "lan.nguyen@demo.local",
    leaveType: 2,
    leaveTypeName: "Việc riêng",
    leaveDate: "2025-11-20",
    totalDays: 1,
    reason: "Tham dự đám cưới người thân.",
    status: 3,
    statusName: "Đã huỷ",
    createdAt: "2025-11-10T08:00:00Z",
  },
  {
    id: "lr-005",
    teacherId: "user-gv-04",
    teacherName: "Phạm Quốc Bảo",
    teacherEmail: "bao.pham@demo.local",
    leaveType: 1,
    leaveTypeName: "Nghỉ bệnh",
    leaveDate: "2026-01-08",
    totalDays: 1,
    reason: "Đau bụng cấp tính, không thể đến trường.",
    status: 0,
    statusName: "Chờ duyệt",
    createdAt: "2026-01-07T20:15:00Z",
  },
];

// Thống kê cho Dashboard BGH
export const mockLeaveSummary = {
  pendingCount: 2,
  approvedThisMonth: 1,
  rejectedThisMonth: 1,
};