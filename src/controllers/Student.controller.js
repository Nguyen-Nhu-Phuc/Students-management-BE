const studentService = require("../services/Student.service");
const Student = require("../models/Student.model");
const path = require("path");
const fs = require("fs");

const handleGetAllStudent = async (req, res) => {
  try {
    const { limit, offset, search, classId, schoolYear } = req.body;

    const result = await studentService.getAllStudent({
      limit,
      offset,
      search,
      classId,
      schoolYear,
    });

    res.status(200).json({
      message: "Lấy danh sách học sinh thành công",
      total: result.total,
      data: result.students,
    });
  } catch (error) {
    res.status(500).json({
      message: "Không thể lấy danh sách học sinh",
      error: error.message,
    });
  }
};

const getOneStudentController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Thiếu ID học sinh",
      });
    }

    const data = await studentService.getOneStudent({ id });

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy học sinh này",
      });
    }

    return res.status(200).json({
      message: "Lấy học sinh thành công",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy thông tin học sinh",
      error: error.message,
    });
  }
};

// Lấy toàn bộ thông tin học sinh (bao gồm điểm chi tiết và hạnh kiểm)
const handleGetFullStudent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Thiếu studentId" });

    const data = await studentService.getOneStudent({ id });
    if (!data)
      return res.status(404).json({ message: "Không tìm thấy học sinh" });

    return res
      .status(200)
      .json({ message: "Lấy thông tin học sinh đầy đủ thành công", data });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Không thể lấy thông tin học sinh",
        error: error.message,
      });
  }
};

const moveUpToGradeController = async (req, res) => {
  try {
    const { arrayStudent, newClass } = req.body;

    const data = await studentService.moveUpToGradeService({
      arrayStudent,
      newClass,
    });

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy học sinh này",
      });
    }

    return res.status(200).json({
      message: "Chuyển lớp thành công",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không chuyển lớp đối với học sinh này",
      error: error.message,
    });
  }
};

const editStudentController = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({ message: "Thiếu studentId" });
    }

    const updatedStudent = await studentService.editStudent(id, updateData);

    return res.status(200).json({
      message: "Cập nhật học sinh thành công",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Lỗi trong editStudent controller:", error);
    return res.status(400).json({
      message: "Không thể cập nhật học sinh",
      error: error.message,
    });
  }
};

const handleGetNumberStudent = async (req, res) => {
  try {
    const count = await studentService.getNumberStudent();
    return res.status(200).json({
      message: "Lấy số lượng học sinh thành công",
      total: count,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể lấy số lượng học sinh",
      error: error.message,
    });
  }
};

const getStudentAllNotInClassController = async (req, res) => {
  try {
    const { search, admissionYear } = req.body;

    const result = await studentService.getStudentAllNotInClass({
      search,
      admissionYear,
    });

    return res.status(200).json({
      message: "Lấy danh sách học sinh không có lớp thành công",
      total: result.total,
      data: result.students,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy danh sách học sinh không có lớp",
      error: error.message,
    });
  }
};

const removeStudentFromClassController = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        message: "Thiếu studentId",
      });
    }

    const result = await studentService.removeStudentFromClass(studentId);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Không thể xóa học sinh khỏi lớp",
    });
  }
};

// Export Excel template
const exportStudentTemplateController = async (req, res) => {
  try {
    const workbook = await studentService.exportStudentTemplate();

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Student_Import_Template.xlsx"
    );

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({
      message: "Không thể tạo file template",
      error: error.message,
    });
  }
};

// Import students from Excel
const importStudentsFromExcelController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Vui lòng upload file Excel",
      });
    }

    const filePath = req.file.path;

    // Import students
    const result = await studentService.importStudentsFromExcel(filePath);

    // Delete uploaded file
    fs.unlinkSync(filePath);

    if (!result.success) {
      return res.status(400).json({
        message: "Import thất bại",
        errors: result.errors,
        imported: result.imported,
      });
    }

    return res.status(200).json({
      message: `Import thành công ${result.imported} học sinh`,
      imported: result.imported,
      students: result.students,
    });
  } catch (error) {
    // Clean up file if exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Lỗi khi xóa file:", err);
      }
    }

    return res.status(500).json({
      message: "Không thể import học sinh từ Excel",
      error: error.message,
    });
  }
};

// Nhập điểm cho một học sinh
const inputScoreForStudentController = async (req, res) => {
  try {
    const { studentId, scoreId } = req.params;
    const { score } = req.body;

    if (!studentId || !scoreId) {
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc: studentId, scoreId",
      });
    }

    const result = await studentService.inputScoreForStudent(
      studentId,
      scoreId,
      score
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      message: "Không thể nhập điểm",
      error: error.message,
    });
  }
};

// Nhập điểm cho nhiều học sinh
const inputScoresForMultipleStudentsController = async (req, res) => {
  try {
    const { scores } = req.body;

    if (!Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({
        message: "Danh sách điểm không hợp lệ",
      });
    }

    const result = await studentService.inputScoresForMultipleStudents(scores);

    return res.status(200).json({
      message: result.success
        ? "Nhập điểm thành công"
        : "Nhập điểm hoàn tất với một số lỗi",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể nhập điểm",
      error: error.message,
    });
  }
};

// Thêm cột điểm cho học sinh
const addScoreColumnForStudentController = async (req, res) => {
  try {
    const { studentId, subjectId, scoreTypeId } = req.body;

    if (!studentId || !subjectId || !scoreTypeId) {
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc: studentId, subjectId, scoreTypeId",
      });
    }

    const result = await studentService.addScoreColumnForStudent(
      studentId,
      subjectId,
      scoreTypeId
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      message: "Không thể thêm cột điểm",
      error: error.message,
    });
  }
};

// Xóa cột điểm của học sinh
const removeScoreColumnForStudentController = async (req, res) => {
  try {
    const { studentId, scoreId } = req.params;

    if (!studentId || !scoreId) {
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc: studentId, scoreId",
      });
    }

    const result = await studentService.removeScoreColumnForStudent(
      studentId,
      scoreId
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      message: "Không thể xóa cột điểm",
      error: error.message,
    });
  }
};

// Thêm cột điểm đồng loạt cho tất cả học sinh trong lớp
const addScoreColumnForAllStudentsInClassController = async (req, res) => {
  try {
    const { classId, subjectId, scoreTypeId } = req.body;

    if (!classId || !subjectId || !scoreTypeId) {
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc: classId, subjectId, scoreTypeId",
      });
    }

    const result = await studentService.addScoreColumnForAllStudentsInClass(
      classId,
      subjectId,
      scoreTypeId
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      message: "Không thể thêm cột điểm cho lớp",
      error: error.message,
    });
  }
};

// Thêm conduct cho học sinh
const addConductForStudentController = async (req, res) => {
  try {
    const { id: studentId } = req.params;
    const { conductId } = req.body;

    if (!studentId || !conductId) {
      return res
        .status(400)
        .json({
          message: "Thiếu thông tin bắt buộc: studentId hoặc conductId",
        });
    }

    const result = await studentService.addConductForStudent(
      studentId,
      conductId
    );
    return res.status(200).json(result);
  } catch (error) {
    return res
      .status(400)
      .json({
        message: "Không thể thêm conduct cho học sinh",
        error: error.message,
      });
  }
};

// Lấy điểm của học sinh đang đăng nhập
const getMyGradesController = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await studentService.getMyGrades(userId);
    return res.status(200).json({ message: "Lấy điểm thành công", data });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Không thể lấy điểm", error: error.message });
  }
};

// Lấy thời khóa biểu của học sinh đang đăng nhập
const getMyScheduleController = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await studentService.getMySchedule(userId);
    return res
      .status(200)
      .json({ message: "Lấy thời khóa biểu thành công", data });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Không thể lấy thời khóa biểu", error: error.message });
  }
};

// Lấy thông tin lớp của học sinh đang đăng nhập
const getMyClassController = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await studentService.getMyClass(userId);
    return res
      .status(200)
      .json({ message: "Lấy thông tin lớp thành công", data });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Không thể lấy thông tin lớp", error: error.message });
  }
};

module.exports = {
  handleGetNumberStudent,
  getOneStudentController,
  handleGetAllStudent,
  getStudentAllNotInClassController,
  moveUpToGradeController,
  editStudentController,
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
};
