const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const connectDB = require("./utils/connectDB");
const PORT = process.env.PORT || 3000;

const app = express();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Routes
const userRoutes = require("./routes/User.routes");
const authRoutes = require("./routes/Auth.routes");
const classRoutes = require("./routes/Class.routes");
const teacherRoutes = require("./routes/Teacher.routes");
const studentRoutes = require("./routes/Student.routes");

const subjectRoutes = require("./routes/Subject.routes");
const gradeRoutes = require("./routes/Grade.routes");

const periodRoutes = require("./routes/Period.routes");
const timeTableRoutes = require("./routes/TimeTable.routes");
const departmentRoutes = require("./routes/Department.routes");
const settingRoutes = require("./routes/ScoreSetting.routes");
const conductRoutes = require("./routes/ConductSetting.routes");

// const friendRequest = require("./routes/friendRequest");
// const chatRoutes = require("./routes/chat");

app.use("/v1/api/users", userRoutes);
app.use("/v1/api/auth", authRoutes);
app.use("/v1/api/class", classRoutes);
app.use("/v1/api/teacher", teacherRoutes);
app.use("/v1/api/student", studentRoutes);
app.use("/v1/api/subject", subjectRoutes);
app.use("/v1/api/period", periodRoutes);

app.use("/v1/api/grade", gradeRoutes);
app.use("/v1/api/timetable", timeTableRoutes);
app.use("/v1/api/department", departmentRoutes);
app.use("/v1/api/setting", settingRoutes);
app.use("/v1/api/conduct-setting", conductRoutes);

// app.use("/api/friends", friendRequest);
// app.use("/api/chat", chatRoutes);

connectDB();

app.get("/", (req, res) => {
  res.send("Successfully connected!");
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
