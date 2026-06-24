export function ParentExtraSubjectPage() {

    const student = {
        name: "Nguyễn Văn A",
        className: "Lá 1",
    };

    const subjects = [
        {
            id: 1,
            name: "Tiếng Anh",
            teacher: "Cô Lan",
            schedule: "Thứ 2 - Thứ 4",
            tuition: 500000,
        },
        {
            id: 2,
            name: "Bóng rổ",
            teacher: "Thầy Nam",
            schedule: "Thứ 7",
            tuition: 400000,
        },
    ];

    return (
        <div className="space-y-6">

            <div>

                <h1 className="text-3xl font-bold text-slate-800">
                    Môn học ngoài của con
                </h1>

                <p className="mt-1 text-slate-500">
                    Danh sách các môn học ngoài giờ đang tham gia
                </p>

            </div>

            <div className="rounded-xl bg-white p-6 shadow">

                <h2 className="text-xl font-bold text-blue-700">
                    {student.name}
                </h2>

                <p className="mt-2 text-slate-500">
                    Lớp: {student.className}
                </p>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                {subjects.map((subject) => (

                    <div
                        key={subject.id}
                        className="rounded-xl bg-white p-6 shadow"
                    >

                        <h3 className="text-xl font-bold text-blue-700">
                            {subject.name}
                        </h3>

                        <div className="mt-4 space-y-2">

                            <p>
                                <strong>Giáo viên:</strong>
                                {" "}
                                {subject.teacher}
                            </p>

                            <p>
                                <strong>Lịch học:</strong>
                                {" "}
                                {subject.schedule}
                            </p>

                            <p>
                                <strong>Học phí:</strong>
                                {" "}
                                {subject.tuition.toLocaleString()}
                                {" "}
                                VNĐ
                            </p>

                        </div>

                    </div>

                ))}

            </div>

        </div>
    );
}

