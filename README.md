# Quang Trung MN – Backend API (đồ án)

Hệ thống quản lý trường mầm non: **ASP.NET Core 10 Web API**, **PostgreSQL**, **EF Core**, **ASP.NET Core Identity + JWT**, phân quyền theo **policy/role**. Kiến trúc **Clean Architecture** (`Domain` → `Application` → `Infrastructure` → `Api`).

## Yêu cầu môi trường

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [PostgreSQL](https://www.postgresql.org/download/) (chạy API ở môi trường Development/Production, **không** bắt buộc khi chạy `dotnet test` vì test dùng InMemory)
- (Khuyến nghị) Công cụ migration: `dotnet tool install --global dotnet-ef`

## Cấu hình `.env` (khuyến nghị)

**Chuỗi kết nối, JWT, ZaloPay** nên đặt trong file **`.env` ở thư mục gốc repo** (cùng cấp `README.md`), không commit (đã có trong `.gitignore`). API dùng package **DotNetEnv** và nạp `.env` trước khi đọc `appsettings` — biến môi trường (ví dụ `Jwt__Key`) **ghi đè** JSON theo chuẩn ASP.NET Core (`__` = cấp lồng nhau).

1. Sao chép mẫu: `copy .env.example .env` (PowerShell có thể dùng `Copy-Item .env.example .env`).
2. Trong `.env` chỉnh ít nhất:
   - `ConnectionStrings__DefaultConnection` — Npgsql đúng máy bạn.
   - `Jwt__Key` — bí mật **tối thiểu ~32 byte UTF-8** (HS256). Production bắt buộc đổi.
   - (Tuỳ chọn) các khóa `ZaloPay__*` khi bật sandbox/production.

[Mục Appsettings không chứa bí mật](backend/QuangTrung.Api/appsettings.json) chỉ còn giá trị mặc định / trống; **không** dùng lại để lưu mật khẩu DB hay key ZaloPay trên git.

**Frontend (`frontend/`)**: [`.env.example`](frontend/.env.example) và (tuỳ chọn) [`.env`](frontend/.env) cho `VITE_PROXY_TARGET`, `VITE_API_BASE_URL` — chỉ tiền tố `VITE_` được Vite nhúng vào bundle.

## Xuất PostgreSQL (schema + dữ liệu)

Cần **`pg_dump`** trong PATH (cài PostgreSQL client tools):

```powershell
.\scripts\export-postgres.ps1
```

Script đọc `ConnectionStrings__DefaultConnection` từ `.env`, ghi file `database/exports/quangtrung_mn-YYYYMMDD-HHMMSS.sql`. Thư mục xuất đã được `.gitignore` để tránh commit nhầm dữ liệu thật. Có thể truyền thủ công: `-Host`, `-Port`, `-Database`, `-User`, `-Password`.

Tài khoản demo (seed tự động khi chạy app, mật khẩu **`Demo@123`**):

| Email                 | Role        |
|-----------------------|------------|
| superadmin@demo.local | SuperAdmin |
| bangiamhieu@demo.local| BanGiamHieu|
| giaovien@demo.local   | GiaoVien   |
| ketoan@demo.local     | KeToan     |
| phuhuynh@demo.local   | PhuHuynh   |

## Tạo / cập nhật database (PostgreSQL)

Từ thư mục repo:

```powershell
dotnet ef database update --project backend/QuangTrung.Infrastructure --startup-project backend/QuangTrung.Api
```

Nếu chưa có migration (đã có sẵn `InitialCreate`):

```powershell
dotnet ef migrations add TenMigration --project backend/QuangTrung.Infrastructure --startup-project backend/QuangTrung.Api --output-dir Persistence/Migrations
```

## Chạy API

```powershell
cd backend/QuangTrung.Api
dotnet run
```

- HTTP: xem cổng trong console (thường `http://localhost:5xxx`).
- OpenAPI (Development): `GET /openapi/v1.json`.
- Đăng nhập: `POST /api/auth/login` body JSON `{ "email": "...", "password": "Demo@123" }`, dùng `accessToken` trong header `Authorization: Bearer ...`.

### Đăng ký

- `POST /api/auth/register-parent` (không cần token): `{ "email", "password", "fullName", "studentIdToLink": null | guid, "studentRegistrationCodeToLink": null | string }` — tạo tài khoản role `PhuHuynh`; nếu `studentIdToLink` hoặc `studentRegistrationCodeToLink` (mã ví dụ **`QT-2025-001`** trên học sinh seed) khớp học sinh đang tồn tại thì tạo `UserStudentLink`.
- `POST /api/auth/register-staff` (Bearer, policy `Users.CreateStaff` — `SuperAdmin` hoặc `BanGiamHieu`): `{ "email", "password", "fullName", "role" }` — `role` là `GiaoVien` hoặc `KeToan`.

### Phân trang & tìm kiếm (pattern chung)

Nhiều `GET` trả `PagedResult<T>` với `items`, `totalCount`, `page`, `pageSize`. Tham số query thường gặp:

- `page`, `pageSize` — phân trang (có chuẩn hóa trong API).
- `q` — tìm theo chuỗi (tên, tiêu đề, … tùy module).
- Bộ lọc theo khóa ngoại hoặc ngày: xem từng nhóm route bên dưới.

### Bảng endpoint chính (tóm tắt)

| Nhóm | Base path | Ghi chú |
|------|-----------|---------|
| Năm học | `/api/school-years` | CRUD; `GET`: `q`, `isCurrent`, `page`, `pageSize` |
| Khối | `/api/grades` | CRUD; `GET`: `q`, `page`, `pageSize` |
| Lớp | `/api/classes` | CRUD (soft delete); `GET`: `schoolYearId`, `gradeId`, `q`, phân trang |
| Học sinh | `/api/students` | CRUD; `GET`: `q`, `status`, `classId`, `schoolYearId`, phân trang; `GET /me/children` (phụ huynh); `GET /billing-view`; `POST /{id}/class-assignments` |
| Liên kết PH–HS | `/api/parent-links` | Gán / gỡ `UserStudentLink` |
| Điểm danh | `/api/attendance` | `GET /records`: `from`, `to`, `classId`, `studentId`, phân trang; `POST /records`, `PUT /records/{id}`, `POST /records/bulk` |
| Thông báo | `/api/announcements` | `GET`: `q`, `status`, phân trang; `POST /draft`; `PUT /{id}/publish` |
| Biểu phí | `/api/fee-structures` | CRUD + lọc theo năm học |
| Gán phí | `/api/student-fee-assignments` | CRUD + lọc `studentId`, `month`, `schoolYearId` |
| Thu tiền | `/api/payments` | `GET`, `GET /summary`, `POST`; lọc `studentId`, `from`, `to` |
| Dashboard (nội bộ) | `/api/dashboard/staff-summary` | `GET` — số học sinh, lớp, thông báo đã publish, tổng thu tháng UTC (Kế toán/BGH/SuperAdmin) |
| ZaloPay (sandbox) | `/api/payments/zalopay` | `POST /create` (JWT, policy thu phí); `POST /callback` (IPN, không JWT); `POST /query`; `GET /return` (redirect sau thanh toán) |
| Công nợ | `/api/billing/students/{studentId}/balance` | `schoolYearId`, `month` (query) |

#### ZaloPay (tích hợp theo tài liệu v2 / MAC key1–key2)

- Bật và cấu hình các biến **`ZaloPay__*`** trong **`.env`** (xem [`.env.example`](.env.example)): `Enabled`, `AppId`, `Key1`, `Key2`, endpoint tạo/truy vấn, `CallbackBaseUrl` (HTTPS công khai, ví dụ **ngrok** — API ghép `…/api/payments/zalopay/callback`), `ReturnRedirectUrl` (redirect SPA sau thanh toán).
- Sandbox demo: [.env.example](.env.example) có block comment credential mẫu **app 2554** — chỉ dùng dev, production phải đổi.
- **Luồng**: kế toán gọi `POST /api/payments/zalopay/create` → nhận `orderUrl` (mở cổng ZaloPay / QR) → khách thanh toán → ZaloPay `POST` callback → hệ thống verify MAC **key2**, ghi `Payment` với `PaymentMethod.ZaloPay` và cập nhật `ZaloPayOrder`.
- **Migration**: bảng `ZaloPayOrders` — chạy `dotnet ef database update` sau khi cập nhật code.
- Tham chiếu nội bộ: [zalopay-sandbox-huong-dan-csharp.txt](zalopay-sandbox-huong-dan-csharp.txt); tài liệu chính thức: [developers.zalopay.vn](https://developers.zalopay.vn/v2/general/overview.html).

Chi tiết policy/role: [AppPolicies.cs](backend/QuangTrung.Api/Authorization/AppPolicies.cs).

## Chạy kiểm thử API (xUnit + WebApplicationFactory)

```powershell
dotnet test tests/QuangTrung.Api.Tests
```

Môi trường test đặt `ASPNETCORE_ENVIRONMENT=Testing`: API dùng **EF InMemory**, seed dữ liệu qua `EnsureCreated` (không cần PostgreSQL). Có thêm các lớp test: đăng ký (`AuthRegisterTests`), tổng quan dashboard (`DashboardSummaryTests`), ma trận CRUD/policy (`CrudAuthorizationTests`), phân trang và `q` trên danh sách học sinh (`PagingAndFilterTests`), callback ZaloPay (`ZaloPayCallbackTests`).

## Cấu trúc thư mục

- `backend/QuangTrung.Domain` – Entity, enum.
- `backend/QuangTrung.Application` – DTO/auth, interface JWT, hằng role.
- `backend/QuangTrung.Infrastructure` – DbContext, Identity, seed, migration, triển khai JWT signer.
- `backend/QuangTrung.Api` – `Program.cs`, JWT bearer validation, policies, controllers.
- `tests/QuangTrung.Api.Tests` – kiểm thử HTTP + ma trận 401/403/200 theo role.

## Ghi chú đồ án

- Phân quyền: xem `AppPolicies` trong [backend/QuangTrung.Api/Authorization/AppPolicies.cs](backend/QuangTrung.Api/Authorization/AppPolicies.cs) và đăng ký policy trong [Program.cs](backend/QuangTrung.Api/Program.cs).
- **Giao diện React** (`frontend/`): chạy API (`dotnet run` trong `backend/QuangTrung.Api`), có **`.env` gốc** với PostgreSQL/JWT đã chỉnh, sau đó `cd frontend`, `npm install`, `npm run dev` (proxy `/api` — mặc định tới cổng profile `http` trong `launchSettings.json`, thường `5022`; chỉnh `VITE_PROXY_TARGET` trong [`frontend/.env`](frontend/.env) nếu khác). Đăng nhập nội bộ → `/app/dashboard` (dữ liệu `GET /api/dashboard/staff-summary`); phụ huynh / đăng ký → `/parent` (`GET /api/students/me/children`).
- Sau khi cập nhật code có migration mới: `dotnet ef database update --project backend/QuangTrung.Infrastructure --startup-project backend/QuangTrung.Api` (migration **`AddStudentRegistrationCode`**: cột `Students.RegistrationCode` — mã demo liên kết đăng ký phụ huynh: **`QT-2025-001`** trên học sinh seed *Nguyễn Văn Bé*).
