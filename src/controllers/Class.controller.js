const classService = require("../services/Class.service");
const Class = require("../models/Class.model");
const Grade = require("../models/Grade.model");
const User = require("../models/Users.model");

const handleCreateClass = async (req, res) => {
  try {
    const { className, schoolYear, homeroomTeacher, grade } = req.body;

    if (grade) {
      const existingGrade = await Grade.findById(grade);
      if (!existingGrade) {
        return res.status(404).json({ message: "Khối lớp không tồn tại" });
      }
    }



    const existingClass = await Class.findOne({ className, schoolYear });
    if (existingClass) {
      return res.status(400).json({
        message: "Lớp đã tồn tại trong năm học này",
      });
    }

    const newClass = await classService.createClass({
      className,
      schoolYear,
      homeroomTeacher,
      grade,
    });

    return res.status(201).json({
      message: "Tạo lớp học thành công",
      data: newClass,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể tạo lớp học",
      error: error.message,
    });
  }
};

const handleGetAllClasses = async (req, res) => {
  try {
    const { limit, offset } = req.body;

    const result = await classService.getAllClasses({ limit, offset });

    return res.status(200).json({
      message: "Lấy danh sách lớp thành công",
      total: result.total,
      data: result.classes,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy thông tin lớp",
      error: error.message,
    });
  }
};

const handleGetOneClass = async (req, res) => {
  try {
    const { id } = req.params;
    const classData = await classService.getOneClass(id);

    return res.status(200).json({
      message: "Lấy thông tin lớp thành công",
      data: classData,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể lấy thông tin lớp",
      error: error.message,
    });
  }
};

const handleDeleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    await classService.deleteClass(id);

    return res.status(200).json({
      message: "Xóa lớp thành công",
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể xóa lớp",
      error: error.message,
    });
  }
};

const handleGetNumberClass = async (req, res) => {
  try {
    const count = await classService.getNumberClass();
    return res.status(200).json({
      message: "Lấy số lượng lớp thành công",
      total: count,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể lấy số lượng lớp",
      error: error.message,
    });
  }
};

const handleEditClass = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedClass = await classService.editClass(id, updateData);

    return res.status(200).json({
      message: "Cập nhật lớp thành công",
      data: updatedClass,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể cập nhật lớp",
      error: error.message,
    });
  }
};

const handleCountStudentsInClass = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({ message: "Class ID is required" });
    }

    const result = await classService.countStudentsInClass(classId);

    return res.status(200).json({
      message: "Count students successfully",
      data: result,
    });
  } catch (error) {
    console.error("Count students error:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ message: error.message });
  }
};

const assignHomeroomTeacher = async (req, res) => {
  try {
    const { classId, teacherId } = req.body;

    if (!classId || !teacherId) {
      return res.status(400).json({ message: "Thiếu classId hoặc teacherId" });
    }

    const updatedClass = await classService.assignHomeroomTeacher(
      classId,
      teacherId
    );

    return res.status(200).json({
      message: "Bổ nhiệm giáo viên chủ nhiệm thành công",
      data: updatedClass,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const removeHomeroomTeacher = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({ message: "Thiếu classId" });
    }

    const updatedClass = await classService.removeHomeroomTeacher(classId);

    return res.status(200).json({
      message: "Xóa giáo viên chủ nhiệm thành công",
      data: updatedClass,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getClassesWithoutHomeroomTeacherController = async (req, res) => {
  try {
    const { limit, offset } = req.body;

    // Kiểm tra rỗng
    if (limit == null || offset == null) {
      return res.status(400).json({
        message: "Thiếu tham số limit hoặc offset",
      });
    }

    const { total, classes } =
      await classService.getClassesWithoutHomeroomTeacher(limit, offset);

    if (!classes || classes.length === 0) {
      return res.status(200).json({
        message: "Không có lớp nào chưa có giáo viên chủ nhiệm",
        total,
        data: [],
      });
    }

    return res.status(200).json({
      message: "Lấy danh sách lớp chưa có giáo viên chủ nhiệm thành công",
      total,
      data: classes,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy danh sách lớp chưa có GVCN",
      error: error.message,
    });
  }
};

const getClassesWithHomeroomTeacherController = async (req, res) => {
  try {
    const { limit, offset } = req.body;

    // Kiểm tra rỗng
    if (limit == null || offset == null) {
      return res.status(400).json({
        message: "Thiếu tham số limit hoặc offset",
      });
    }

    const { total, classes } = await classService.getClassesWithHomeroomTeacher(
      limit,
      offset
    );

    if (!classes || classes.length === 0) {
      return res.status(200).json({
        message: "Không có lớp nào đã có giáo viên chủ nhiệm",
        total,
        data: [],
      });
    }

    return res.status(200).json({
      message: "Lấy danh sách lớp đã có giáo viên chủ nhiệm thành công",
      total,
      data: classes,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy danh sách lớp đã có GVCN",
      error: error.message,
    });
  }
};


const getListClassesNotSubjectAssignmentController = async (req, res) => {

  try {
    const { subjectIds } = req.body;
    const classes = await classService.getListClassesNotSubjectAssignment(subjectIds);
    return res.status(200).json({
      message: "Lấy danh sách lớp chưa được phân công môn học thành công",
      data: classes,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy danh sách lớp chưa được phân công môn học",
      error: error.message,
    });

  }
}

const getAllIdClassesController = async (req, res) => {
  try {
    const classIds = await classService.getAllIdClasses();

    return res.status(200).json({
      message: "Lấy danh sách ID lớp thành công",
      data: classIds,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy danh sách ID lớp",
      error: error.message,
    });
  }
}

const arrangeStudentsByClassController = async (req, res) => {
  try {
    const { students, classId } = req.body;
    const arrangedStudents = await classService.arrangeStudentsByClassService(
      students,
      classId
    );
    return res.status(200).json({
      message: "Sắp xếp học sinh theo lớp thành công",
      data: arrangedStudents,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Không thể sắp xếp học sinh theo lớp",
    });
  }
};

const transferStudentToClassController = async (req, res) => {
  try {
    const { studentId, newClassId } = req.body;

    if (!studentId || !newClassId) {
      return res.status(400).json({
        message: "Thiếu studentId hoặc newClassId",
      });
    }

    const result = await classService.transferStudentToClass(studentId, newClassId);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Không thể chuyển lớp cho học sinh",
    });
  }
};


const getOneClassSelectScoreTypesController = async (req, res) => {
  try {
    const { classId } = req.params;
    const scoreTypes = await scoreTypeService.getOneClassSelectScoreTypesService(classId);
    return res.status(200).json({
      message: "Lấy loại điểm của lớp thành công",
      data: scoreTypes,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Lỗi khi lấy loại điểm của lớp",

      error: err.message,
    });
  }

};

const getStudentsWithScoresBySubjectController = async (req, res) => {
  try {
    const { classId, subjectId } = req.body;

    if (!classId) {
      return res.status(400).json({
        message: "Thiếu ID lớp học"
      });
    }

    if (!subjectId) {
      return res.status(400).json({
        message: "Thiếu ID môn học"
      });
    }

    const result = await classService.getStudentsWithScoresBySubject(classId, subjectId);

    return res.status(200).json({
      message: "Lấy danh sách học sinh và điểm thành công",
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách học sinh và điểm",
      error: err.message
    });
  }
};

// Lấy tất cả học sinh của lớp gồm điểm và hạnh kiểm
const handleGetStudentsWithScoresAndConducts = async (req, res) => {
  try {
    const { id: classId } = req.params;
    if (!classId) {
      return res.status(400).json({ message: "Thiếu classId" });
    }

    const result = await classService.getStudentsWithScoresAndConducts(classId);

    return res.status(200).json({ message: "Lấy học sinh kèm điểm và hạnh kiểm thành công", data: result });
  } catch (error) {
    return res.status(400).json({ message: "Không thể lấy dữ liệu học sinh", error: error.message });
  }
};

const handleCalculateSemesterResults = async (req, res) => {
  try {
    const { semester, classId } = req.body;
    const result = await classService.calculateSemesterResults({ semester, classId });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Lỗi khi tính điểm" });
  }
};

// Lấy thông tin lớp do giáo viên chủ nhiệm (teacherId có thể là 'me' để lấy theo token)
const handleGetClassByHomeroomTeacher = async (req, res) => {
  try {
    let teacherId = ''

    // Nếu người gọi là teacher và không truyền teacherId hoặc truyền 'me', lấy từ token
    if (req.user && req.user.role === "teacher") {

      const user = await User.findById(req.user.id);

      console.log("User linkedId:", user.linkedId);
      if (!user || !user.linkedId) {
        return res.status(404).json({ message: "Không tìm thấy thông tin giáo viên liên kết" });
      }
      teacherId = user.linkedId;
    }

    if (!teacherId) {
      return res.status(400).json({ message: "Thiếu teacherId" });
    }

    const classData = await classService.getClassByHomeroomTeacher(teacherId);
    return res.status(200).json({ message: "Lấy lớp chủ nhiệm thành công", data: classData });
  } catch (error) {
    return res.status(400).json({ message: "Không thể lấy lớp chủ nhiệm", error: error.message });
  }
};

module.exports = {
  handleCreateClass,
  handleGetAllClasses,
  handleGetOneClass,
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
  getOneClassSelectScoreTypesController,
  getStudentsWithScoresBySubjectController,
  handleGetClassByHomeroomTeacher,
  handleGetStudentsWithScoresAndConducts,
  handleCalculateSemesterResults
};
