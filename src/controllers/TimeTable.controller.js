// controllers/timetableController.js
const timetableService = require("../services/TimeTable.service");

const generateTimetable = async (req, res) => {
    try {
        const { classId, includeAfternoon } = req.body;
        const timetable = await timetableService.generateTimetableForClass(classId, includeAfternoon);

        return res.status(200).json({
            message: "Generated timetable successfully",
            data: timetable,
        });
    } catch (err) {
        return res.status(500).json({
            message: "Error generating timetable",
            error: err.message,
        });
    }
};

const getAllTimetables = async (req, res) => {
    try {
        const { classId, gradeId, teacherId } = req.query;

        const timetables = await timetableService.getAllTimetablesService({ classId, gradeId, teacherId });

        res.status(200).json({
            message: "Lấy danh sách thời khóa biểu thành công",
            total: timetables.length,
            data: timetables,
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy danh sách thời khóa biểu", error: error.message });
    }
};

const getOneTimetable = async (req, res) => {
    try {
        const { classId } = req.params;

        const timetable = await timetableService.getOneTimeTableService(classId);

        res.status(200).json({
            message: "Lấy thời khóa biểu thành công",
            data: timetable,
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy thời khóa biểu", error: error.message });
    }
};

const updateSingleLessonController = async (req, res) => {
    try {
        const { timetableId, lessonId } = req.params;
        const { dayOfWeek, lesson, subjectId, teacherId } = req.body;

        if (!dayOfWeek || !lesson || !subjectId || !teacherId) {
            return res.status(400).json({
                message: "Thiếu dữ liệu cần thiết để cập nhật tiết học",
            });
        }

        const updated = await timetableService.updateSingleLessonService({
            timetableId,
            lessonId,
            dayOfWeek,
            lesson,
            subjectId,
            teacherId,
        });

        return res.status(200).json({
            message: "Cập nhật tiết học thành công",
            data: updated,
        });
    } catch (error) {
        return res.status(400).json({
            message: "Lỗi khi cập nhật tiết học",
            error: error.message,
        });
    }
};

const deleteTimetableSlot = async (req, res) => {
    try {
        const timetableId = req.params.id;
        const { dayOfWeek, lesson } = req.query;

        const result = await timetableService.deleteTimetableSlotService(timetableId, { dayOfWeek, lesson });
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({
            message: "Lỗi khi xóa tiết học",
            error: error.message,
        });
    }
};

const checkTeacherAvailability = async (req, res) => {
    try {
        const { teacherId } = req.params;

        const result = await timetableService.checkTeacherAvailabilityService(teacherId);

        res.status(200).json({
            message: "Kiểm tra lịch dạy của giáo viên thành công",
            data: result,
        });
    } catch (error) {
        res.status(400).json({
            message: "Lỗi khi kiểm tra lịch dạy của giáo viên",
            error: error.message,
        });
    }
};

module.exports = {
    generateTimetable,
    getAllTimetables,
    getOneTimetable,
    updateSingleLessonController,
    deleteTimetableSlot,
    checkTeacherAvailability
};
