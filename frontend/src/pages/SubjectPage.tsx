import { useState } from "react";

interface Subject {
    id: number;
    name: string;
    description: string;
}

export function SubjectPage() {
    const [subjects] = useState<Subject[]>([
        {
            id: 1,
            name: "Làm quen chữ cái",
            description: "Học nhận biết chữ cái"
        },
        {
            id: 2,
            name: "Làm quen toán",
            description: "Đếm số và nhận biết hình"
        },
        {
            id: 3,
            name: "Âm nhạc",
            description: "Hát và vận động"
        },
        {
            id: 4,
            name: "Mỹ thuật",
            description: "Tô màu và vẽ"
        }
    ]);

    return (
        <div>
            <h1>Quản lý môn học</h1>

            <table>
                <thead>
                    <tr>
                        <th>Tên môn</th>
                        <th>Mô tả</th>
                    </tr>
                </thead>

                <tbody>
                    {subjects.map(subject => (
                        <tr key={subject.id}>
                            <td>{subject.name}</td>
                            <td>{subject.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}