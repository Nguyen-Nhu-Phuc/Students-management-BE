// services/gradeService.js
const Grade = require("../models/Grade.model");
const ClassModel = require("../models/Class.model");
const Period = require("../models/Period.model");

const createGrade = async (data) => {
  try {
    const { gradeName, gradeCode, description, schoolYear } =
      data;

    if (!gradeName || !schoolYear) {
      throw new Error("Thiếu gradeName hoặc schoolYear");
    }

    const newGrade = new Grade({
      gradeName,
      gradeCode,
      description,
      schoolYear
    });

    const savedGrade = await newGrade.save();

    return savedGrade;
  } catch (error) {
    throw new Error(error.message || "Không thể tạo khối");
  }
};

const getAllGrades = async ({ limit, offset }) => {
  try {
    const queryLimit = parseInt(limit) || 10;
    const queryOffset = parseInt(offset) || 0;

    const grades = await Grade.find().skip(queryOffset).limit(queryLimit);

    const total = await Grade.countDocuments();

    return { total, grades };
  } catch (error) {
    throw new Error(error.message || "Không thể lấy danh sách khối");
  }
};

const getOneGrade = async (id) => {
  try {
    if (!id) throw new Error("Thiếu id");

    const gradeData = await Grade.findById(id).populate("classes");

    if (!gradeData) throw new Error("Không tìm thấy khối");

    return gradeData;
  } catch (error) {
    throw new Error(error.message || "Không thể lấy thông tin khối");
  }
};

const updateGrade = async (id, data) => {
  try {
    if (!id) throw new Error("Thiếu ID khối");
    const updated = await Grade.findByIdAndUpdate(id, data, { new: true })
      .populate("classes")
      .populate({
        path: "periods",
        populate: { path: "subject", select: "subjectName" },
      });
    if (!updated) throw new Error("Không tìm thấy khối để cập nhật");
    return updated;
  } catch (error) {
    throw new Error(error.message || "Không thể cập nhật khối");
  }
};

const deleteGrade = async (id) => {
  try {
    if (!id) throw new Error("Thiếu ID khối");
    return await Grade.findByIdAndDelete(id);
  } catch (error) {
    throw new Error(error.message || "Không thể xóa khối");
  }
};

const getNumberGrade = async () => {
  try {
    const count = await Grade.countDocuments();
    return count;
  } catch (error) {
    console.error("Lỗi khi lấy số lượng khối:", error);
    throw new Error("Không thể lấy số lượng khối");
  }
};

module.exports = {
  createGrade,
  getAllGrades,
  getOneGrade,
  updateGrade,
  deleteGrade,
  getNumberGrade
};
