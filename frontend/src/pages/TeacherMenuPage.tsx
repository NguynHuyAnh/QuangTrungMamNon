
import { useState } from "react";

interface Food {
    id: number;
    name: string;
    meal: string;
}

interface Menu {
    id: number;
    className: string;
    date: string;
    breakfast: string;
    lunch: string;
    snack: string;
}

export function TeacherMenuPage() {
    const [showForm, setShowForm] = useState(false);

    const foodList: Food[] = [
        { id: 1, name: "Cháo sườn", meal: "Bữa sáng" },
        { id: 2, name: "Bánh mì sữa", meal: "Bữa sáng" },
        { id: 3, name: "Cơm thịt băm", meal: "Bữa trưa" },
        { id: 4, name: "Cơm gà", meal: "Bữa trưa" },
        { id: 5, name: "Sữa tươi", meal: "Bữa phụ" },
        { id: 6, name: "Sữa chua", meal: "Bữa phụ" },
    ];

    const [menus, setMenus] = useState<Menu[]>([
        {
            id: 1,
            className: "Lá 1",
            date: "2026-06-24",
            breakfast: "Cháo sườn",
            lunch: "Cơm thịt băm",
            snack: "Sữa tươi",
        },
    ]);

    const [newMenu, setNewMenu] = useState<Menu>({
        id: 0,
        className: "",
        date: "",
        breakfast: "",
        lunch: "",
        snack: "",
    });

    const addMenu = () => {
        setMenus([
            ...menus,
            {
                ...newMenu,
                id: Date.now(),
            },
        ]);

        setShowForm(false);

        setNewMenu({
            id: 0,
            className: "",
            date: "",
            breakfast: "",
            lunch: "",
            snack: "",
        });
    };

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">

                <div>
                    <h1 className="text-3xl font-bold text-slate-800">
                        Tạo thực đơn hôm nay
                    </h1>

                    <p className="mt-1 text-slate-500">
                        Giáo viên tạo thực đơn cho lớp
                    </p>
                </div>

                <button
                    onClick={() => setShowForm(true)}
                    className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white"
                >
                    + Tạo thực đơn
                </button>

            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow">

                <table className="min-w-full">

                    <thead className="bg-blue-700 text-white">

                        <tr>
                            <th className="px-6 py-4 text-left">Lớp</th>
                            <th className="px-6 py-4 text-left">Ngày</th>
                            <th className="px-6 py-4 text-left">Bữa sáng</th>
                            <th className="px-6 py-4 text-left">Bữa trưa</th>
                            <th className="px-6 py-4 text-left">Bữa phụ</th>
                        </tr>

                    </thead>

                    <tbody>

                        {menus.map((menu) => (
                            <tr key={menu.id} className="border-b">

                                <td className="px-6 py-4">
                                    {menu.className}
                                </td>

                                <td className="px-6 py-4">
                                    {menu.date}
                                </td>

                                <td className="px-6 py-4">
                                    {menu.breakfast}
                                </td>

                                <td className="px-6 py-4">
                                    {menu.lunch}
                                </td>

                                <td className="px-6 py-4">
                                    {menu.snack}
                                </td>

                            </tr>
                        ))}

                    </tbody>

                </table>

            </div>

            {showForm && (

                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">

                        <h2 className="mb-6 text-2xl font-bold">
                            Tạo thực đơn
                        </h2>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                            <input
                                placeholder="Tên lớp"
                                value={newMenu.className}
                                onChange={(e) =>
                                    setNewMenu({
                                        ...newMenu,
                                        className: e.target.value,
                                    })
                                }
                                className="rounded-lg border px-3 py-2"
                            />

                            <input
                                type="date"
                                value={newMenu.date}
                                onChange={(e) =>
                                    setNewMenu({
                                        ...newMenu,
                                        date: e.target.value,
                                    })
                                }
                                className="rounded-lg border px-3 py-2"
                            />

                            <select
                                value={newMenu.breakfast}
                                onChange={(e) =>
                                    setNewMenu({
                                        ...newMenu,
                                        breakfast: e.target.value,
                                    })
                                }
                                className="rounded-lg border px-3 py-2"
                            >
                                <option>Bữa sáng</option>
                                {foodList
                                    .filter(f => f.meal === "Bữa sáng")
                                    .map(f => (
                                        <option key={f.id}>
                                            {f.name}
                                        </option>
                                    ))}
                            </select>

                            <select
                                value={newMenu.lunch}
                                onChange={(e) =>
                                    setNewMenu({
                                        ...newMenu,
                                        lunch: e.target.value,
                                    })
                                }
                                className="rounded-lg border px-3 py-2"
                            >
                                <option>Bữa trưa</option>
                                {foodList
                                    .filter(f => f.meal === "Bữa trưa")
                                    .map(f => (
                                        <option key={f.id}>
                                            {f.name}
                                        </option>
                                    ))}
                            </select>

                            <select
                                value={newMenu.snack}
                                onChange={(e) =>
                                    setNewMenu({
                                        ...newMenu,
                                        snack: e.target.value,
                                    })
                                }
                                className="rounded-lg border px-3 py-2"
                            >
                                <option>Bữa phụ</option>
                                {foodList
                                    .filter(f => f.meal === "Bữa phụ")
                                    .map(f => (
                                        <option key={f.id}>
                                            {f.name}
                                        </option>
                                    ))}
                            </select>

                        </div>

                        <div className="mt-6 flex justify-end gap-3">

                            <button
                                onClick={() => setShowForm(false)}
                                className="rounded-lg bg-slate-200 px-5 py-2"
                            >
                                Hủy
                            </button>

                            <button
                                onClick={addMenu}
                                className="rounded-lg bg-blue-700 px-5 py-2 text-white"
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




