const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.memoryStorage(); // lưu file trong RAM
const upload = multer({ storage });

// Storage for Excel files (save to disk)
const excelStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "../../public/uploads/excel");

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "students-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const uploadExcel = multer({
    storage: excelStorage,
    fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== ".xlsx" && ext !== ".xls") {
            return cb(new Error("Chỉ chấp nhận file Excel (.xlsx, .xls)"));
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});

module.exports = { upload, uploadExcel };