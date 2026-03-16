// routes/Class.routes.js
const express = require("express");
const router = express.Router();

const {
  handleGetAllStudent,
  getOneStudentController,
  moveUpToGradeController,
  editStudentController,
  handleGetNumberStudent,
  getStudentAllNotInClassController,
  removeStudentFromClassController,
  exportStudentTemplateController,
  importStudentsFromExcelController,
  inputScoreForStudentController,
  inputScoresForMultipleStudentsController,
  addScoreColumnForStudentController,
  removeScoreColumnForStudentController,
  addScoreColumnForAllStudentsInClassController,
  addConductForStudentController,
  getMyGradesController,
  getMyScheduleController,
  getMyClassController,
} = require("../controllers/Student.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth");
const { uploadExcel } = require("../middleware/uploadMiddleware");

router.post("/", verifyToken, handleGetAllStudent);

router.get(
  "/count",
  verifyToken,
  authorizeRoles("admin"),
  handleGetNumberStudent
);

// Routes cho học sinh xem thông tin của mình (phải đặt trước /:id)
router.get(
  "/my-grades",
  verifyToken,
  authorizeRoles("student"),
  getMyGradesController
);

router.get(
  "/my-schedule",
  verifyToken,
  authorizeRoles("student"),
  getMyScheduleController
);

router.get(
  "/my-class",
  verifyToken,
  authorizeRoles("student"),
  getMyClassController
);

router.get(
  "/:id/full",
  verifyToken,
  authorizeRoles("admin", "teacher", "student"),
  getOneStudentController
);

router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  getOneStudentController
);
router.post(
  "/move-student",
  verifyToken,
  authorizeRoles("admin"),
  moveUpToGradeController
);

router.patch(
  "/edit-student/:id",
  verifyToken,
  authorizeRoles("admin"),
  editStudentController
);

router.post(
  "/no-class/all",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  getStudentAllNotInClassController
);

router.post(
  "/remove-from-class",
  verifyToken,
  authorizeRoles("admin"),
  removeStudentFromClassController
);

// Export Excel template
router.get(
  "/export/template",
  verifyToken,
  authorizeRoles("admin"),
  exportStudentTemplateController
);

// Import students from Excel
router.post(
  "/import/excel",
  verifyToken,
  authorizeRoles("admin"),
  uploadExcel.single("file"),
  importStudentsFromExcelController
);

// Nhập điểm cho một học sinh
router.patch(
  "/input-score/:studentId/:scoreId",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  inputScoreForStudentController
);

// Nhập điểm cho nhiều học sinh cùng lúc
router.post(
  "/input-scores-multiple",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  inputScoresForMultipleStudentsController
);

// Thêm cột điểm cho học sinh
router.post(
  "/add-score-column",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  addScoreColumnForStudentController
);

// Xóa cột điểm của học sinh
router.delete(
  "/remove-score-column/:studentId/:scoreId",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  removeScoreColumnForStudentController
);

// Thêm cột điểm đồng loạt cho tất cả học sinh trong lớp
router.post(
  "/add-score-column-for-class",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  addScoreColumnForAllStudentsInClassController
);

// Thêm conduct cho học sinh
router.post(
  "/conduct/:id",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  addConductForStudentController
);

module.exports = router;
