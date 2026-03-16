// Test script để debug import Excel
const ExcelJS = require("exceljs");
const path = require("path");

async function testExcelRead() {
    try {
        // Thay đổi đường dẫn này thành file Excel của bạn
        const filePath = path.join(__dirname, "test-students.xlsx");

        console.log("Đang đọc file:", filePath);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        console.log("\n=== Danh sách sheets ===");
        workbook.eachSheet((worksheet, sheetId) => {
            console.log(`Sheet ${sheetId}: ${worksheet.name}`);
        });

        const worksheet = workbook.getWorksheet("Students Template");
        if (!worksheet) {
            console.error("\n❌ Không tìm thấy sheet 'Students Template'");
            return;
        }

        console.log("\n=== Thông tin worksheet ===");
        console.log(`Tên sheet: ${worksheet.name}`);
        console.log(`Số dòng: ${worksheet.rowCount}`);
        console.log(`Số cột: ${worksheet.columnCount}`);

        console.log("\n=== Header row (row 1) ===");
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            console.log(`Cột ${colNumber}: ${cell.value}`);
        });

        console.log("\n=== Đọc dữ liệu từ row 2 trở đi ===");
        const rows = worksheet.getRows(2, worksheet.rowCount) || [];

        let dataCount = 0;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2;

            // Skip empty rows
            if (!row.values || row.values.length <= 1) {
                console.log(`Row ${rowNumber}: (empty - skipped)`);
                continue;
            }

            const firstCell = row.getCell(1).value;

            // Skip instruction rows
            if (!firstCell ||
                firstCell.toString().includes("Lưu ý") ||
                firstCell.toString().includes("-")) {
                console.log(`Row ${rowNumber}: (instruction - skipped) ${firstCell}`);
                continue;
            }

            dataCount++;
            console.log(`\nRow ${rowNumber} (Data ${dataCount}):`);
            console.log(`  1. Username: ${row.getCell(1).value}`);
            console.log(`  2. Password: ${row.getCell(2).value}`);
            console.log(`  3. Student Code: ${row.getCell(3).value}`);
            console.log(`  4. Full Name: ${row.getCell(4).value}`);
            console.log(`  5. DOB: ${row.getCell(5).value}`);
            console.log(`  6. Gender: ${row.getCell(6).value}`);
            console.log(`  7. Address: ${row.getCell(7).value}`);
            console.log(`  8. Phone: ${row.getCell(8).value}`);
            console.log(`  9. Email: ${row.getCell(9).value}`);
            console.log(`  10. Admission Year: ${row.getCell(10).value}`);
        }

        console.log(`\n=== Tổng kết ===`);
        console.log(`Tổng số dòng có dữ liệu hợp lệ: ${dataCount}`);

    } catch (error) {
        console.error("\n❌ Lỗi:", error.message);
        console.error(error.stack);
    }
}

// Chạy test
testExcelRead();
