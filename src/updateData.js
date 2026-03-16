const mongoose = require("mongoose");
const Student = require("./models/ScoreSetting.model"); // đường dẫn tới file model Student

const MONGO_URI = "mongodb+srv://khactriet:p2iJDlmtNbXYop5F@cluster0.inam9my.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const result = await Student.updateMany({}, { $set: { status: "active" } });
    console.log("🔄 Update result:", result);

    await mongoose.disconnect();
    console.log("✅ Done!");
}

main().catch(console.error);
