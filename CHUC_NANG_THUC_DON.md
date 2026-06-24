# Chức năng Thực đơn (Menu) — Tổng kết & Hướng dẫn hoàn thiện

Tài liệu mô tả toàn bộ phần đã code cho chức năng **Thực đơn** và các bước còn lại để chạy được.

## 1. Luồng nghiệp vụ

- **SuperAdmin / Ban giám hiệu (BGH)**: khai báo CRUD **danh mục loại thức ăn** (Dish).
- **Giáo viên / BGH / SuperAdmin**: lập **thực đơn hằng ngày** (DailyMenu) theo từng ngày + bữa, chọn món từ danh mục. Phạm vi: **toàn trường** hoặc **theo lớp**.
- **Phụ huynh**: xem **bữa ăn hôm nay của bé** và **lịch sử bữa ăn** (chỉ thực đơn lớp con đang học + thực đơn toàn trường).

## 2. Mô hình dữ liệu (3 bảng mới)

| Bảng | Vai trò | Điểm chính |
|------|---------|-----------|
| `Dishes` | Danh mục loại thức ăn | `Name, Ingredients, NutritionNote, CaloriesKcal, ContainsAllergen, AllergenNote, IsActive` + soft-delete (`IsDeleted`) |
| `DailyMenus` | Thực đơn 1 ngày + 1 bữa | `MenuDate, MealType, ClassId? (null = toàn trường), SchoolYearId, Description, CreatedByUserId`; unique `(MenuDate, MealType, ClassId)` |
| `DailyMenuItems` | Món trong thực đơn | Tham chiếu `DishId?` **+ snapshot** (`DishName, Ingredients, CaloriesKcal, ContainsAllergen...`) để lịch sử không sai khi món gốc bị sửa/ẩn |

`MealType` (enum): `0=Bữa sáng, 1=Bữa trưa, 2=Bữa xế, 3=Bữa chiều`.

> **Vì sao lưu snapshot:** khi BGH sửa hoặc ẩn (soft-delete) một món trong danh mục, các thực đơn cũ vẫn hiển thị đúng nội dung tại thời điểm lập. Khi tạo/sửa thực đơn, server **lấy snapshot trực tiếp từ `Dish`** theo `DishId` (server-authoritative).

## 3. Phân quyền (policy)

Đăng ký trong `backend/QuangTrung.Api/Program.cs`, tên hằng trong `AppPolicies.cs`:

| Policy | Role được phép |
|--------|----------------|
| `Dishes.Read` | BGH, Giáo viên, SuperAdmin |
| `Dishes.Write` | BGH, SuperAdmin |
| `Menu.Read` | Mọi tài khoản đã đăng nhập (gồm Phụ huynh) |
| `Menu.Write` | Giáo viên, BGH, SuperAdmin |

Phụ huynh đọc thực đơn nhưng controller **lọc theo lớp con** (qua `UserStudentLinks → StudentClassAssignments`, giống `AnnouncementsController`).

## 4. API mới

**`/api/dishes`** (`DishesController`)
- `GET /api/dishes?q=&activeOnly=&page=&pageSize=` — danh sách phân trang
- `GET /api/dishes/{id}`
- `POST /api/dishes` · `PUT /api/dishes/{id}` · `DELETE /api/dishes/{id}` (soft-delete)

**`/api/daily-menus`** (`DailyMenusController`)
- `GET /api/daily-menus?date=&from=&to=&mealType=&classId=&page=` — danh sách / lịch sử (lọc theo role)
- `GET /api/daily-menus/today` — thực đơn hôm nay (giờ VN) của người dùng hiện tại, kèm món
- `GET /api/daily-menus/{id}` — chi tiết + danh sách món
- `POST /api/daily-menus` · `PUT /api/daily-menus/{id}` · `DELETE /api/daily-menus/{id}`

## 5. Danh sách file

### Backend (.NET)
**Mới**
- `QuangTrung.Domain/Enums/MealType.cs`
- `QuangTrung.Domain/Entities/Dish.cs`
- `QuangTrung.Domain/Entities/DailyMenu.cs`
- `QuangTrung.Domain/Entities/DailyMenuItem.cs`
- `QuangTrung.Api/Controllers/DishesController.cs`
- `QuangTrung.Api/Controllers/DailyMenusController.cs`
- `QuangTrung.Infrastructure/Persistence/Migrations/20260624000000_AddMenuFeature.cs`
- `QuangTrung.Infrastructure/Persistence/Migrations/20260624000000_AddMenuFeature.Designer.cs`

**Sửa**
- `QuangTrung.Infrastructure/Persistence/ApplicationDbContext.cs` — thêm 3 DbSet + cấu hình
- `QuangTrung.Infrastructure/Persistence/Migrations/ApplicationDbContextModelSnapshot.cs` — thêm 3 entity
- `QuangTrung.Infrastructure/DataSeeder.cs` — seed món + thực đơn hôm nay (idempotent)
- `QuangTrung.Api/Authorization/AppPolicies.cs` — 4 policy mới
- `QuangTrung.Api/Program.cs` — đăng ký 4 policy

### Frontend (React + TS)
**Mới**
- `src/pages/DishesPage.tsx` — CRUD danh mục món (staff)
- `src/pages/MenuPage.tsx` — list/lịch sử + builder lập thực đơn (staff)
- `src/pages/parent/ParentMenuPage.tsx` — bữa hôm nay + lịch sử (phụ huynh)

**Sửa**
- `src/types/menu.ts` — kiểu khớp DTO backend (đã bỏ mock cũ)
- `src/api/client.ts` — các hàm API menu
- `src/auth/staffNavAccess.ts` — `canStaffAccessDishesNav`, `canStaffAccessMenuNav`
- `src/layouts/AdminLayout.tsx` — menu sidebar "Loại thức ăn", "Thực đơn"
- `src/layouts/ParentLayout.tsx` — menu "Thực đơn"
- `src/App.tsx` — routes `/app/dishes`, `/app/menu`, `/parent/menu`

## 6. Các bước để chạy (BẮT BUỘC)

> Môi trường hiện chưa cài .NET nên migration **chưa được áp**. File migration đã viết sẵn, chỉ cần chạy.

1. **Cập nhật database** (từ thư mục gốc repo):
   ```bash
   dotnet ef database update \
     --project backend/QuangTrung.Infrastructure \
     --startup-project backend/QuangTrung.Api
   ```
   Hoặc chỉ cần chạy API — `DataSeeder` gọi `db.Database.MigrateAsync()` lúc khởi động sẽ tự áp migration `AddMenuFeature` và seed dữ liệu mẫu.

2. **Chạy thử**:
   ```bash
   cd frontend && npm run dev:all
   ```
   (chạy song song API .NET + web Vite)

3. **Kiểm thử theo role** (mật khẩu demo: `Demo@123`):
   - `bangiamhieu@demo.local` / `superadmin@demo.local`: vào **Loại thức ăn** (CRUD) + **Thực đơn**.
   - `giaovien@demo.local`: vào **Thực đơn**, tạo thực đơn chọn món từ danh mục (không sửa được danh mục).
   - `phuhuynh@demo.local`: vào **Thực đơn** → tab **Hôm nay** / **Lịch sử bữa ăn**.

## 7. Đã kiểm tra

- Frontend: `tsc -b` (typecheck toàn bộ) **pass, 0 lỗi**.
- Backend: review tĩnh (chưa build vì máy chưa có .NET). Migration + ModelSnapshot + Designer cân khớp model; cân bằng ngoặc OK.

## 8. Ghi chú / có thể mở rộng sau

- Thực đơn "theo lớp": dropdown lớp lấy theo **năm học hiện tại**. Nếu cần chọn năm khác, mở rộng filter ở `MenuPage`.
- Có thể bổ sung: nhân bản thực đơn sang ngày khác, in thực đơn tuần, đính kèm ảnh món (qua Media Service).
- `SchoolYearId` của thực đơn được server tự suy ra từ năm học hiện tại nếu client không gửi.
