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

