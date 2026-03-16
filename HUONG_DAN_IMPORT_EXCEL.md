# 📘 HƯỚNG DẪN NHẬP DỮ LIỆU VÀO FILE EXCEL

## 🎯 Bước 1: Tải file template

Gọi API: `GET /api/students/export/template`

File Excel sẽ có cấu trúc như sau:

| Cột | Tên cột | Bắt buộc | Mô tả | Ví dụ |
|-----|---------|----------|-------|-------|
| A | Tên đăng nhập (*) | ✅ Có | Username để đăng nhập hệ thống, PHẢI DUY NHẤT | `nguyenvana` |
| B | Mật khẩu (*) | ✅ Có | Mật khẩu đăng nhập | `123456` |
| C | Mã học sinh (*) | ✅ Có | Mã học sinh, PHẢI DUY NHẤT | `HS001` |
| D | Họ và tên (*) | ✅ Có | Họ tên đầy đủ | `Nguyễn Văn A` |
| E | Ngày sinh | ❌ Không | Định dạng: dd/mm/yyyy | `01/01/2010` |
| F | Giới tính (*) | ✅ Có | CHỈ nhập: `Nam` hoặc `Nữ` | `Nam` |
| G | Địa chỉ | ❌ Không | Địa chỉ đầy đủ | `123 Đường ABC, Q.1, TP.HCM` |
| H | Số điện thoại | ❌ Không | Số điện thoại liên hệ | `0123456789` |
| I | Email | ❌ Không | Email học sinh | `nguyenvana@example.com` |
| J | Năm nhập học | ❌ Không | Năm nhập học (số) | `2024` |

## 📝 Bước 2: Điền dữ liệu

### ✅ ĐÚNG - Ví dụ dữ liệu chuẩn:

**Cách 1: Username và Mã học sinh GIỐNG NHAU (Đơn giản, dễ nhớ):**

**Dòng 2:**
```
HS001 | 123456 | HS001 | Nguyễn Văn A | 01/01/2010 | Nam | 123 Đường ABC | 0123456789 | nva@school.com | 2024
```

**Dòng 3:**
```
HS002 | 123456 | HS002 | Trần Thị B | 15/05/2010 | Nữ | 456 Đường XYZ | 0987654321 | ttb@school.com | 2024
```

**Dòng 4:**
```
HS003 | 123456 | HS003 | Lê Văn C | 20/12/2009 | Nam | 789 Đường DEF | 0912345678 | lvc@school.com | 2023
```

**Cách 2: Username và Mã học sinh KHÁC NHAU:**

**Dòng 2:**
```
nguyenvana | 123456 | HS001 | Nguyễn Văn A | 01/01/2010 | Nam | 123 Đường ABC | 0123456789 | nva@school.com | 2024
```

**Dòng 3:**
```
tranthib | abcd1234 | HS002 | Trần Thị B | 15/05/2010 | Nữ | 456 Đường XYZ | 0987654321 | ttb@school.com | 2024
```

### ❌ SAI - Các lỗi thường gặp:

**1. Giới tính sai format:**
```
❌ nguyenvana | 123456 | HS001 | Nguyễn Văn A | 01/01/2010 | nam | ...
                                                              ⬆️ phải là "Nam" (viết hoa chữ đầu)

❌ tranthib | 123456 | HS002 | Trần Thị B | 15/05/2010 | nu | ...
                                                            ⬆️ phải là "Nữ"

❌ levanc | 123456 | HS003 | Lê Văn C | 20/12/2009 | Male | ...
                                                         ⬆️ phải là "Nam" hoặc "Nữ"
```

**2. Ngày sinh sai format:**
```
❌ nguyenvana | 123456 | HS001 | Nguyễn Văn A | 2010/01/01 | Nam | ...
                                                  ⬆️ phải là dd/mm/yyyy: 01/01/2010

❌ nguyenvana | 123456 | HS001 | Nguyễn Văn A | 01-01-2010 | Nam | ...
                                                  ⬆️ dùng dấu "/" không phải "-"

❌ nguyenvana | 123456 | HS001 | Nguyễn Văn A | 1/1/2010 | Nam | ...
                                                  ⬆️ phải có số 0 ở đầu: 01/01/2010
```

**3. Thiếu trường bắt buộc:**
```
❌ | 123456 | HS001 | Nguyễn Văn A | 01/01/2010 | Nam | ...
   ⬆️ thiếu username

❌ nguyenvana | | HS001 | Nguyễn Văn A | 01/01/2010 | Nam | ...
                ⬆️ thiếu password

❌ nguyenvana | 123456 | | Nguyễn Văn A | 01/01/2010 | Nam | ...
                         ⬆️ thiếu mã học sinh

❌ nguyenvana | 123456 | HS001 | | 01/01/2010 | Nam | ...
                                 ⬆️ thiếu họ tên
```

**4. Username hoặc mã học sinh trùng:**
```
❌ Dòng 2: nguyenvana | 123456 | HS001 | Nguyễn Văn A | ...
   Dòng 3: nguyenvana | 654321 | HS002 | Trần Thị B | ...
           ⬆️ username bị trùng

❌ Dòng 2: nguyenvana | 123456 | HS001 | Nguyễn Văn A | ...
   Dòng 3: tranthib | 123456 | HS001 | Trần Thị B | ...
                               ⬆️ mã học sinh bị trùng
```

## 🗑️ Bước 3: XÓA dòng mẫu và hướng dẫn

**QUAN TRỌNG:** Trước khi import, bạn PHẢI xóa:
- ✅ Dòng 2: Dòng mẫu (ví dụ: HS-001 | 123456 | HS-001 | Nguyễn Văn A | ...)
- ✅ Dòng 3: Dòng trống
- ✅ Dòng 4-9: Các dòng hướng dẫn (bắt đầu bằng "Lưu ý:", "- Các cột...", v.v.)

**File Excel cuối cùng chỉ có:**
```
Dòng 1: HEADER (Tên đăng nhập (*) | Mật khẩu (*) | Mã học sinh (*) | ...)
Dòng 2: DATA thực tế của học sinh thứ 1
Dòng 3: DATA thực tế của học sinh thứ 2
Dòng 4: DATA thực tế của học sinh thứ 3
...
```

## 📤 Bước 4: Import file

API: `POST /api/students/import/excel`
- Method: POST
- Headers: `Authorization: Bearer YOUR_TOKEN`
- Body: form-data với key `file` (chọn file Excel đã chỉnh sửa)

## ✅ Kết quả thành công:

```json
{
  "message": "Import thành công 3 học sinh",
  "imported": 3,
  "students": [
    {
      "_id": "...",
      "studentCode": "HS001",
      "fullName": "Nguyễn Văn A",
      "gender": "Nam",
      ...
    },
    ...
  ]
}
```

## ❌ Kết quả lỗi:

```json
{
  "message": "Import thất bại",
  "errors": [
    "Dòng 3: Giới tính phải là 'Nam' hoặc 'Nữ'",
    "Dòng 5: Thiếu mã học sinh",
    "Tên đăng nhập đã tồn tại trong hệ thống: nguyenvana"
  ],
  "imported": 0
}
```

## 💡 Mẹo:

1. **Username và Mã học sinh có thể GIỐNG NHAU:**
   - ✅ Đơn giản nhất: Dùng mã học sinh làm username
     - Username: `HS001`, Mã học sinh: `HS001`
     - Username: `HS002`, Mã học sinh: `HS002`
   - ✅ Hoặc dùng tên riêng cho username:
     - Username: `nguyenvana`, Mã học sinh: `HS001`
     - Username: `tranthib`, Mã học sinh: `HS002`

2. **Password:** Có thể giống nhau cho tất cả học sinh mới (ví dụ: `123456`), sau đó học sinh tự đổi

3. **Mã học sinh:** Nên theo format nhất quán
   - ✅ `HS001`, `HS002`, `HS003`
   - ✅ `2024001`, `2024002`, `2024003`
   - ❌ `HS-001`, `hs001`, `HS 001` (tránh dấu gạch ngang, khoảng trắng)

4. **Giới tính:** CHÍNH XÁC là `Nam` hoặc `Nữ` (viết hoa chữ đầu, có dấu)

5. **Ngày sinh:** Bắt buộc format `dd/mm/yyyy` với số 0 ở đầu
   - ✅ `01/01/2010`, `05/12/2009`, `20/06/2010`
   - ❌ `1/1/2010`, `2010-01-01`, `01/01/10`

## 🧪 Test:

Sau khi import thành công, thử đăng nhập với:
- Username: `nguyenvana`
- Password: `123456`

Để kiểm tra tài khoản đã được tạo!
