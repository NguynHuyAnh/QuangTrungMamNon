// Frontend types
export type TimetableSlot = {
  id: string;
  classId: string;
  schoolYearId: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5;     // Mon–Fri
  slotOrder: number;
  startTime: string;                  // "07:30"
  endTime: string;                    // "08:15"
  subject: string;
  teacherNote?: string;
  teacherId?: string;
  teacherName?: string;
};

export type TimetableGrid = {
  className: string;
  schoolYearName: string;
  slots: TimetableSlot[];
};

export type UpsertTimetableSlotBody = {
  classId: string;
  schoolYearId: string;
  dayOfWeek: number;
  slotOrder: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherNote?: string;
  teacherId?: string;
};

// Mock data //
// Lớp Lá A (Trường mầm non Quang Trung, năm học 2025–2026)
export const mockTimetable: TimetableGrid = {
  className: "Lá A",
  schoolYearName: "2025–2026",
  slots: [
    // Thứ Hai
    { id: "tt-001", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 1, slotOrder: 1, startTime: "07:30", endTime: "08:15",
      subject: "Toán", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },
    { id: "tt-002", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 1, slotOrder: 2, startTime: "08:20", endTime: "09:05",
      subject: "Tiếng Việt", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },
    { id: "tt-003", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 1, slotOrder: 3, startTime: "09:20", endTime: "10:05",
      subject: "Âm nhạc", teacherId: "user-gv-02", teacherName: "Trần Văn Minh" },
    { id: "tt-004", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 1, slotOrder: 4, startTime: "10:10", endTime: "10:55",
      subject: "Thể chất", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },

    // Thứ Ba
    { id: "tt-005", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 2, slotOrder: 1, startTime: "07:30", endTime: "08:15",
      subject: "Tiếng Anh", teacherId: "user-gv-03", teacherName: "Lê Thị Hoa" },
    { id: "tt-006", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 2, slotOrder: 2, startTime: "08:20", endTime: "09:05",
      subject: "Khám phá khoa học", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },
    { id: "tt-007", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 2, slotOrder: 3, startTime: "09:20", endTime: "10:05",
      subject: "Tạo hình", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },
    { id: "tt-008", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 2, slotOrder: 4, startTime: "10:10", endTime: "10:55",
      subject: "Kỹ năng sống", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },

    // Thứ Tư
    { id: "tt-009", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 3, slotOrder: 1, startTime: "07:30", endTime: "08:15",
      subject: "Toán", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },
    { id: "tt-010", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 3, slotOrder: 2, startTime: "08:20", endTime: "09:05",
      subject: "Làm quen văn học", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },
    { id: "tt-011", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 3, slotOrder: 3, startTime: "09:20", endTime: "10:05",
      subject: "Âm nhạc", teacherId: "user-gv-02", teacherName: "Trần Văn Minh" },
    { id: "tt-012", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 3, slotOrder: 4, startTime: "10:10", endTime: "10:55",
      subject: "Tiếng Anh", teacherId: "user-gv-03", teacherName: "Lê Thị Hoa" },

    // Thứ Năm
    { id: "tt-013", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 4, slotOrder: 1, startTime: "07:30", endTime: "08:15",
      subject: "Tiếng Việt", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },
    { id: "tt-014", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 4, slotOrder: 2, startTime: "08:20", endTime: "09:05",
      subject: "Thể chất", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },
    { id: "tt-015", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 4, slotOrder: 3, startTime: "09:20", endTime: "10:05",
      subject: "Khám phá khoa học", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },
    { id: "tt-016", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 4, slotOrder: 4, startTime: "10:10", endTime: "10:55",
      subject: "Tạo hình", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },

    // Thứ Sáu
    { id: "tt-017", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 5, slotOrder: 1, startTime: "07:30", endTime: "08:15",
      subject: "Toán", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },
    { id: "tt-018", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 5, slotOrder: 2, startTime: "08:20", endTime: "09:05",
      subject: "Tiếng Anh", teacherId: "user-gv-03", teacherName: "Lê Thị Hoa" },
    { id: "tt-019", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 5, slotOrder: 3, startTime: "09:20", endTime: "10:05",
      subject: "Kỹ năng sống", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },
    { id: "tt-020", classId: "cls-la-a", schoolYearId: "sy-2526",
      dayOfWeek: 5, slotOrder: 4, startTime: "10:10", endTime: "10:55",
      subject: "Làm quen văn học", teacherId: "user-gv-01", teacherName: "Nguyễn Thị Lan" },
  ]
};