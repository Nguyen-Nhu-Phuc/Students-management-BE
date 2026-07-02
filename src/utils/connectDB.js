const mongoose = require("mongoose");
require("dotenv").config();

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectMongoDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ MONGO_URI chưa được cấu hình trong file .env");
    process.exit(1);
  }

  const options = {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    // Tránh lỗi DNS queryTxt ETIMEOUT trên Windows khi resolve IPv6
    family: 4,
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mongoose.connect(uri, options);
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);

      mongoose.connection.on("disconnected", () => {
        console.warn("⚠️  MongoDB bị ngắt kết nối");
      });

      mongoose.connection.on("error", (err) => {
        console.error("⚠️  MongoDB error:", err.message);
      });

      return conn;
    } catch (error) {
      console.error(
        `❌ Kết nối MongoDB thất bại (lần ${attempt}/${MAX_RETRIES}):`,
        error.message
      );

      if (attempt === MAX_RETRIES) {
        console.error(
          "\n💡 Gợi ý khắc phục:\n" +
            "   1. Kiểm tra kết nối internet / tắt VPN nếu đang bật\n" +
            "   2. Vào MongoDB Atlas → Network Access → thêm IP hiện tại (hoặc 0.0.0.0/0)\n" +
            "   3. Kiểm tra MONGO_URI trong file .env\n" +
            "   4. Thử đổi DNS sang 8.8.8.8 rồi chạy lại: npm start\n"
        );
        process.exit(1);
      }

      console.log(`   Thử lại sau ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
};

module.exports = connectMongoDB;
