
import { useState } from "react";
import { MaterialSymbol } from "../components/MaterialSymbol";

interface Food {
    id: number;
    name: string;
    meal: string;
    mealTime: string;
    calories: number;
}

export function FoodDeclaration() {
    const mockFoods: Food[] = [
    {
        id: 1,
        name: "Cháo sườn",
        meal: "Bữa sáng",
        mealTime: "07:30",
        calories: 250,
    },
    {
        id: 2,
        name: "Cơm thịt băm",
        meal: "Bữa trưa",
        mealTime: "11:00",
        calories: 520,
    },
    {
        id: 3,
        name: "Sữa tươi",
        meal: "Bữa phụ",
        mealTime: "14:30",
        calories: 180,
    },
];
const [foods, setFoods] = useState<Food[]>(mockFoods);
const [keyword, setKeyword] = useState("");
const [showForm, setShowForm] = useState(false);
const [editingId, setEditingId] = useState<number | null>(null);
const [newFood, setNewFood] = useState<Food>({
    id: 0,
    name: "",
    meal: "",
    mealTime: "",
    calories: 0,
});

const addFood = () => {

    if (
        !newFood.name ||
        !newFood.meal ||
        !newFood.mealTime
    ) {
        alert("Vui lòng nhập đầy đủ thông tin");
        return;
    }

    const food: Food = {
        ...newFood,
        id: Date.now(),
    };

    setFoods([...foods, food]);

    setNewFood({
        id: 0,
        name: "",
        meal: "",
        mealTime: "",
        calories: 0,
    });

    setShowForm(false);
};

const deleteFood = (id: number) => {

    const confirmDelete = window.confirm(
        "Bạn có chắc muốn xóa món ăn này không?"
    );

    if (!confirmDelete) return;

    setFoods(
        foods.filter((food) => food.id !== id)
    );
};

const editFood = (food: Food) => {

    setEditingId(food.id);

    setNewFood(food);

    setShowForm(true);
};

const updateFood = () => {

    setFoods(
        foods.map((food) =>
            food.id === editingId
                ? {
                      ...newFood,
                      id: editingId!,
                  }
                : food
        )
    );

    setEditingId(null);

    setNewFood({
        id: 0,
        name: "",
        meal: "",
        mealTime: "",
        calories: 0,
    });

    setShowForm(false);
};

    return (
    <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">

            <div>
                <h1 className="text-3xl font-bold text-slate-800">
                    Khai báo thực đơn
                </h1>

                <p className="mt-1 text-slate-500">
                    Quản lý danh sách món ăn của nhà trường
                </p>
            </div>

            <button
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow hover:bg-blue-800"
            >
                + Thêm món ăn
            </button>

        </div>

        {/* Card thống kê */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-slate-500">
                    Tổng món ăn
                </p>

                <h2 className="mt-2 text-3xl font-bold text-blue-700">
                    {foods.length}
                </h2>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-slate-500">
                    Bữa sáng
                </p>

                <h2 className="mt-2 text-3xl font-bold text-orange-500">
                    {foods.filter(food => food.meal === "Bữa sáng").length}
                </h2>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-slate-500">
                    Bữa trưa
                </p>

                <h2 className="mt-2 text-3xl font-bold text-green-600">
                    {foods.filter(food => food.meal === "Bữa trưa").length}
                </h2>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-slate-500">
                    Bữa phụ
                </p>

                <h2 className="mt-2 text-3xl font-bold text-purple-600">
                    {foods.filter(food => food.meal === "Bữa phụ").length}
                </h2>
            </div>

        </div>

        {/* Thanh tìm kiếm */}
        <div className="rounded-xl bg-white p-5 shadow">

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">

                <div className="relative">

                    <MaterialSymbol
                        name="search"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                        type="text"
                        placeholder="Tìm tên món ăn..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 outline-none focus:border-blue-600"
                    />

                </div>

                <select className="rounded-lg border border-slate-300 px-4 py-2">
                    <option>Tất cả bữa ăn</option>
                    <option>Bữa sáng</option>
                    <option>Bữa trưa</option>
                    <option>Bữa phụ</option>
                </select>

                <input
                    type="time"
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
                    Tên món ăn
                </th>

                <th className="px-6 py-4 text-left">
                    Bữa ăn
                </th>

                <th className="px-6 py-4 text-left">
                    Giờ ăn
                </th>

                <th className="px-6 py-4 text-left">
                    Calories
                </th>

                <th className="px-6 py-4 text-center">
                    Thao tác
                </th>

            </tr>

        </thead>

        <tbody>

            {
                foods.map((food) => (

                    <tr
                        key={food.id}
                        className="border-b hover:bg-slate-50"
                    >

                        <td className="px-6 py-4">
                            {food.name}
                        </td>

                        <td className="px-6 py-4">
                            {food.meal}
                        </td>

                        <td className="px-6 py-4">
                            {food.mealTime}
                        </td>

                        <td className="px-6 py-4">
                            {food.calories} kcal
                        </td>

                        <td className="px-6 py-4">

                            <div className="flex justify-center gap-2">

                                <button
                                    onClick={() => editFood(food)}
                                    className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                                >
                                    Sửa
                                </button>

                                <button
                                    onClick={() => deleteFood(food.id)}
                                    className="rounded-lg bg-slate-700 px-3 py-2 text-white hover:bg-slate-800"
                                >
                                    Xóa
                                </button>

                            </div>

                        </td>

                    </tr>

                ))
            }

        </tbody>

    </table>

</div>

{showForm && (

<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">

        {/* Header Popup */}
        <div className="mb-6 flex items-center justify-between">

            <h2 className="text-2xl font-bold">
                {editingId ? "Sửa món ăn" : "Thêm món ăn"}
            </h2>

            <button
                onClick={() => setShowForm(false)}
                className="text-2xl text-slate-500 hover:text-red-500"
            >
                ✕
            </button>

        </div>

        {/* Form */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* Tên món ăn */}
            <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Tên món ăn
                </label>

                <input
                    type="text"
                    value={newFood.name}
                    onChange={(e) =>
                        setNewFood({
                            ...newFood,
                            name: e.target.value,
                        })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Nhập tên món ăn"
                />

            </div>

            {/* Bữa ăn */}
            <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Bữa ăn
                </label>

                <select
                    value={newFood.meal}
                    onChange={(e) =>
                        setNewFood({
                            ...newFood,
                            meal: e.target.value,
                        })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                    <option value="">Chọn bữa ăn</option>
                    <option>Bữa sáng</option>
                    <option>Bữa trưa</option>
                    <option>Bữa phụ</option>
                </select>

            </div>

            {/* Giờ ăn */}
            <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Giờ ăn
                </label>

                <input
                    type="time"
                    value={newFood.mealTime}
                    onChange={(e) =>
                        setNewFood({
                            ...newFood,
                            mealTime: e.target.value,
                        })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />

            </div>

            {/* Calories */}
            <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Calories
                </label>

                <input
                    type="number"
                    value={newFood.calories}
                    onChange={(e) =>
                        setNewFood({
                            ...newFood,
                            calories: Number(e.target.value),
                        })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Nhập calories"
                />

            </div>

        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3">

            <button
                onClick={() => setShowForm(false)}
                className="rounded-lg bg-slate-200 px-5 py-2 font-semibold hover:bg-slate-300"
            >
                Hủy
            </button>

            <button
                onClick={
                  editingId
            ? updateFood
            : addFood
    }
                className="rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800"
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