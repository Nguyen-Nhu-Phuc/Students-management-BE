// routes/Class.routes.js
const express = require("express");
const router = express.Router();
const {
  handleCreateClass,
  handleGetAllClasses,
  handleGetOneClass,
  handleGetClassByHomeroomTeacher,
  handleDeleteClass,
  handleGetNumberClass,
  handleEditClass,
  handleCountStudentsInClass,
  removeHomeroomTeacher,
  assignHomeroomTeacher,
  getClassesWithoutHomeroomTeacherController,
  getClassesWithHomeroomTeacherController,
  getListClassesNotSubjectAssignmentController,
  getAllIdClassesController,
  arrangeStudentsByClassController,
  transferStudentToClassController,
  getStudentsWithScoresBySubjectController,
  handleGetStudentsWithScoresAndConducts,
  handleCalculateSemesterResults
} = require("../controllers/Class.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth");


router.post(
  "/arrange-students",
  verifyToken,
  authorizeRoles("admin"),
  arrangeStudentsByClassController

);

router.post(
  "/transfer-student",
  verifyToken,
  authorizeRoles("admin"),
  transferStudentToClassController
);

router.get(
  "/all-ids",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  getAllIdClassesController
);

router.post(
  "/with-homeroom-teacher",
  verifyToken,
  authorizeRoles("admin"),
  getClassesWithHomeroomTeacherController
);

router.post(
  "/without-homeroom-teacher",
  verifyToken,
  authorizeRoles("admin"),
  getClassesWithoutHomeroomTeacherController
);

router.get(
  "/count",
  verifyToken,
  authorizeRoles("admin"),
  handleGetNumberClass
);

router.get(
  "/count-students/:classId",
  verifyToken,
  authorizeRoles("admin"),
  handleCountStudentsInClass
);

router.post(
  "/create-class",
  verifyToken,
  authorizeRoles("admin"),
  handleCreateClass
);

router.post("/", verifyToken, authorizeRoles("admin"), handleGetAllClasses);

// Lấy lớp mà giáo viên đang chủ nhiệm (teacherId optional; use 'me' for current teacher)
router.get(
  "/by-homeroom",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  handleGetClassByHomeroomTeacher
);

// Lấy tất cả học sinh của lớp gồm điểm và hạnh kiểm
router.get(
  "/:id/students",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  handleGetStudentsWithScoresAndConducts
);

// Tính điểm trung bình học kỳ cho toàn bộ lớp
router.post(
  "/calculate-semester",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  // body: { semester, classId }
  handleCalculateSemesterResults
);

router.get("/:id", verifyToken, authorizeRoles("admin", "teacher"), handleGetOneClass);

router.delete("/:id", verifyToken, authorizeRoles("admin"), handleDeleteClass);

router.patch("/:id", verifyToken, authorizeRoles("admin"), handleEditClass);

router.post(
  "/assign-homeroom",
  verifyToken,
  authorizeRoles("admin"),
  assignHomeroomTeacher
);

router.delete(
  "/remove-homeroom/:classId",
  verifyToken,
  authorizeRoles("admin"),
  removeHomeroomTeacher
);

router.post(
  "/not-subject-assignment",
  verifyToken,
  authorizeRoles("admin"),
  getListClassesNotSubjectAssignmentController
);

router.post(
  "/students-scores",
  verifyToken,
  authorizeRoles("admin", "teacher"),
  getStudentsWithScoresBySubjectController
);

module.exports = router;
