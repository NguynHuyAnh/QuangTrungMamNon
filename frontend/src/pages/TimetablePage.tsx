import { useState } from "react";
import { MaterialSymbol } from "../components/MaterialSymbol";
import { useAuth } from "../auth/AuthContext";

interface Lesson {
    id: number;
    className: string;
    day: string;
    period: number;
    subject: string;
    teacher: string;
}

export function TimetablePage() {

    const { roles } = useAuth();

    const canManageTimetable =
    roles.includes("BanGiamHieu") ||
    roles.includes("GiaoVien") ||
    roles.includes("SuperAdmin");

   const [lessons, setLessons] = useState<Lesson[]>([
        {
            id:1,
            className:"Mầm A1",
            day:"Thứ 2",
            period:1,
            subject:"Toán",
            teacher:"Nguyễn Văn A"
        },
        {
            id:2,
            className:"Chồi B2",
            day:"Thứ 2",
            period:2,
            subject:"Âm nhạc",
            teacher:"Trần Thị B"
        },
        {
            id:3,
            className:"Lá C1",
            day:"Thứ 3",
            period:1,
            subject:"Mỹ thuật",
            teacher:"Lê Văn C"
        }
    ]);

    const [showForm, setShowForm] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);

const [newLesson, setNewLesson] = useState<Lesson>({
    id: 0,
    className: "",
    day: "",
    period: 1,
    subject: "",
    teacher: "",
});

const [keyword, setKeyword] = useState("");


const addLesson = () => {

    if (
        newLesson.className === "" ||
        newLesson.day === "" ||
        newLesson.subject === "" ||
        newLesson.teacher === ""
    ) {
        alert("Vui lòng nhập đầy đủ thông tin");
        return;
    }

    if (editingId !== null) {

    setLessons(
        lessons.map((item) =>
            item.id === editingId ? newLesson : item
        )
    );

    setEditingId(null);

} else {

    const lesson: Lesson = {
        ...newLesson,
        id: Date.now(),
    };

    setLessons([...lessons, lesson]);

}

    setNewLesson({
        id: 0,
        className: "",
        day: "",
        period: 1,
        subject: "",
        teacher: "",
    });

    setShowForm(false);
};

const editLesson = (lesson: Lesson) => {

    if (!canManageTimetable) return;

    setNewLesson(lesson);

    setEditingId(lesson.id);

    setShowForm(true);

};

const deleteLesson = (id: number) => {

    if (!canManageTimetable) return;

    if (!window.confirm("Bạn có chắc muốn xóa?")) return;

    setLessons(lessons.filter(item => item.id !== id));

};

    return (

<div className="space-y-6">

    <div className="flex items-center justify-between">

        <div>

            <h1 className="text-3xl font-bold text-slate-800">
                Thời khóa biểu
            </h1>

            <p className="mt-1 text-slate-500">
                Quản lý thời khóa biểu các lớp học
            </p>

        </div>
    {canManageTimetable && (
        <button
            onClick={() => {
                if (!canManageTimetable) return;
                setShowForm(true)
            }}
            className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow hover:bg-blue-800"
        >
            + Thêm thời khóa biểu
        </button>
    )}

    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

    <div className="rounded-xl bg-white p-5 shadow">
        <p className="text-sm text-slate-500">
            Tổng tiết học
        </p>

        <h2 className="mt-2 text-3xl font-bold text-blue-700">
            {lessons.length}
        </h2>
    </div>

    <div className="rounded-xl bg-white p-5 shadow">
        <p className="text-sm text-slate-500">
            Giáo viên
        </p>

        <h2 className="mt-2 text-3xl font-bold text-green-600">
            8
        </h2>
    </div>

    <div className="rounded-xl bg-white p-5 shadow">
        <p className="text-sm text-slate-500">
            Môn học
        </p>

        <h2 className="mt-2 text-3xl font-bold text-orange-500">
            6
        </h2>
    </div>

    <div className="rounded-xl bg-white p-5 shadow">
        <p className="text-sm text-slate-500">
            Lớp học
        </p>

        <h2 className="mt-2 text-3xl font-bold text-purple-600">
            4
        </h2>
    </div>

</div>

<div className="rounded-xl bg-white p-5 shadow">

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">

        <div className="relative">

    <MaterialSymbol
        name="search"
        className="absolute left-3 top-1/2 -translate-y-1/2 animate-pulse text-slate-400"
    />

    <input
        type="text"
        placeholder="Tìm môn học hoặc giáo viên..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 outline-none focus:border-blue-600"
    />

</div>

        <select className="rounded-lg border border-slate-300 px-4 py-2">
            <option>Tất cả thứ</option>
            <option>Thứ 2</option>
            <option>Thứ 3</option>
            <option>Thứ 4</option>
            <option>Thứ 5</option>
            <option>Thứ 6</option>
        </select>

        <select className="rounded-lg border border-slate-300 px-4 py-2">
            <option>Tất cả tiết</option>
            <option>Tiết 1</option>
            <option>Tiết 2</option>
            <option>Tiết 3</option>
            <option>Tiết 4</option>
        </select>

        <button
            className="rounded-lg bg-slate-100 px-4 py-2 font-semibold hover:bg-slate-200"
        >
            Làm mới
        </button>

    </div>

</div>

{showForm && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">

    <div className="mb-6 flex items-center justify-between">

    <h2 className="text-2xl font-bold">
        Thêm thời khóa biểu
    </h2>

    <button
        onClick={() => setShowForm(false)}
        className="text-2xl text-slate-500 hover:text-red-500"
    >
        ✕
    </button>

</div>

<div className="grid grid-cols-2 gap-4">
    </div>

        <select
    value={newLesson.className}
    onChange={(e) =>
        setNewLesson({
            ...newLesson,
            className: e.target.value,
        })
    }
    className="rounded-lg border border-slate-300 px-3 py-2"
>
    <option value="">Chọn lớp</option>
    <option>Mầm A1</option>
    <option>Mầm A2</option>
    <option>Chồi B1</option>
    <option>Chồi B2</option>
    <option>Lá C1</option>
</select>

        <select
    value={newLesson.day}
    onChange={(e) =>
        setNewLesson({
            ...newLesson,
            day: e.target.value,
        })
    }
    className="rounded-lg border border-slate-300 px-3 py-2"
>
    <option value="">Chọn thứ</option>
    <option>Thứ 2</option>
    <option>Thứ 3</option>
    <option>Thứ 4</option>
    <option>Thứ 5</option>
    <option>Thứ 6</option>
</select>

        

        <select
    value={newLesson.subject}
    onChange={(e) =>
        setNewLesson({
            ...newLesson,
            subject: e.target.value,
        })
    }
    className="rounded-lg border border-slate-300 px-3 py-2"
>
    <option value="">Chọn môn học</option>

    <option>Làm quen toán</option>

    <option>Làm quen chữ cái</option>

    <option>Âm nhạc</option>

    <option>Mỹ thuật</option>

    <option>Thể dục</option>

    <option>Hoạt động ngoài trời</option>

</select>

        <select
    value={newLesson.teacher}
    onChange={(e) =>
        setNewLesson({
            ...newLesson,
            teacher: e.target.value,
        })
    }
    className="rounded-lg border border-slate-300 px-3 py-2"
>
    <option value="">Chọn giáo viên</option>

    <option>Nguyễn Văn A</option>

    <option>Trần Thị B</option>

    <option>Lê Văn C</option>

    <option>Phạm Thị D</option>

</select>

        <button 
              onClick={addLesson}
              className="rounded-lg bg-blue-700 px-6 py-2 font-semibold text-white hover:bg-blue-800">
    Lưu
</button>

        <button 
              onClick={() => setShowForm(false)}
              className="rounded-lg bg-slate-200 px-6 py-2 font-semibold hover:bg-slate-300">
            Hủy
        </button>

    </div>

    </div>
)}


<div className="overflow-hidden rounded-xl bg-white shadow">
    <table className="min-w-full">

<thead className="bg-blue-700 text-white">

<tr className="text-left">

<th className="px-6 py-4">Lớp</th>

<th className="px-6 py-4">Thứ</th>

<th className="px-6 py-4">Tiết</th>

<th className="px-6 py-4">Môn học</th>

<th className="px-6 py-4">Giáo viên</th>

<th></th>

</tr>

</thead>

<tbody>

{

lessons
.filter(item =>
    item.subject.toLowerCase().includes(keyword.toLowerCase()) ||
    item.teacher.toLowerCase().includes(keyword.toLowerCase())
)
.map(item => (

<tr
    key={item.id}
    className="border-b hover:bg-slate-50 transition"
>

<td className="px-6 py-4">
    {item.className}
</td>

<td>{item.day}</td>

<td>{item.period}</td>

<td>{item.subject}</td>

<td>{item.teacher}</td>

<td className="px-6 py-4">

    {canManageTimetable && (
        <>

<button
    onClick={() => editLesson(item)}
    className="mr-2 rounded-lg bg-yellow-500 px-3 py-2 text-white hover:bg-yellow-600"
>
    Sửa
</button>

<button
    onClick={() => deleteLesson(item.id)}
    className="rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700"
>
    Xóa
</button>
</>
    )}

</td>

</tr>

))

}

</tbody>

</table>
</div>

</div>

)}
