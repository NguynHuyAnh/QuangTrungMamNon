# Báo cáo thiết kế — Các tính năng sắp triển khai

> Ngày lập: 2026-06-25 · Dự án: Quang Trung Mầm Non (.NET 8 / EF Core + React)
> Phạm vi: 7 tính năng mới. Tài liệu này **bám chặt DB & code hiện có**; file `luonghoatdongttcn.xlsm` chỉ dùng tham khảo.

---

## 0. Nguyên tắc chung (theo codebase hiện tại)

| Hạng mục | Quy ước |
|---|---|
| Tên bảng | PascalCase số nhiều: `HealthReports`, `ClassTimetables`… |
| Tên cột | PascalCase: `StudentId`, `CreatedAt` |
| Audit | `CreatedAt` (DateTime), `UpdatedAt` (DateTime?), `IsDeleted` (bool, soft-delete) |
| Khóa chính | `Id` (Guid/UUID) |
| FK người dùng | → `AspNetUsers` (ASP.NET Identity, KHÔNG có bảng `Users`) |
| Enum | Lưu **int** (như mọi enum hiện tại), không lưu chuỗi |
| Danh mục | Dùng cờ `IsActive` (bool) giống `Dish`, thay cho `status ACTIVE/INACTIVE` |
| Phân quyền | Policy `{Resource}.{Action}` trong `AppPolicies.cs` + map role tại `Program.cs` |
| Vai trò | `SuperAdmin`, `BanGiamHieu` (BGH), `GiaoVien` (GV), `KeToan`, `PhuHuynh` (PH) |
| PH giới hạn dữ liệu | Lọc qua `UserStudentLinks` (chỉ con đã liên kết) — pattern có sẵn ở `DailyMenusController` |

**Bảng đã có được tham chiếu:** `Students`, `Classes`, `SchoolYears`, `AspNetUsers`, `UserStudentLinks`, `StudentClassAssignments`, `AttendanceRecords`, `DailyMenus`, `DailyMenuItems`, `Dishes`.

---

## 1. Danh mục môn học — `Subjects`

### Schema
| Cột | Kiểu | Bắt buộc | Ràng buộc / Ghi chú |
|---|---|---|---|
| Id | Guid | ✔ | PK |
| Code | varchar(50) | ✔ | UNIQUE — mã môn |
| Name | varchar(255) | ✔ | Tên môn (Âm nhạc, Tiếng Anh…) |
| Description | text | – | |
| ColorCode | varchar(10) | – | Mã màu hiển thị trên TKB |
| IsActive | bool | ✔ | default TRUE |
| CreatedAt / UpdatedAt / IsDeleted | | | Audit |

### Luồng hoạt động
1. BGH/SuperAdmin tạo/sửa môn (mã, tên, màu) → bật/tắt `IsActive`.
2. Staff đọc danh mục để chọn khi lập thời khóa biểu.

### Ghi / Hiển thị
- **Ghi vào:** `Subjects`.
- **Hiển thị/đọc từ:** `Subjects`.

### Phân quyền
- `Subjects.Read` = BGH, GV, SuperAdmin · `Subjects.Write` = BGH, SuperAdmin.

---

## 2. Thời khóa biểu — `ClassTimetables`

### Schema
| Cột | Kiểu | Bắt buộc | Ràng buộc / Ghi chú |
|---|---|---|---|
| Id | Guid | ✔ | PK |
| SchoolYearId | Guid | ✔ | FK → `SchoolYears` |
| ClassId | Guid | ✔ | FK → `Classes` |
| DayOfWeek | int | ✔ | 2–8 (2=Thứ Hai … 8=Chủ Nhật) |
| SlotNo | int | ✔ | Tiết trong ngày (>0) |
| SubjectId | Guid | ✔ | FK → `Subjects` |
| TeacherId | Guid | – | FK → `AspNetUsers` (nullable nếu chưa phân) |
| StartTime / EndTime | TimeOnly | – | EndTime > StartTime |
| Room | varchar(50) | – | Phòng học (text tự do) |
| Note | text | – | |
| CreatedAt / UpdatedAt / IsDeleted | | | Audit |

**Ràng buộc:** UNIQUE `(ClassId, SchoolYearId, DayOfWeek, SlotNo)` (theo pattern `DailyMenu`).

### Luồng hoạt động
1. **Tạo:** BGH chọn năm học → lớp → thứ/tiết → môn → GV → lưu.
   - **Check conflict:** chặn lưu nếu cùng `TeacherId` đã có tiết ở `(SchoolYearId, DayOfWeek, SlotNo)` (lớp khác); hoặc cùng `Room` trùng giờ (best-effort do Room là text).
2. **Xem:** PH/GV chọn lớp/năm → xem lịch theo tuần; PH chỉ xem lớp con mình.

### Ghi / Hiển thị
- **Ghi vào:** `ClassTimetables`.
- **Hiển thị/đọc từ:** `ClassTimetables` JOIN `Subjects` (tên+màu), `Classes`, `SchoolYears`, `AspNetUsers` (tên GV).
- **PH giới hạn lớp con:** đọc `UserStudentLinks` → `StudentClassAssignments` (ToDate null) để lấy lớp.

### Phân quyền
- `Timetable.Read` = staff + PH(lớp con) · `Timetable.Write` = BGH, SuperAdmin.

---

## 3. Báo cáo sức khỏe — `HealthReports`

### Schema
| Cột | Kiểu | Bắt buộc | Ràng buộc / Ghi chú |
|---|---|---|---|
| Id | Guid | ✔ | PK |
| StudentId | Guid | ✔ | FK → `Students` |
| ReportDate | DateOnly | ✔ | INDEX — lọc theo ngày/tháng |
| Height | decimal(5,2) | – | cm, >0 |
| Weight | decimal(5,2) | – | kg, >0 |
| Temperature | decimal(4,1) | – | °C, 35.0–45.0 |
| HeartRate | int | – | nhịp tim, >0 |
| BloodPressure | varchar(20) | – | ví dụ 100/70 |
| Symptoms | text | – | triệu chứng |
| Diagnosis | text | – | chẩn đoán/kết luận |
| Medication | text | – | thuốc đã dùng |
| DoctorNote | text | – | ghi chú y tế |
| ParentNotified | bool | ✔ | default FALSE — GV/Y tế tự đặt khi đã báo PH |
| CreatedByUserId | Guid | ✔ | FK → `AspNetUsers` (người tạo) |
| CreatedAt / UpdatedAt / IsDeleted | | | Audit |

### Luồng hoạt động
1. **Ghi:** GV/Y tế chọn HS → nhập chỉ số + triệu chứng/chẩn đoán → lưu.
   - Nếu bất thường (nhiệt độ cao/triệu chứng): GV liên hệ PH và **tự đặt cờ `ParentNotified`**.
   - ⚠️ **KHÔNG** auto tạo `Announcement` — model thông báo chỉ có scope Toàn trường/Theo lớp, không gửi riêng 1 PH được (tránh lộ thông tin sức khỏe riêng cả lớp).
2. **Xem:** PH/GV chọn HS → lọc ngày/tháng → xem lịch sử.

### Ghi / Hiển thị
- **Ghi vào:** `HealthReports`.
- **Hiển thị/đọc từ:** `HealthReports` JOIN `Students` (tên), `AspNetUsers` (người tạo).
- **PH giới hạn con mình:** đọc `UserStudentLinks`.

### Phân quyền
- `Health.Read` = staff (mọi HS) + PH(con mình) · `Health.Write` = GV, BGH, SuperAdmin.

---

## 4. Thực đơn — thêm bước duyệt (sửa `DailyMenu` hiện có)

> **Tái dùng** `DailyMenu` / `DailyMenuItem` / `Dish` đang chạy. Chỉ thêm field cần thiết cho duyệt.

### Thay đổi schema (thêm vào `DailyMenus`)
| Cột mới | Kiểu | Ghi chú |
|---|---|---|
| Status | int (`MenuStatus{Draft,Approved,Published}`) | default `Published` cho bản ghi cũ khi migrate |
| ApprovedByUserId | Guid? | FK → `AspNetUsers`, có khi đã duyệt |
| ApprovedAt | DateTime? | |

### Luồng hoạt động
1. GV/BGH soạn thực đơn (chọn ngày/bữa/lớp + món từ `Dishes`) → lưu `Draft`.
2. BGH duyệt → `Published`.
3. **Phụ huynh chỉ thấy `Published`**; staff thấy mọi trạng thái (bổ sung điều kiện vào `ApplyVisibilityAsync` sẵn có).

### Ghi / Hiển thị
- **Ghi vào:** `DailyMenus` (đầu mục + status), `DailyMenuItems` (món; snapshot từ `Dishes`).
- **Hiển thị/đọc từ:** `DailyMenus` JOIN `DailyMenuItems`, `Classes`; danh mục món đọc từ `Dishes`.
- **Lọc trạng thái:** PH → `Status = Published`; staff → mọi `Status`.

### Phân quyền
- `Menu.Write` (soạn/sửa draft) = GV, BGH, SuperAdmin (giữ nguyên) · `Menu.Approve` (**mới**) = BGH, SuperAdmin · `Menu.Read` = mọi tài khoản (PH lọc Published + lớp con).

---

## 5. Môn năng khiếu — `ExternalSubjects` + `StudentExternalSubjects`

### Schema `ExternalSubjects` (danh mục môn ngoài)
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| Id | Guid | ✔ | PK |
| Code | varchar(50) | ✔ | UNIQUE (ví dụ SWIM, ENGLISH_CLUB) |
| Name | varchar(255) | ✔ | Bơi, múa, tiếng Anh tăng cường… |
| TeacherId | Guid | – | FK → `AspNetUsers` |
| FeeAmount | decimal(18,2) | – | Học phí, ≥0 |
| MaxStudents | int | – | Sĩ số tối đa, >0 |
| IsActive | bool | ✔ | default TRUE |
| Note | text | – | |
| CreatedAt / UpdatedAt / IsDeleted | | | Audit |

### Schema `StudentExternalSubjects` (bảng nối HS–môn ngoài)
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| Id | Guid | ✔ | PK |
| StudentId | Guid | ✔ | FK → `Students` |
| ExternalSubjectId | Guid | ✔ | FK → `ExternalSubjects` |
| EnrollDate | DateOnly | ✔ | Ngày đăng ký |
| WithdrawDate | DateOnly? | – | ≥ EnrollDate, chỉ có khi ngừng |
| Status | int (`EnrollmentStatus{Active,Inactive,Cancelled}`) | ✔ | |
| PaymentStatus | int (`FeePaymentStatus{Unpaid,Paid}`) | ✔ | default Unpaid |
| PaidAt | DateTime? | – | khi đã thu |
| CollectedByUserId | Guid? | – | FK → `AspNetUsers` (người thu) |
| CreatedAt / UpdatedAt / IsDeleted | | | Audit |

**Ràng buộc:** chặn 1 HS đăng ký trùng — không cho 2 bản ghi `Status=Active` cùng `(StudentId, ExternalSubjectId)`.

### Luồng hoạt động
1. **Danh mục:** BGH tạo môn → nhập học phí/GV/sĩ số tối đa → bật `IsActive`.
2. **Đăng ký:** GV/BGH chọn HS → chọn môn → **check sĩ số** (đếm bản ghi `Active` < `MaxStudents`, chặn nếu đầy) → **check trùng** → lưu `Active/Unpaid`.
3. **Hủy/rút:** xác nhận → set `WithdrawDate` + `Status=Cancelled` (không xóa cứng).
4. **Thu phí (cờ đơn giản):** KeToan lọc danh sách đăng ký → tính tổng theo `FeeAmount` → xác nhận thu → `PaymentStatus=Paid`, ghi `PaidAt` + `CollectedByUserId`. *(Không nối hệ thu phí chính `FeeStructures/Payments`.)*

### Ghi / Hiển thị
- **Ghi vào:** danh mục → `ExternalSubjects`; đăng ký/hủy/thu phí → `StudentExternalSubjects`.
- **Hiển thị/đọc từ:** `StudentExternalSubjects` JOIN `ExternalSubjects` (tên+học phí), `Students` (tên), `AspNetUsers` (GV/người thu).
- **Check sĩ số:** đọc COUNT `StudentExternalSubjects` (Status=Active) theo `ExternalSubjectId`.

### Phân quyền
- `ExternalSubjects.Write` (danh mục) = BGH, SuperAdmin
- `Enrollment.Write` (đăng ký/hủy) = GV, BGH, SuperAdmin
- `Enrollment.CollectFee` (thu phí) = KeToan, SuperAdmin
- Đọc = staff + PH(con mình).

---

## 6. Đơn nghỉ phép **học sinh** — `StudentLeaveRequests`

### Schema
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| Id | Guid | ✔ | PK |
| StudentId | Guid | ✔ | FK → `Students` |
| FromDate | DateOnly | ✔ | ngày bắt đầu nghỉ |
| ToDate | DateOnly | ✔ | ≥ FromDate |
| Reason | text | ✔ | lý do |
| AttachmentUrl | varchar(255) | – | ảnh đơn/giấy khám |
| Status | int (`LeaveStatus{Pending,Approved,Rejected,Cancelled}`) | ✔ | default Pending |
| RequestedByUserId | Guid | ✔ | FK → `AspNetUsers` (PH hoặc GV) |
| ApprovedByUserId | Guid? | – | FK → `AspNetUsers` |
| ApprovedAt | DateTime? | – | |
| RejectReason | text | – | chỉ có khi Rejected |
| CreatedAt / UpdatedAt / IsDeleted | | | Audit |

### Luồng hoạt động
1. **Gửi:** PH/GV chọn HS → từ ngày/đến ngày → lý do (+ ảnh) → gửi → `Pending`.
2. **Duyệt:** GV/BGH mở đơn → duyệt/từ chối (nhập `RejectReason` nếu từ chối).
   - **Khi duyệt → upsert điểm danh:** với mỗi ngày **T2–T6** trong `[FromDate, ToDate]`, tạo/cập nhật `AttendanceRecord` `Status=NghiCoPhep`.
     - Lấy `ClassId` từ `StudentClassAssignments` (ToDate null). Nếu HS **chưa phân lớp** → bỏ qua tạo điểm danh, vẫn duyệt đơn.
     - **Upsert** vì `AttendanceRecords` có UNIQUE `(ClassId, Date, StudentId)`: đã có thì update Status, chưa có thì insert (`RecordedByUserId` = người duyệt).
     - Bỏ qua T7/CN (hằng số ngày học, dễ chỉnh nếu trường học T7).
3. **Huỷ:** người gửi tự huỷ khi đơn còn `Pending`.

### Ghi / Hiển thị
- **Ghi vào:** `StudentLeaveRequests`; khi duyệt ghi thêm `AttendanceRecords` (upsert).
- **Đọc khi duyệt:** `StudentClassAssignments` (lấy lớp), `AttendanceRecords` (kiểm tra tồn tại).
- **Hiển thị/đọc từ:** `StudentLeaveRequests` JOIN `Students`, `AspNetUsers`.
- **PH/GV giới hạn:** PH → con mình (`UserStudentLinks`); GV → lớp mình.

### Phân quyền
- `StudentLeave.Create` = PH, GV, BGH, SuperAdmin
- `StudentLeave.Approve` = GV, BGH, SuperAdmin
- `StudentLeave.Read` = PH(con) + GV(lớp) + BGH/SuperAdmin.

---

## 7. Đơn nghỉ phép **giáo viên/nhân viên** — `StaffLeaveRequests`

> Module nhân sự (HR) thuần — KHÔNG liên quan điểm danh học sinh.

### Schema
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| Id | Guid | ✔ | PK |
| StaffUserId | Guid | ✔ | FK → `AspNetUsers` (người xin nghỉ) |
| LeaveType | int (`StaffLeaveType{PhepNam,NghiBenh,ViecRieng,KhongLuong,Khac}`) | ✔ | |
| FromDate | DateOnly | ✔ | |
| ToDate | DateOnly | ✔ | ≥ FromDate |
| TotalDays | int | ✔ | số ngày nghỉ |
| Reason | text | ✔ | |
| Status | int (`LeaveStatus{Pending,Approved,Rejected,Cancelled}`) | ✔ | default Pending |
| ReviewedByUserId | Guid? | – | FK → `AspNetUsers` |
| ReviewNote | text | – | |
| ReviewedAt | DateTime? | – | |
| CreatedAt / UpdatedAt / IsDeleted | | | Audit |

### Luồng hoạt động
1. **Gửi:** nhân viên chọn loại phép → từ/đến ngày → lý do → gửi → `Pending`.
2. **Duyệt:** BGH duyệt/từ chối (ghi `ReviewNote`).
3. **Huỷ:** tự huỷ khi còn `Pending`.

### Ghi / Hiển thị
- **Ghi vào:** `StaffLeaveRequests`.
- **Hiển thị/đọc từ:** `StaffLeaveRequests` JOIN `AspNetUsers` (tên người xin + người duyệt).

### Phân quyền
- `StaffLeave.Create` = GV, KeToan, BGH
- `StaffLeave.Approve` / đọc tất cả = BGH, SuperAdmin
- Đọc của mình = chính chủ.

---

## 8. Enum mới (lưu int)

| Enum | Giá trị |
|---|---|
| `MenuStatus` | Draft=0, Approved=1, Published=2 |
| `LeaveStatus` | Pending=0, Approved=1, Rejected=2, Cancelled=3 (dùng chung HS & GV) |
| `StaffLeaveType` | PhepNam=0, NghiBenh=1, ViecRieng=2, KhongLuong=3, Khac=4 |
| `EnrollmentStatus` | Active=0, Inactive=1, Cancelled=2 |
| `FeePaymentStatus` | Unpaid=0, Paid=1 |

---

## 9. Bảng phân quyền tổng hợp (policy mới)

| Policy | SuperAdmin | BGH | GiaoVien | KeToan | PhuHuynh |
|---|:--:|:--:|:--:|:--:|:--:|
| `Subjects.Write` | ✔ | ✔ | – | – | – |
| `Timetable.Write` | ✔ | ✔ | – | – | – |
| `Health.Read` | ✔ | ✔ | ✔ | – | con mình |
| `Health.Write` | ✔ | ✔ | ✔ | – | – |
| `Menu.Approve` | ✔ | ✔ | – | – | – |
| `StudentLeave.Create` | ✔ | ✔ | ✔ | – | ✔ |
| `StudentLeave.Approve` | ✔ | ✔ | ✔ | – | – |
| `StaffLeave.Create` | ✔ | ✔ | ✔ | ✔ | – |
| `StaffLeave.Approve` | ✔ | ✔ | – | – | – |
| `ExternalSubjects.Write` | ✔ | ✔ | – | – | – |
| `Enrollment.Write` | ✔ | ✔ | ✔ | – | – |
| `Enrollment.CollectFee` | ✔ | – | – | ✔ | – |

*(Các `*.Read` mặc định = mọi staff; PH luôn giới hạn dữ liệu con mình qua `UserStudentLinks`.)*

---

## 10. Thứ tự triển khai

1. `Subjects` (nền cho TKB)
2. `ClassTimetables`
3. `HealthReports`
4. Thực đơn — thêm duyệt (sửa `DailyMenu`)
5. `ExternalSubjects` + `StudentExternalSubjects`
6. `StudentLeaveRequests` (+ nối điểm danh)
7. `StaffLeaveRequests`

Mỗi bước = 1 migration + entity + controller + policy + trang React, rà code thủ công sau khi viết (không chạy test do thiếu môi trường).
