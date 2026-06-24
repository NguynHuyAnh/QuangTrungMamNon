import { useState } from "react";

export function TeacherExtraSubjectPage() {
    

    
const [showForm, setShowForm] =
    useState(false);

const [registrations, setRegistrations] =
    useState([
        {
            id: 1,
            className: "Lá 1",
            subjectName: "Tiếng Anh",
            teacher: "Cô Lan",
            students: 20,
        },
    ]);

const [newRegistration, setNewRegistration] =
    useState({
        className: "",
        subjectName: "",
        teacher: "",
        students: 0,
    });

    
const addRegistration = () => {

    setRegistrations([
        ...registrations,
        {
            id: Date.now(),
            ...newRegistration,
        },
    ]);

    setShowForm(false);

    setNewRegistration({
        className: "",
        subjectName: "",
        teacher: "",
        students: 0,
    });
};





    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">

                <div>

                    <h1 className="text-3xl font-bold text-slate-800">
                        Đăng ký môn học ngoài
                    </h1>

                    <p className="mt-1 text-slate-500">
                        Giáo viên đăng ký môn học ngoài cho lớp
                    </p>

                </div>

                <button
                      onClick={() => setShowForm(true)} 
                      className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow">
                    + Đăng ký
                </button>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                <div className="rounded-xl bg-white p-5 shadow">

                    <p className="text-sm text-slate-500">
                        Tổng đăng ký
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-blue-700">
                        {registrations.length}
                    </h2>

                </div>

                <div className="rounded-xl bg-white p-5 shadow">

                    <p className="text-sm text-slate-500">
                        Tổng lớp
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-green-600">
                        2
                    </h2>

                </div>

                <div className="rounded-xl bg-white p-5 shadow">

                    <p className="text-sm text-slate-500">
                        Tổng học sinh
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-purple-600">
                        35
                    </h2>

                </div>

            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow">

                <table className="min-w-full">

                    <thead className="bg-blue-700 text-white">

                        <tr>

                            <th className="px-6 py-4 text-left">
                                Lớp
                            </th>

                            <th className="px-6 py-4 text-left">
                                Môn học
                            </th>

                            <th className="px-6 py-4 text-left">
                                Giáo viên
                            </th>

                            <th className="px-6 py-4 text-left">
                                Số học sinh
                            </th>

                            <th className="px-6 py-4 text-center">
                                Thao tác
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {registrations.map((item) => (

                            <tr
                                key={item.id}
                                className="border-b hover:bg-slate-50"
                            >

                                <td className="px-6 py-4">
                                    {item.className}
                                </td>

                                <td className="px-6 py-4">
                                    {item.subjectName}
                                </td>

                                <td className="px-6 py-4">
                                    {item.teacher}
                                </td>

                                <td className="px-6 py-4">
                                    {item.students}
                                </td>

                                <td className="px-6 py-4">

                                    <div className="flex justify-center gap-2">

                                        <button className="rounded-lg bg-blue-600 px-3 py-2 text-white">
                                            Sửa
                                        </button>

                                        <button className="rounded-lg bg-slate-700 px-3 py-2 text-white">
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

            <h2 className="mb-6 text-2xl font-bold">
                Đăng ký môn học ngoài
            </h2>

            <div className="space-y-4">

                <input
                    placeholder="Tên lớp"
                    value={newRegistration.className}
                    onChange={(e) =>
                        setNewRegistration({
                            ...newRegistration,
                            className: e.target.value,
                        })
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />

                <input
                    placeholder="Tên môn học"
                    value={newRegistration.subjectName}
                    onChange={(e) =>
                        setNewRegistration({
                            ...newRegistration,
                            subjectName: e.target.value,
                        })
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />

                <input
                    placeholder="Giáo viên"
                    value={newRegistration.teacher}
                    onChange={(e) =>
                        setNewRegistration({
                            ...newRegistration,
                            teacher: e.target.value,
                        })
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />

                <input
                    type="number"
                    placeholder="Số học sinh"
                    value={newRegistration.students}
                    onChange={(e) =>
                        setNewRegistration({
                            ...newRegistration,
                            students: Number(e.target.value),
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
                    onClick={addRegistration}
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

