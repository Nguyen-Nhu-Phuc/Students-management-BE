# Hướng dẫn test chức năng Import học sinh

## 1. Tải file template Excel

**Endpoint:** `GET /api/students/export/template`

**Cách test:**
```bash
# Dùng curl (PowerShell)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/students/export/template --output template.xlsx
```

Hoặc dùng Postman/Thunder Client:
- Method: GET
- URL: `http://localhost:3000/api/students/export/template`
- Headers: 
  - `Authorization: Bearer YOUR_TOKEN`
- Lưu response thành file `.xlsx`

## 2. Điền dữ liệu vào file Excel

File template có các cột:
1. Tên đăng nhập (*) - bắt buộc, duy nhất
2. Mật khẩu (*) - bắt buộc
3. Mã học sinh (*) - bắt buộc, duy nhất  
4. Họ và tên (*) - bắt buộc
5. Ngày sinh (dd/mm/yyyy)
6. Giới tính (Nam/Nữ) (*) - bắt buộc
7. Địa chỉ
8. Số điện thoại
9. Email
10. Năm nhập học

**Ví dụ dữ liệu:**
```
nguyenvana | 123456 | HS001 | Nguyễn Văn A | 01/01/2010 | Nam | 123 Đường ABC | 0123456789 | nva@example.com | 2024
tranthib   | 123456 | HS002 | Trần Thị B   | 15/05/2010 | Nữ  | 456 Đường XYZ | 0987654321 | ttb@example.com | 2024
```

**Lưu ý:**
- Xóa dòng mẫu và dòng hướng dẫn trước khi import
- Chỉ giữ lại header và dữ liệu thực tế

## 3. Import file Excel

**Endpoint:** `POST /api/students/import/excel`

**Cách test với Postman/Thunder Client:**
- Method: POST
- URL: `http://localhost:3000/api/students/import/excel`
- Headers:
  - `Authorization: Bearer YOUR_TOKEN`
- Body: 
  - Type: `form-data`
  - Key: `file` (type: File)
  - Value: Chọn file Excel đã điền dữ liệu

**Response thành công:**
```json
{
  "message": "Import thành công 2 học sinh",
  "imported": 2,
  "students": [
    {
      "_id": "...",
      "studentCode": "HS001",
      "fullName": "Nguyễn Văn A",
      ...
    }
  ]
}
```

**Response lỗi:**
```json
{
  "message": "Import thất bại",
  "errors": [
    "Dòng 3: Thiếu mã học sinh",
    "Tên đăng nhập đã tồn tại trong hệ thống: nguyenvana"
  ],
  "imported": 0
}
```

## 4. Kiểm tra kết quả

### Kiểm tra học sinh đã được tạo:
```bash
GET /api/students?limit=10&offset=0
```

### Kiểm tra tài khoản User đã được tạo:
Thử đăng nhập với username/password từ file Excel:
```bash
POST /api/auth/login
{
  "username": "nguyenvana",
  "password": "123456"
}
```

## Các trường hợp lỗi thường gặp

1. **"Tên đăng nhập đã tồn tại"** - Username bị trùng
2. **"Mã học sinh đã tồn tại"** - StudentCode bị trùng
3. **"Giới tính phải là 'Nam' hoặc 'Nữ'"** - Sai format giới tính
4. **"Ngày sinh không hợp lệ"** - Sai format ngày (phải dd/mm/yyyy)
5. **"Chỉ chấp nhận file Excel"** - Upload sai định dạng file
6. **"Vui lòng upload file Excel"** - Không có file trong request

## Debug

Nếu có lỗi, kiểm tra:
1. Console log của server
2. File Excel có đúng format không
3. Đã xóa dòng mẫu và hướng dẫn chưa
4. Token authorization có hợp lệ không
5. Role có phải admin không
