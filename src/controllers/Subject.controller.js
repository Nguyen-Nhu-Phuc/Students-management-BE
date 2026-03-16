const Subject = require("../services/Subject.service");

const createSubjectController = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        message: "Thiếu dữ liệu môn học",
      });
    }

    const dataSubject = await Subject.createSubjectService({ data });

    return res.status(201).json({
      message: "Tạo môn học thành công",
      data: dataSubject,
    });
  } catch (err) {
    console.error("createSubjectController error:", err);
    return res.status(500).json({
      message: "Lỗi trong quá trình tạo môn học",
      error: err.message,
    });
  }
};

const handleGetAllSubject = async (req, res) => {
  try {
    const { limit, offset } = req.body;

    const result = await Subject.getAllSubject({ limit, offset });

    return res.status(200).json({
      message: "Lấy danh sách lớp thành công",
      total: result.total,
      data: result.subject,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy thông tin lớp",
      error: error.message,
    });
  }
};

const HandleGetOneSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subjectData = await Subject.getOneSubject(id);

    return res.status(200).json({
      message: "Lấy thông tin môn học thành công",
      data: subjectData,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể lấy thông tin môn học",
      error: error.message,
    });
  }
};

const HandleEditSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Thiếu subjectId" });
    }

    if (!data || typeof data !== "object") {
      return res.status(400).json({ message: "Dữ liệu cập nhật không hợp lệ" });
    }

    const updatedSubject = await Subject.editSubject(id, data);

    return res.status(200).json({
      message: "Cập nhật môn học thành công",
      data: updatedSubject,
    });
  } catch (error) {
    console.error("editSubjectController error:", error);
    return res.status(500).json({
      message: "Không thể cập nhật môn học",
      error: error.message,
    });
  }
};

const handleGetNumberSubject = async (req, res) => {
  try {
    const count = await Subject.getNumberSubject();
    return res.status(200).json({
      message: "Lấy số lượng môn học thành công",
      total: count,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể lấy số lượng môn học",
      error: error.message,
    });
  }
};

const getListSubjectsNotInDepartmentController = async (req, res) => {
  try {
    const data = await Subject.getListSubjectsNotInDepartmentService();
    res.status(200).json({
      message: `Danh sách môn học không thuộc bộ môn`,
      data: data
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

const deleteSubjectController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Thiếu subjectId" });
    }
    const deletedSubject = await Subject.deleteSubjectService(id);
    return res.status(200).json({
      message: "Xóa môn học thành công",
      data: deletedSubject,
    });
  }
  catch (error) {
    console.error("deleteSubjectController error:", error);
    return res.status(400).json({
      message: "Không thể xóa môn học",
      error: error.message,
    });
  }
};

module.exports = {
  createSubjectController,
  handleGetAllSubject,
  HandleGetOneSubject,
  HandleEditSubject,
  handleGetNumberSubject,
  getListSubjectsNotInDepartmentController,
  deleteSubjectController
};
