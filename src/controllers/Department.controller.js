const departmentService = require("../services/Department.service");

const createDepartmentController = async (req, res) => {
  try {

    const result = await departmentService.createDepartmentService(req.body);
    return res.status(201).json({
      message: "Tạo bộ môn thành công",
      data: result,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const getAllDepartmentsController = async (req, res) => {
  try {
    const { limit, offset } = req.body;

    const result = await departmentService.getAllDepartmentsService({ limit, offset });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getDepartmentByIdController = async (req, res) => {
  try {
    const result = await departmentService.getDepartmentByIdService(req.params.id);
    if (!result) return res.status(404).json({ message: "Không tìm thấy bộ môn" });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const updateDepartmentController = async (req, res) => {
  try {
    const result = await departmentService.updateDepartmentService(req.params.id, req.body);
    return res.status(200).json({
      message: "Cập nhật bộ môn thành công",
      data: result,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const deleteDepartmentController = async (req, res) => {
  try {
    const result = await departmentService.deleteDepartmentService(req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const assignHeadOfDepartmentController = async (req, res) => {
  try {
    const { id } = req.params
    const { teacherId } = req.body

    if (!teacherId) {
      return res.status(400).json({ message: 'Thiếu ID giáo viên!' })
    }

    const updated = await departmentService.assignHeadOfDepartmentService(id, teacherId)

    res.status(200).json({
      message: 'Phân công trưởng bộ môn thành công!',
      data: updated
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const listSelectHeadOfDepartmentController = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) {
      return res.status(400).json({ message: 'Thiếu ID bộ môn!' })
    }

    const data = await departmentService.listSelectHeadOfDepartmentService({ id })

    res.status(200).json({
      message: `Danh sách giáo viên thuộc bộ môn ${data.department}`,
      data: data
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getAllSubjectInDepartmentController = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) {
      return res.status(400).json({ message: 'Thiếu ID bộ môn!' })
    }

    const data = await departmentService.getAllSubjectInDepartmentService({ id })

    res.status(200).json({
      message: `Danh sách giáo viên thuộc bộ môn ${data.department}`,
      data: data
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const handleGetNumberDepartment = async (req, res) => {
  try {
    const count = await departmentService.getNumberDepartment();
    return res.status(200).json({
      message: "Lấy số lượng bộ môn thành công",
      total: count,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể lấy số lượng bộ môn",
      error: error.message,
    });
  }
};




module.exports = {
  createDepartmentController,
  getAllDepartmentsController,
  getDepartmentByIdController,
  updateDepartmentController,
  deleteDepartmentController,
  assignHeadOfDepartmentController,
  listSelectHeadOfDepartmentController,
  getAllSubjectInDepartmentController,
  handleGetNumberDepartment
};
