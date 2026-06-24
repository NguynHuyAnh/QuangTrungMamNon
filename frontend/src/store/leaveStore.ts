export interface LeaveRequest {
    id: number;
    studentName: string;
    className: string;
    leaveDate: string;
    reason: string;
    status: string;
}

export const leaveRequests: LeaveRequest[] = [
    {
        id: 1,
        studentName: "Nguyễn Văn A",
        className: "Lá 1",
        leaveDate: "2026-06-25",
        reason: "Sốt cao",
        status: "Chờ duyệt",
    },
];

