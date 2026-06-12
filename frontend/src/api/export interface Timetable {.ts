export interface Timetable {
    id: number;

    classId: number;

    className: string;

    dayOfWeek:
        | "Thứ 2"
        | "Thứ 3"
        | "Thứ 4"
        | "Thứ 5"
        | "Thứ 6";

    startTime: string;

    endTime: string;

    activity: string;

    teacherId: number;

    teacherName: string;

    room: string;

    note?: string;
}