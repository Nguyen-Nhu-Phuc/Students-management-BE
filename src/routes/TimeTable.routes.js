// routes/timetableRoutes.js
const express = require("express");
const router = express.Router();
const timetableController = require("../controllers/TimeTable.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

router.post("/generate", verifyToken, authorizeRoles('admin'), timetableController.generateTimetable);

router.get("/", verifyToken, timetableController.getAllTimetables);

router.get("/check-conflict/:teacherId", verifyToken, timetableController.checkTeacherAvailability);

router.get("/:classId", verifyToken, timetableController.getOneTimetable);

router.patch("/:timetableId/lesson/:lessonId", verifyToken, authorizeRoles('admin'), timetableController.updateSingleLessonController);

router.delete("/:id", verifyToken, authorizeRoles('admin'), timetableController.deleteTimetableSlot);


module.exports = router;
