# Quang Trung MN — Tech stack và vai trò người dùng

Tài liệu tóm tắt công nghệ dự án và các **role** trong hệ thống (quyền API + chức năng trong giao diện). Chi tiết policy đầy đủ nằm trong `backend/QuangTrung.Api/Program.cs` và `backend/QuangTrung.Api/Authorization/AppPolicies.cs`.

---

## Tech stack

### Backend

| Hạng mục | Công nghệ |
|----------|-----------|
| Runtime / ngôn ngữ | **C#**, **.NET 10** (`net10.0`) |
| Kiển trúc | **Clean Architecture**: `Domain` → `Application` → `Infrastructure` → `Api` |
| API | **ASP.NET Core 10** Web API, OpenAPI (`/openapi/v1.json` khi Development) |
| Database | **PostgreSQL** qua **Entity Framework Core 10** + provider **Npgsql** |
| Identity & bảo mật | **ASP.NET Core Identity**, xác thực **JWT Bearer** (HS256) |
| Phân quyền | **Authorization policies** theo role (`RequireRole`, tên policy trong `AppPolicies`) |
| Tích hợp thanh toán | **ZaloPay** (sandbox/prod qua cấu hình `ZaloPay` trong `appsettings`) |
| Kiểm thử | **xUnit**, **WebApplicationFactory**, EF **InMemory** khi `ASPNETCORE_ENVIRONMENT=Testing` |

### Frontend

| Hạng mục | Công nghệ |
|----------|-----------|
| Framework | **React 18** |
| Ngôn ngữ | **TypeScript** |
| Build / dev server | **Vite 5** |
| Routing | **react-router-dom** v6 |
| Styling | **Tailwind CSS 3**, **PostCSS** |
| API | Fetch tới `/api` (Vite proxy; có thể chỉnh proxy/`VITE_PROXY_TARGET`) |
| Overlay modal | **`ModalPortal`** — `createPortal` vào `document.body` để tránh lỗi `fixed` trong layout có `transform` |

### DevOps / vận hành gợi ý

- **Cấu hình nhạy cảm**: file **`.env`** ở root repo (mẫu `.env.example`), API nạp bằng **DotNetEnv** trước `appsettings`; frontend có `frontend/.env` / `.env.example` (`VITE_*`).
- Migration: `dotnet ef database update --project backend/QuangTrung.Infrastructure --startup-project backend/QuangTrung.Api`
- Xuất DB: `.\scripts\export-postgres.ps1` → `database/exports/*.sql`
- Chạy song song API + web: `npm run dev:all` trong thư mục `frontend` (Concurrently).

---

## Danh sách role (chuỗi trong JWT / Identity)

Định nghĩa hằng số: `backend/QuangTrung.Application/Constants/AppRoles.cs`.

| Role (API) | Tên hiển thị gợi ý |
|------------|-------------------|
| `SuperAdmin` | Quản trị hệ thống (cao nhất) |
| `BanGiamHieu` | Ban giám hiệu |
| `GiaoVien` | Giáo viên |
| `KeToan` | Kế toán |
| `PhuHuynh` | Phụ huynh |

Hệ thống giao diện nội bộ gán **nhân viên** (`SuperAdmin`, `BanGiamHieu`, `GiaoVien`, `KeToan`) vào khu **`/app/...`**; **`PhuHuynh`** sau đăng nhập vào khu **`/parent/...`**.

---

## Chức năng theo từng role

### SuperAdmin — **Quản trị hệ thống**

**API / nghiệp vụ:**

- Toàn quyền các policy gắn **Ban giám hiệu**, **Giáo viên**, **Kế toán** và thêm các mục chỉ SuperAdmin:
  - **Người dùng**: `Users.Manage` — sửa, xóa, đổi role, khóa tài khoản (BGH chỉ đọc + tạo tài khoản GV/Kế toán).
  - Tạo tài khoản nội bộ với **mọi role được phép** (trừ tạo SuperAdmin từ API đăng ký công khai — luồng đó dành cho staff do BGH/SuperAdmin gọi).
- Cùng quyền **BGH** với các module: catalog ghi (`Catalog.Write`), lớp ghi (`Classes.Write`), học sinh ghi (`Students.Write`), duyệt/đăng thông báo toàn trường (`Announcements.PublishSchool`), học phí ghi (`Fees.Write`), ghi nhận thanh toán (`Payments.Write`), tạo đơn ZaloPay (`Payments.ZaloPayCreate`), dashboard + xuất CSV (`Dashboard.Export`).
- Liên kết phụ huynh–học sinh: `ParentLinks.Manage`.

**UI (`/app`):**

- Sidebar đầy đủ như BGH **và** mục **Người dùng**, với khả năng **quản trị User** (sửa/xóa/khóa/đổi role — theo kiểm tra cục bộ và API).
- Xuất báo cáo tổng quan (**CSV**) nếu có nút chức năng (policy `Dashboard.Export`).

---

### BanGiamHieu — **Ban giám hiệu**

**API / nghiệp vụ:**

- **Danh mục năm học / khối / lớp**: đọc + **ghi** (CRUD catalog & classes).
- **Học sinh**: đọc danh sách nội bộ (`Students.ReadInternal`), **tạo/sửa/xóa/ghi danh** (`Students.Write`), gán lớp (`class-assignments` theo luồng API).
- **Điểm danh**: đọc + ghi (`Attendance.Read` / `Attendance.Write`).
- **Thông báo**: đọc; duyệt đăng toàn trường (`Announcements.PublishSchool`); có thể tạo/sửa bản nháp phạm vi lớp (`Announcements.ClassDraft`); logic server có phần chỉ **BGH/SuperAdmin** xem được toàn bộ bản nháp (ngoài chủ nhân bản nháp).
- **Học phí**: đọc biểu phí & gán phí (`Fees.Read`, `Fees.ReadAssignments`). **`Fees.Write`** (tạo/sửa/xóa biểu phí và gán phí) chỉ **Kế toán + SuperAdmin** — BGH trên UI **chỉ xem**, không có nút ghi.
- **Thanh toán / hóa đơn**: **chỉ đọc** danh sách & tổng hợp (`Payments.ReadSummary`) — xem lịch sử, in/xem biên lai trên UI. **Ghi nhận thu thủ công** (`Payments.Write`) và **tạo đơn ZaloPay** (`Payments.ZaloPayCreate`) **không** thuộc BGH trong policy; hai quyền đó chỉ **Kế toán** và **SuperAdmin** (ZaloPay thêm **Phụ huynh**). *Dashboard*: BGH vẫn thấy **tổng thu tháng** trong `staff-summary` (giống Kế toán).
- **Dashboard**: đọc tổng quan (`Dashboard.Read`), **xuất báo cáo CSV** (`Dashboard.Export`).
- **Người dùng**: xem danh sách (`Users.ReadDirectory`), tạo **Giáo viên / Kế toán ** qua API staff (`Users.CreateStaff` — role được phép theo controller; BGH chỉ GV hoặc Kế toán). **Không** có `Users.Manage`.

**Đăng ký staff:** `POST /api/auth/register-staff` chỉ cho phép **`GiaoVien`** hoặc **`KeToan`**.

**UI (`/app`):**

- Có menu: Tổng quan, Năm học & lớp, Học sinh, Điểm danh, Thông báo, khối **Kế toán & thu** (**Biểu phí**, **Gán phí**, **Thanh toán**: BGH **chỉ xem**, không nút “Ghi nhận”; **Hóa đơn**: **chỉ xem**/in — **sửa/xóa** chỉ **Kế toán + SuperAdmin**), **Người dùng** (danh sách + tạo GV/Kế toán).
- Xuất báo cáo dashboard (CSV).

---

### GiaoVien — **Giáo viên**

**API / nghiệp vụ:**

- **Danh mục / lớp**: đọc (`Catalog.Read`, `ClassesRead`) nhưng phạm vi dữ liệu **ưu tiên lớp mình chủ nhiệm** (homeroom) trong một số truy vấn (students, classes, attendance).
- **Học sinh**: chỉ đọc / thao tác trong phạm vi lớp Chủ nhiệm (filter phía controller).
- **Điểm danh**: đọc + ghi cho các lớp được phép.
- **Thông báo**: đọc; tạo/sửa **bản nháp phạm vi lớp** (`Announcements.ClassDraft`).

**Không có** (policy): ghi catalog, ghi lớp cấu hình, ghi học sinh toàn trường, ghi học phí, ghi thanh toán, quản lý user, liên kết PH–HS, xuất CSV leadership.

**UI (`/app`):**

- Menu: Tổng quan, Năm học & lớp, Học sinh, Điểm danh, Thông báo.
- **Không** thấy nhóm “Kế toán & thu”, **không** “Người dùng”.
- **Tổng quan**: API `staff-summary` **thu hẹp** theo lớp chủ nhiệm (số lớp, học sinh, v.v.); **không** hiển thị tổng thu tháng như Kế toán/BGH (server trả `null` cho trường đó với role Giáo viên).

---

### KeToan — **Kế toán**

**API / nghiệp vụ:**

- **Catalog / lớp**: **đọc** (`Catalog.Read`) — API cho phép; trên **UI** menu “Năm học & lớp” bị **ẩn** (tránh nhầm với quyền BGH; vẫn có thể gọi API trực tiếp nếu cần).
- **Học sinh**: **không** `StudentsReadInternal` / **không** `StudentsWrite` — không quản lý hồ sơ HS từ policy chuẩn.
- **Điểm danh**: **không** có `AttendanceWrite`; đọc điểm danh phụ thuộc policy — trong `Program.cs`, `AttendanceRead` **có** `KeToan` (nếu có route dùng policy này).
- **Học phí**: đọc + **ghi** biểu phí & gán phí (`Fees.Read`, `Fees.Write`, `Fees.ReadAssignments`).
- **Thanh toán**: đọc + **ghi** (`Payments.Write`), đọc summary (`Payments.ReadSummary`), tạo **ZaloPay** (`Payments.ZaloPayCreate`).
- **Dashboard**: đọc (`Dashboard.Read`), thấy **tổng thu tháng**; **không** xuất CSV (`Dashboard.Export`).

**UI (`/app`):**

- Menu: Tổng quan, Thông báo, và khối **Kế toán & thu** (Biểu phí, Gán phí, Thanh toán, Hóa đơn).
- **Không** menu: Năm học & lớp, Học sinh, Điểm danh, Người dùng (theo `AdminLayout` + `staffNavAccess`).

---

### PhuHuynh — **Phụ huynh**

**API / nghiệp vụ:**

- **Con em**: chỉ các học sinh có **`UserStudentLink`** với tài khoản (`Students.ReadOwnChildren`, `/api/students/me/children`).
- **Điểm danh**: đọc theo con (`Attendance.Read`).
- **Thông báo**: đọc (chỉ thông báo áp dụng được với phụ huynh/con; bản nháp không public).
- **Gán phí / công nợ**: đọc phân công & tình trạnh thu **chỉ cho con đã liên kết** (`Fees.ReadAssignments`, payments list/summary filter theo học sinh).
- **Thanh toán**: xem lịch sử & tổng hợp của con; tạo **ZaloPay** cho khoản của con (`Payments.ZaloPayCreate`).

**Không** truy cập catalog ghi, học sinh nội bộ, ghi điểm danh, đăng thông báo toàn trường, ghi học phí, ghi nhận thu thủ công nội bộ, quản trị user.

**UI (`/parent`):**

- Tổng quan phụ huynh, Điểm danh, Thông báo, **Học phí / thanh toán** (kèm luồng ZaloPay khi bật cấu hình).

---

## Bảng tham chiếu nhanh policy → role (từ `Program.cs`)

| Policy (tên) | Role được phép |
|--------------|----------------|
| `Catalog.Read` | BGH, Giáo viên, **Kế toán**, SuperAdmin |
| `Catalog.Write` | BGH, SuperAdmin |
| `Classes.Read` / `Classes.Write` | Read: BGH, GV, SuperAdmin — Write: BGH, SuperAdmin |
| `Students.ReadInternal` / `Students.Write` | Read: BGH, GV, SuperAdmin — Write: BGH, SuperAdmin |
| `Students.ReadOwnChildren` | Phụ huynh |
| `Students.BillingRead` | Kế toán, BGH, SuperAdmin |
| `Attendance.Read` | BGH, GV, SuperAdmin, Phụ huynh |
| `Attendance.Write` | GV, BGH, SuperAdmin |
| `Announcements.PublishSchool` | BGH, SuperAdmin |
| `Announcements.ClassDraft` | GV, BGH, SuperAdmin |
| `Fees.Read` / `Fees.Write` | Read: Kế toán, BGH, SuperAdmin — Write: Kế toán, SuperAdmin |
| `Fees.ReadAssignments` | Kế toán, BGH, SuperAdmin, Phụ huynh |
| `Payments.ReadSummary` | Kế toán, BGH, SuperAdmin, Phụ huynh |
| `Payments.Write` | Kế toán, SuperAdmin |
| `Payments.ZaloPayCreate` | Kế toán, SuperAdmin, Phụ huynh |
| `Users.ReadDirectory` / `Users.CreateStaff` | BGH, SuperAdmin |
| `Users.Manage` | SuperAdmin |
| `ParentLinks.Manage` | BGH, SuperAdmin |
| `Dashboard.Read` | BGH, GV, Kế toán, SuperAdmin |
| `Dashboard.Export` | BGH, SuperAdmin |

---

## Tài khoản demo (seed)

Mật khẩu mặc định trong tài liệu dự án: **`Demo@123`**. Email theo bảng trong `README.md` (root repo).

---

*Tài liệu này phản ánh codebase tại thời điểm tạo; nếu `Program.cs` hoặc menu `AdminLayout` thay đổi, hãy cập nhật file này cho khớp.*
