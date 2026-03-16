const SubjectModel = require("../models/Subject.model");

const createSubjectService = async ({ data }) => {
  try {
    const subject = await SubjectModel.create(data);

    if (!subject) {
      throw new Error("Không thể tạo môn học");
    }

    return subject;
  } catch (err) {
    console.error("createSubjectService error:", err);
    throw err; // ném lỗi cho controller bắt
  }
};

const getAllSubject = async ({ limit, offset }) => {
  try {
    const queryLimit = parseInt(limit) || 10;
    const queryOffset = parseInt(offset) || 0;

    const subject = await SubjectModel.find()
      .sort({ createdAt: -1 })
      .skip(queryOffset)
      .limit(queryLimit)
      .populate(
        {
          path: "periods",
          select: "grade subject lessonCount",
          populate: [
            {
              path: "grade",
              select: "gradeName schoolYear, gradeCode",
            }
          ],
        }

      )
      .populate("departmentID", "name");
    //   .populate("homeroomTeacher students");

    const total = await SubjectModel.countDocuments();

    return { total, subject };
  } catch (error) {
    throw new Error(error.message || "Không thể lấy danh sách môn học");
  }
};

const getOneSubject = async (subjectId) => {
  try {
    if (!subjectId) throw new Error("Thiếu subjectId");
    const subjectData = await SubjectModel.findById(subjectId)
      .populate("periods", ["grade", "subject", "lessonCount"])
      .populate("departmentID");
    if (!subjectData) throw new Error("Không tìm thấy môn học");
    return subjectData;
  } catch (error) {
    throw new Error(error.message || "Không thể lấy thông tin môn học");
  }
};

const editSubject = async (subjectId, updateData) => {
  try {
    // Kiểm tra subjectId có tồn tại không
    if (!subjectId) throw new Error("Thiếu subjectId");

    // Lọc chỉ những trường được phép cập nhật
    const allowedFields = [
      "subjectName",
      "subjectCode",
      "primarySubject",
      "description",
      "gradeLevels",
    ];
    const updateFields = {};

    for (const key of allowedFields) {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        updateFields[key] = updateData[key];
      }
    }

    // Nếu không có trường hợp lệ nào được gửi lên
    if (Object.keys(updateFields).length === 0) {
      throw new Error("Không có dữ liệu hợp lệ để cập nhật");
    }

    // Kiểm tra môn học tồn tại không
    const existingSubject = await SubjectModel.findById(subjectId);
    if (!existingSubject) throw new Error("Không tìm thấy môn học");

    // Cập nhật môn học
    const updatedSubject = await SubjectModel.findByIdAndUpdate(
      subjectId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedSubject) throw new Error("Cập nhật môn học thất bại");

    return updatedSubject;
  } catch (error) {
    console.error("editSubject error:", error);
    throw new Error(error.message || "Không thể chỉnh sửa môn học");
  }
};

const getNumberSubject = async () => {
  try {
    const count = await SubjectModel.countDocuments();
    return count;
  } catch (error) {
    console.error("Lỗi khi lấy số lượng môn học:", error);
    throw new Error("Không thể lấy số lượng môn học");
  }
};

const getListSubjectsNotInDepartmentService = async () => {
  try {
    const subjects = await SubjectModel.find({ departmentID: null });
    return subjects;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách môn học không thuộc bộ môn:", error);
    throw new Error("Không thể lấy danh sách môn học không thuộc bộ môn");
  }
};

const deleteSubjectService = async (subjectId) => {
  try {
    if (!subjectId) throw new Error("Thiếu subjectId");


    const subject = await SubjectModel.findById(subjectId);
    if (!subject) throw new Error("Không tìm thấy môn học để xóa");


    if (subject.departmentID) {
      throw new Error("Chỉ có thể xóa môn học không thuộc bộ môn");
    }

    if (subject.periods && subject.periods.length > 0) {
      throw new Error("Không thể xóa môn học đang được sử dụng trong các tiết học");
    }

    const deletedSubject = await SubjectModel.findByIdAndDelete(subjectId);

    return deletedSubject;
  } catch (error) {
    throw new Error(error.message || "Không thể xóa môn học");
  }
};

module.exports = {
  createSubjectService,
  getAllSubject,
  getOneSubject,
  getListSubjectsNotInDepartmentService,
  editSubject,
  getNumberSubject,
  deleteSubjectService

};
