import { useState } from "react";

interface Food {
  id: number;
  name: string;
  type: string;
}

export const FoodDeclaration = () => {
  const [foods, setFoods] = useState<Food[]>([
    { id: 1, name: "Cháo sườn", type: "Bữa sáng" },
  ]);

  const [newFood, setNewFood] = useState({
    name: "",
    type: "Bữa sáng",
  });

  const handleAddFood = () => {
    if (!newFood.name.trim()) {
      alert("Vui lòng nhập tên món ăn");
      return;
    }

    const food: Food = {
      id: Date.now(),
      name: newFood.name,
      type: newFood.type,
    };

    setFoods([...foods, food]);

    setNewFood({
      name: "",
      type: "Bữa sáng",
    });
  };

  const handleDelete = (id: number) => {
    setFoods(foods.filter((food) => food.id !== id));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Khai báo món ăn</h2>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Tên món ăn"
          value={newFood.name}
          onChange={(e) =>
            setNewFood({ ...newFood, name: e.target.value })
          }
        />

        <select
          value={newFood.type}
          onChange={(e) =>
            setNewFood({ ...newFood, type: e.target.value })
          }
        >
          <option>Bữa sáng</option>
          <option>Bữa trưa</option>
          <option>Bữa phụ</option>
        </select>

        <button onClick={handleAddFood}>Thêm món</button>
      </div>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên món</th>
            <th>Loại bữa</th>
            <th>Thao tác</th>
          </tr>
        </thead>

        <tbody>
          {foods.map((food) => (
            <tr key={food.id}>
              <td>{food.id}</td>
              <td>{food.name}</td>
              <td>{food.type}</td>
              <td>
                <button onClick={() => handleDelete(food.id)}>
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};