// controllers/gradeController.js
const gradeService = require("../services/Grade.service");

const handleCreateGrade = async (req, res) => {
  try {
    const data = req.body;
    const grade = await gradeService.createGrade(data);
    res.status(201).json({ message: "Tạo khối thành công", data: grade });
  } catch (error) {
    res.status(400).json({ message: "Lỗi khi tạo khối", error: error.message });
  }
};

const handlegetAllGrade = async (req, res) => {
  try {
    const { limit, offset } = req.body;

    const result = await gradeService.getAllGrades({ limit, offset });

    return res.status(200).json({
      message: "Lấy danh sách khối thành công",
      total: result.total,
      data: result.grades,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy thông tin khối",
      error: error.message,
    });
  }
};

const handlegetOneGrade = async (req, res) => {
  try {
    const grade = await gradeService.getOneGrade(req.params.id);
    res.status(200).json(grade);
  } catch (error) {
    res
      .status(404)
      .json({ message: "Không thể lấy thông tin khối", error: error.message });
  }
};

const updateGrade = async (req, res) => {
  try {
    const grade = await gradeService.updateGrade(req.params.id, req.body);
    res.status(200).json({ message: "Cập nhật khối thành công", data: grade });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Không thể cập nhật khối", error: error.message });
  }
};

const deleteGrade = async (req, res) => {
  try {
    await gradeService.deleteGrade(req.params.id);
    res.status(200).json({ message: "Xóa khối thành công" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Không thể xóa khối", error: error.message });
  }
};

const handleGetNumberGrade = async (req, res) => {
  try {
    const count = await gradeService.getNumberGrade();
    return res.status(200).json({
      message: "Lấy số lượng khối thành công",
      total: count,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Không thể lấy số lượng khối",
      error: error.message,
    });
  }
};

const handlehandleEditGrade = async (req, res) => {
  try {
    const grade = await gradeService.updateGrade(req.params.id, req.body);
    res.status(200).json({ message: "Cập nhật khối thành công", data: grade });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Không thể cập nhật khối", error: error.message });
  }
};

module.exports = {
  handleCreateGrade,
  handlegetAllGrade,
  handlegetOneGrade,
  handlehandleEditGrade,
  updateGrade,
  deleteGrade,
  handleGetNumberGrade,
};
