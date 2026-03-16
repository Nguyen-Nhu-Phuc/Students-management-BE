const teacherService = require("../services/Teacher.service");
const Teacher = require("../models/Teacher.model");

const handleGetAllTeacher = async (req, res) => {
  try {
    const { limit, offset } = req.body;

    const result = await teacherService.getAllTeacher({ limit, offset });

    return res.status(200).json({
      message: "Lấy danh sách giáo viên thành công",
      total: result.total,
      data: result.classes,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy thông tin giáo viên",
      error: error.message,
    });
  }
};

const handleGetOneTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Thiếu teacherId" });
    }

    const teacher = await teacherService.getOneTeacher(id);

    return res.status(200).json({
      message: "Lấy thông tin giáo viên thành công",
      data: teacher,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể lấy thông tin giáo viên",
      error: error.message,
    });
  }
};

const handleGetNumberTeacher = async (req, res) => {
  try {
    const count = await teacherService.getNumberTeacher();
    return res.status(200).json({
      message: "Lấy số lượng giáo viên thành công",
      total: count,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể lấy số lượng giáo viên",
      error: error.message,
    });
  }
};

const handleEditTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedTeacher = await teacherService.editTeacher(id, updateData);

    return res.status(200).json({
      message: "Cập nhật thông tin giáo viên thành công",
      data: updatedTeacher,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể chỉnh sửa giáo viên",
      error: error.message,
    });
  }
};

const assignTeacherToDepartmentController = async (req, res) => {
  try {
    const { subjectIds } = req.body;

    let teacherId = req.params.id;

    if (!teacherId || !Array.isArray(subjectIds))
      return res
        .status(400)
        .json({ message: "Thiếu teacherId hoặc danh sách subjectIds không hợp lệ" });

    const updatedTeacher = await teacherService.assignTeacherToDepartmentService({ teacherId, subjectIds });

    res.status(200).json({
      message: "Cập nhật môn chuyên môn của giáo viên thành công",
      data: updatedTeacher,
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Lỗi khi cập nhật môn chuyên môn" });
  }
};

const teachingAssignmentToClassController = async (req, res) => {
  try {
    const { classId, subjectIds } = req.body;

    const teacherId = req.params.id;

    if (!teacherId || !classId || !Array.isArray(subjectIds))
      return res.status(400).json({
        message: "Thiếu teacherId, classId hoặc danh sách subjectIds không hợp lệ",
      });

    const updatedClass = await teacherService.teachingAssignmentToClassService({
      teacherId,
      classId,
      subjectIds,
    });

    res.status(200).json({
      message: "Gán giáo viên vào lớp thành công",
      data: updatedClass,
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Lỗi khi gán giáo viên vào lớp" });
  }
};

const ListOfTeachersNotYetInCharge = async (req, res) => {
  try {
    const teachers = await teacherService.getAllTeachersNotYetInCharge();
    return res.status(200).json({
      message: "Lấy danh sách giáo viên chưa được phân công thành công",
      data: teachers,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể lấy danh sách giáo viên chưa được phân công",
      error: error.message,
    });
  }
};

const getAllSelectTeacherController = async (req, res) => {
  try {
    const teachers = await teacherService.getAllSelectTeacher();
    return res.status(200).json({
      message: "Lấy danh sách giáo viên thành công",
      data: teachers,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể lấy danh sách giáo viên",
      error: error.message,
    });
  }
};


const getListTeachersNotInDepartmentController = async (req, res) => {
  try {
    const data = await teacherService.getListTeachersNotInDepartmentService();
    res.status(200).json({
      message: `Danh sách giáo viên không thuộc bộ môn`,
      data: data
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

const unassignTeachingFromClassController = async (req, res) => {
  try {
    const { teacherId, classId, subjectIds } = req.body;

    const updatedClass = await teacherService.unassignTeachingFromClassService({
      teacherId,
      classId,
      subjectIds,
    });

    return res.status(200).json({
      success: true,
      message: "Hủy phân công giảng dạy thành công",
      data: updatedClass,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Hủy phân công giảng dạy thất bại",
    });
  }
};


// ======================ROLE TEACHER ===========================

const handleGetOneTeacherRoleTeacher = async (req, res) => {
  try {

    const id = req.user?.id;
    if (!id) {
      return res.status(400).json({ message: "Thiếu teacherId" });
    }

    const teacher = await teacherService.getOneTeacherRoleTeacher(id);

    return res.status(200).json({
      message: "Lấy thông tin giáo viên thành công",
      data: teacher,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể lấy thông tin giáo viên",
      error: error.message,
    });
  }
};


module.exports = {
  handleGetAllTeacher,
  handleGetOneTeacher,
  handleGetNumberTeacher,
  ListOfTeachersNotYetInCharge,
  handleEditTeacher,
  assignTeacherToDepartmentController,
  teachingAssignmentToClassController,
  getAllSelectTeacherController,
  unassignTeachingFromClassController,
  getListTeachersNotInDepartmentController,
  handleGetOneTeacherRoleTeacher
};
