// routes/Class.routes.js
const express = require("express");
const router = express.Router();

const {
  handleGetAllTeacher,
  handleGetOneTeacher,
  handleGetNumberTeacher,
  handleEditTeacher,
  handleAssignSubject,
  getAllSelectTeacherController,
  ListOfTeachersNotYetInCharge,
  teachingAssignmentToClassController,
  getListTeachersNotInDepartmentController,
  unassignTeachingFromClassController,
  assignTeacherToDepartmentController,
  handleGetOneTeacherRoleTeacher
} = require("../controllers/Teacher.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

router.get(
  "/count",
  verifyToken,
  authorizeRoles("admin"),
  handleGetNumberTeacher
);

router.patch("/:id", verifyToken, authorizeRoles("admin"), handleEditTeacher);
router.post("/", verifyToken, authorizeRoles("admin"), handleGetAllTeacher);
router.get("/:id", verifyToken, authorizeRoles("admin", "teacher"), handleGetOneTeacher);

router.patch("/assign-department/:id", verifyToken, authorizeRoles("admin"), assignTeacherToDepartmentController);

router.patch("/assign-teacher/:id", verifyToken, authorizeRoles("admin"), teachingAssignmentToClassController);

router.get("/not-in-charge/list", verifyToken, authorizeRoles("admin"), ListOfTeachersNotYetInCharge);

router.get("/select/list", verifyToken, authorizeRoles("admin"), getAllSelectTeacherController);

router.get("/select/list/not-in-department", verifyToken, authorizeRoles("admin"), getListTeachersNotInDepartmentController);

router.post("/unassign-teaching", verifyToken, authorizeRoles("admin"), unassignTeachingFromClassController);

router.get("/teacher/get-one", verifyToken, authorizeRoles("teacher"), handleGetOneTeacherRoleTeacher);

module.exports = router;
