import { useState } from "react";

export const TeacherMenuManager = () => {
  const foodDatabase = [
    "Cháo sườn",
    "Súp gà",
    "Sữa tươi",
    "Cơm thịt băm",
    "Canh bí",
    "Bún bò",
    "Bánh mì trứng",
  ];

  const [menu, setMenu] = useState({
    breakfast: "",
    lunch: "",
    snack: "",
  });

  const handlePublish = () => {
    if (!menu.breakfast || !menu.lunch || !menu.snack) {
      alert("Vui lòng chọn đầy đủ thực đơn");
      return;
    }

    console.log("Menu hôm nay:", menu);

    alert("Lưu và xuất bản thực đơn thành công!");
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Tạo Menu Đồ Ăn Hôm Nay
      </h2>

      <div className="space-y-5">
        <div>
          <label className="block font-medium mb-2">
            Bữa sáng
          </label>

          <select
            className="border p-2 rounded w-full"
            value={menu.breakfast}
            onChange={(e) =>
              setMenu({
                ...menu,
                breakfast: e.target.value,
              })
            }
          >
            <option value="">-- Chọn món ăn --</option>

            {foodDatabase.map((food, index) => (
              <option key={index} value={food}>
                {food}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-2">
            Bữa trưa
          </label>

          <select
            className="border p-2 rounded w-full"
            value={menu.lunch}
            onChange={(e) =>
              setMenu({
                ...menu,
                lunch: e.target.value,
              })
            }
          >
            <option value="">-- Chọn món ăn --</option>

            {foodDatabase.map((food, index) => (
              <option key={index} value={food}>
                {food}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-2">
            Bữa xế chiều
          </label>

          <select
            className="border p-2 rounded w-full"
            value={menu.snack}
            onChange={(e) =>
              setMenu({
                ...menu,
                snack: e.target.value,
              })
            }
          >
            <option value="">-- Chọn món ăn --</option>

            {foodDatabase.map((food, index) => (
              <option key={index} value={food}>
                {food}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handlePublish}
          className="bg-green-600 text-white px-4 py-2 rounded w-full"
        >
          Lưu & Xuất bản Thực đơn
        </button>

        <div className="border rounded p-4 bg-gray-50">
          <h3 className="font-bold mb-3">
            Xem trước thực đơn hôm nay
          </h3>

          <p>
            <strong>Bữa sáng:</strong>{" "}
            {menu.breakfast || "Chưa chọn"}
          </p>

          <p>
            <strong>Bữa trưa:</strong>{" "}
            {menu.lunch || "Chưa chọn"}
          </p>

          <p>
            <strong>Bữa xế chiều:</strong>{" "}
            {menu.snack || "Chưa chọn"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherMenuManager;