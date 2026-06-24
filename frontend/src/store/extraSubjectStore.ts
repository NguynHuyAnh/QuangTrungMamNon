export interface ExtraSubject {
    id: number;
    name: string;
    teacher: string;
    tuition: number;
    schedule: string;
}

export const extraSubjects: ExtraSubject[] = [
    {
        id: 1,
        name: "Tiếng Anh",
        teacher: "Cô Lan",
        tuition: 500000,
        schedule: "Thứ 2 - Thứ 4",
    },

    {
        id: 2,
        name: "Bóng rổ",
        teacher: "Thầy Nam",
        tuition: 400000,
        schedule: "Thứ 7",
    },
];

