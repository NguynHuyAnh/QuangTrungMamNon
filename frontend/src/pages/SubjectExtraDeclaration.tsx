import { useState } from "react";
import {extraSubjects} from "../store/extraSubjectStore";


interface ExtraSubject {
    id: number;
    name: string;
    teacher: string;
    tuition: number;
    schedule: string;
}

export function SubjectExtraDeclaration() {
    const [subjects, setSubjects] =
    useState<ExtraSubject[]>(extraSubjects);

    const [keyword, setKeyword] = useState("");

    const [showForm, setShowForm] =
    useState(false);

    const [editingId, setEditingId] =
    useState<number | null>(null);

const [newSubject, setNewSubject] =
    useState({
        name: "",
        teacher: "",
        tuition: 0,
        schedule: "",
    });

    

const addSubject = () => {

    if (editingId) {

        const index =
            extraSubjects.findIndex(
                item => item.id === editingId
            );

        if (index !== -1) {

            extraSubjects[index] = {
                id: editingId,
                ...newSubject,
            };

        }

    } else {

        extraSubjects.push({
            id: Date.now(),
            ...newSubject,
        });

    }

    setSubjects([...extraSubjects]);

    setEditingId(null);

    setShowForm(false);

    setNewSubject({
        name: "",
        teacher: "",
        tuition: 0,
        schedule: "",
    });
};



    extraSubjects.push({
        id: Date.now(),
        ...newSubject,
    });

    setSubjects([...extraSubjects]);

    setShowForm(false);

    setNewSubject({
        name: "",
        teacher: "",
        tuition: 0,
        schedule: "",
    });



const editSubject = (subject: ExtraSubject) => {

    setEditingId(subject.id);

    setNewSubject({
        name: subject.name,
        teacher: subject.teacher,
        tuition: subject.tuition,
        schedule: subject.schedule,
    });

    setShowForm(true);
};


const deleteSubject = (id: number) => {

    const index =
        extraSubjects.findIndex(
            item => item.id === id
        );

    if (index !== -1) {

        extraSubjects.splice(index, 1);

    }

    setSubjects([...extraSubjects]);
};







    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">

                <div>

                    <h1 className="text-3xl font-bold text-slate-800">
                        Môn học ngoài
                    </h1>

                    <p className="mt-1 text-slate-500">
                        Quản lý các môn học ngoài giờ
                    </p>

                </div>

                <button
                    onClick={() => setShowForm(true)} 
                    className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow hover:bg-blue-800">
                    + Thêm môn học
                </button>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

                <div className="rounded-xl bg-white p-5 shadow">

                    <p className="text-sm text-slate-500">
                        Tổng môn học
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-blue-700">
                        {subjects.length}
                    </h2>

                </div>

                <div className="rounded-xl bg-white p-5 shadow">

                    <p className="text-sm text-slate-500">
                        Tiếng Anh
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-green-600">
                        1
                    </h2>

                </div>

                <div className="rounded-xl bg-white p-5 shadow">

                    <p className="text-sm text-slate-500">
                        Nghệ thuật
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-purple-600">
                        1
                    </h2>

                </div>

                <div className="rounded-xl bg-white p-5 shadow">

                    <p className="text-sm text-slate-500">
                        Thể thao
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-orange-500">
                        1
                    </h2>

                </div>

            </div>

            <div className="rounded-xl bg-white p-5 shadow">

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                    <input
                        type="text"
                        placeholder="Tìm môn học..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="rounded-lg border border-slate-300 px-4 py-2"
                    />

                    <input
                        type="text"
                        placeholder="Giáo viên phụ trách"
                        className="rounded-lg border border-slate-300 px-4 py-2"
                    />

                    <button
                        className="rounded-lg bg-slate-100 px-4 py-2 font-semibold hover:bg-slate-200"
                    >
                        Làm mới
                    </button>

                </div>

            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow">

                <table className="min-w-full">

                    <thead className="bg-blue-700 text-white">

                        <tr>

                            <th className="px-6 py-4 text-left">
                                Môn học
                            </th>

                            <th className="px-6 py-4 text-left">
                                Giáo viên
                            </th>

                            <th className="px-6 py-4 text-left">
                                Học phí
                            </th>

                            <th className="px-6 py-4 text-left">
                                Lịch học
                            </th>

                            <th className="px-6 py-4 text-center">
                                Thao tác
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {subjects.map((subject) => (

                            <tr
                                key={subject.id}
                                className="border-b hover:bg-slate-50"
                            >

                                <td className="px-6 py-4">
                                    {subject.name}
                                </td>

                                <td className="px-6 py-4">
                                    {subject.teacher}
                                </td>

                                <td className="px-6 py-4">
                                    {subject.tuition.toLocaleString()} VNĐ
                                </td>

                                <td className="px-6 py-4">
                                    {subject.schedule}
                                </td>

                                <td className="px-6 py-4">

                                    <div className="flex justify-center gap-2">

                                        <button
                                             onClick={() => editSubject(subject)} 
                                             className="rounded-lg bg-blue-600 px-3 py-2 text-white">
                                            Sửa
                                        </button>

                                        <button
                                             onClick={() => deleteSubject(subject.id)} 
                                             className="rounded-lg bg-slate-700 px-3 py-2 text-white">
                                            Xóa
                                        </button>

                                    </div>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

            
{showForm && (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

        <div className="w-full max-w-xl rounded-2xl bg-white p-6">

            {
    editingId
        ? "Cập nhật môn học ngoài"
        : "Thêm môn học ngoài"
}

            <div className="space-y-4">

                <input
                    placeholder="Tên môn học"
                    value={newSubject.name}
                    onChange={(e) =>
                        setNewSubject({
                            ...newSubject,
                            name: e.target.value,
                        })
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />

                <input
                    placeholder="Giáo viên"
                    value={newSubject.teacher}
                    onChange={(e) =>
                        setNewSubject({
                            ...newSubject,
                            teacher: e.target.value,
                        })
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />

                <input
                    type="number"
                    placeholder="Học phí"
                    value={newSubject.tuition}
                    onChange={(e) =>
                        setNewSubject({
                            ...newSubject,
                            tuition: Number(e.target.value),
                        })
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />

                <input
                    placeholder="Lịch học"
                    value={newSubject.schedule}
                    onChange={(e) =>
                        setNewSubject({
                            ...newSubject,
                            schedule: e.target.value,
                        })
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />

            </div>

            <div className="mt-6 flex justify-end gap-3">

                <button
                    onClick={() => setShowForm(false)}
                    className="rounded-lg bg-slate-200 px-4 py-2"
                >
                    Hủy
                </button>

                <button
                    onClick={addSubject}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-white"
                >
                    Lưu
                </button>

            </div>

        </div>

    </div>

)}



        </div>
    );
}

