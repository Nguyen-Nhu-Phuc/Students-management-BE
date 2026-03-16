const Department = require("../models/Department.model");
const Teacher = require("../models/Teacher.model");
const Subject = require("../models/Subject.model");

const mongoose = require('mongoose');

const createDepartmentService = async (data) => {
  const { name, description, teachers, subjects } = data;

  // 1️⃣ Kiểm tra trùng tên
  const exist = await Department.findOne({ name });
  if (exist) throw new Error("Tên bộ môn đã tồn tại!");

  // 2️⃣ Kiểm tra các môn học đã thuộc bộ môn khác chưa
  if (subjects && subjects.length > 0) {
    const existedSubjects = await Subject.find({
      _id: { $in: subjects },
      departmentID: { $ne: null }, // môn đã có departmentID
    }).populate("departmentID", "name"); // lấy tên bộ môn để báo lỗi rõ hơn
    console.log('existedSubjects', existedSubjects);
    if (existedSubjects.length > 0) {
      const subjectNames = existedSubjects.map(
        (s) => `${s.subjectName} (thuộc ${s.departmentID?.name || "bộ môn khác"})`
      );
      throw new Error(
        `Các môn học sau đã thuộc bộ môn khác: ${subjectNames.join(", ")} `
      );
    }
  }

  if (teachers && teachers.length > 0) {
    const existedTeachers = await Teacher.find({
      _id: { $in: teachers },
      departments: { $ne: null }, // giáo viên đã có departments
    }).populate("departments", "name");

    if (existedTeachers.length > 0) {
      const teacherNames = existedTeachers.map(
        (t) => `${t.fullName} (mã giáo viên: ${t.teacherCode})`
      );
      throw new Error(
        `Các giáo viên sau đã thuộc bộ môn khác: ${teacherNames.join(", ")}`
      );
    }
  }

  // 3️⃣ Tạo mới bộ môn (chưa có trưởng bộ môn)
  const newDepartment = new Department({
    name,
    description,
    teachers: teachers?.map((t) => new mongoose.Types.ObjectId(t)),
    subjects: subjects?.map((s) => new mongoose.Types.ObjectId(s)),
  });

  const saved = await newDepartment.save();

  // 4️⃣ Cập nhật danh sách giáo viên
  if (teachers && teachers.length > 0) {
    await Teacher.updateMany(
      { _id: { $in: teachers } },
      { $set: { departments: saved._id } }
    );
  }

  // 5️⃣ Cập nhật danh sách môn học
  if (subjects && subjects.length > 0) {
    await Subject.updateMany(
      { _id: { $in: subjects } },
      { $set: { departmentID: saved._id } }
    );
  }

  return saved;
};




const getAllDepartmentsService = async ({ limit, offset }) => {

  const queryLimit = parseInt(limit) || 10;
  const queryOffset = parseInt(offset) || 0;

  const departments = await Department.find()
    .sort({ createdAt: -1 })
    .skip(queryOffset)
    .limit(queryLimit)
    .populate("head", "fullName teacherCode")
    .populate("teachers", "fullName teacherCode")
    .populate("subjects", "subjectName subjectCode");

  const total = await Department.countDocuments();

  return { total, departments };
};

const getDepartmentByIdService = async (id) => {
  return await Department.findById(id)
    .populate("head", "fullName teacherCode")
    .populate("teachers", "fullName teacherCode")
    .populate("subjects", "subjectName subjectCode");
};

const updateDepartmentService = async (id, data) => {
  const { name, description, teachers, subjects } = data;

  const session = await mongoose.startSession();
  try {
    let updatedDepartment;

    await session.withTransaction(async () => {
      // Tải bộ môn trong transaction
      const department = await Department.findById(id).session(session);
      if (!department) throw new Error("Không tìm thấy bộ môn!");

      // 🔹 Kiểm tra trùng tên nếu đổi tên
      if (name && name !== department.name) {
        const exist = await Department.findOne({ name }).session(session);
        if (exist) throw new Error("Tên bộ môn đã tồn tại!");
      }

      // 🔹 Nếu có trưởng, không cho phép bỏ trưởng khỏi danh sách
      if (teachers && department.head) {
        const headId = department.head.toString();
        const stillHasHead = teachers.some((t) => t.toString() === headId);
        if (!stillHasHead) {
          throw new Error("Không thể bỏ trưởng bộ môn khỏi danh sách giáo viên!");
        }
      }

      // ✅ Cập nhật thông tin cơ bản (trước)
      department.name = name ?? department.name;
      department.description = description ?? department.description;
      department.teachers =
        teachers?.map((t) => new mongoose.Types.ObjectId(t)) ?? department.teachers;
      department.subjects =
        subjects?.map((s) => new mongoose.Types.ObjectId(s)) ?? department.subjects;

      await department.save({ session });

      // ✅ Đồng bộ lại giáo viên — ném lỗi nếu có giáo viên không cập nhật được
      if (teachers) {
        // 0. Xác thực danh sách giáo viên đầu vào tồn tại
        const teacherDocs = await Teacher.find({ _id: { $in: teachers } })
          .select("_id fullName teacherCode")
          .session(session);

        if (teacherDocs.length !== teachers.length) {
          const existingIds = new Set(teacherDocs.map((t) => t._id.toString()));
          const missing = teachers
            .map((t) => t.toString())
            .filter((tid) => !existingIds.has(tid));
          throw new Error(
            `Không tìm thấy các giáo viên với ID: ${missing.join(", ")}`
          );
        }

        const oldTeachers = await Teacher.find({ departments: department._id })
          .select("_id")
          .session(session);

        const oldTeacherIds = oldTeachers.map((t) => t._id.toString());
        const newTeacherIds = teachers.map((t) => t.toString());

        // 1. Gỡ những giáo viên không còn thuộc bộ môn
        const removedTeacherIds = oldTeacherIds.filter(
          (tid) => !newTeacherIds.includes(tid)
        );

        if (removedTeacherIds.length > 0) {
          // Kiểm tra chuyên môn của giáo viên có chứa môn thuộc bộ môn hiện tại không
          const deptSubjectIds = new Set(
            (department.subjects || []).map((s) => s.toString())
          );

          const teachersToRemove = await Teacher.find({
            _id: { $in: removedTeacherIds },
          })
            .select("fullName teacherCode subjectSpecialty")
            .populate("subjectSpecialty", "subjectName")
            .session(session);

          const conflictedTeachers = [];

          for (const t of teachersToRemove) {
            const specIds = (t.subjectSpecialty || []).map((s) =>
              (s._id || s).toString()
            );
            const hasOverlap = specIds.some((sid) => deptSubjectIds.has(sid));
            if (hasOverlap) {
              conflictedTeachers.push(
                `${t.fullName} (mã giáo viên: ${t.teacherCode})`
              );
            }
          }

          // NÉM LỖI nếu có xung đột
          if (conflictedTeachers.length > 0) {
            throw new Error(
              `Không thể xóa các giáo viên sau do chuyên môn trùng với môn học trong bộ môn: ${conflictedTeachers.join(
                ", "
              )}`
            );
          }

          // Gỡ các giáo viên hợp lệ khỏi bộ môn
          await Teacher.updateMany(
            { _id: { $in: removedTeacherIds } },
            { $set: { departments: null } },
            { session }
          );
        }

        // 2. Gỡ bộ môn cũ khỏi các giáo viên sắp được thêm vào
        await Teacher.updateMany(
          { _id: { $in: newTeacherIds } },
          { $set: { departments: null } },
          { session }
        );

        // 3. Thêm bộ môn mới cho họ
        const resAssign = await Teacher.updateMany(
          { _id: { $in: newTeacherIds } },
          { $set: { departments: department._id } },
          { session }
        );

        // Bảo đảm tất cả giáo viên mục tiêu đều được cập nhật
        if ((resAssign.modifiedCount ?? resAssign.nModified ?? 0) < newTeacherIds.length) {
          throw new Error("Cập nhật giáo viên không thành công cho một hoặc nhiều giáo viên.");
        }
      }

      // ✅ Đồng bộ lại môn học — cho phép ghi đè bộ môn
      if (subjects) {
        const oldSubjects = await Subject.find({
          departmentID: department._id,
        })
          .select("_id")
          .session(session);

        const oldSubjectIds = oldSubjects.map((s) => s._id.toString());
        const newSubjectIds = subjects.map((s) => s.toString());

        // 1. Gỡ những môn học không còn thuộc bộ môn
        const removedSubjectIds = oldSubjectIds.filter(
          (sid) => !newSubjectIds.includes(sid)
        );
        if (removedSubjectIds.length > 0) {
          await Subject.updateMany(
            { _id: { $in: removedSubjectIds } },
            { $unset: { departmentID: "" } },
            { session }
          );
        }

        // 2. Gỡ bộ môn cũ khỏi các môn sắp được thêm vào (nếu có)
        await Subject.updateMany(
          { _id: { $in: newSubjectIds } },
          { $unset: { departmentID: "" } },
          { session }
        );

        // 3. Thêm bộ môn mới
        await Subject.updateMany(
          { _id: { $in: newSubjectIds } },
          { $set: { departmentID: department._id } },
          { session }
        );
      }

      updatedDepartment = department._id;
    });

    // Lấy dữ liệu sau khi commit
    return await Department.findById(updatedDepartment)
      .populate("teachers", "fullName teacherCode")
      .populate("subjects", "subjectName")
      .populate("head", "fullName");
  } finally {
    session.endSession();
  }
};






const deleteDepartmentService = async (id) => {
  const department = await Department.findById(id);
  if (!department) throw new Error("Không tìm thấy bộ môn");

  const teacher = await Department.findById(id)

  if (teacher.teachers && teacher.teachers.length > 0)
    throw new Error('Bộ môn đang chứa giáo viên, không thể xóa')


  await Teacher.updateMany(
    { departments: id },
    { $set: { departments: null } }
  );

  // ✅ Gỡ liên kết khỏi tất cả môn học (vì departmentID không phải mảng)
  await Subject.updateMany(
    { departmentID: id },
    { $set: { departmentID: null } }
  );

  await Department.findByIdAndDelete(id);

  return { message: "Xóa bộ môn thành công" };
};


const assignHeadOfDepartmentService = async (departmentId, teacherId) => {
  // 1️⃣ Kiểm tra bộ môn tồn tại
  const department = await Department.findById(departmentId)
  if (!department) throw new Error('Không tìm thấy bộ môn!')

  // 2️⃣ Kiểm tra giáo viên tồn tại
  const teacher = await Teacher.findById(teacherId)
  if (!teacher) throw new Error('Không tìm thấy giáo viên!')

  // 3️⃣ Kiểm tra giáo viên có thuộc bộ môn không
  const isTeacherInDept = department.teachers?.some(
    t => t.toString() === teacherId.toString()
  )

  if (!isTeacherInDept) {
    throw new Error('Giáo viên này không thuộc bộ môn, không thể làm trưởng bộ môn!')
  }

  // 4️⃣ Cập nhật trưởng bộ môn
  department.head = new mongoose.Types.ObjectId(teacherId)
  const updated = await department.save()

  return updated
}


const listSelectHeadOfDepartmentService = async ({ id }) => {

  const name = await Department.findById(id)
  if (!name) throw new Error('Không tìm thấy bộ môn!')

  const data = await Department.findById(id).populate('teachers', ['fullName', 'teacherCode'])
  return {
    id: data._id,
    department: data.name,
    data: data.teachers
  };

}

const getAllSubjectInDepartmentService = async ({ id }) => {

  const name = await Department.findById(id)
  if (!name) throw new Error('Không tìm thấy bộ môn!')

  const data = await Department.findById(id).populate('subjects', ['subjectName', 'subjectCode'])
  return {
    id: data._id,
    department: data.name,
    data: data.subjects
  };

}

const getNumberDepartment = async () => {
  try {
    const count = await Department.countDocuments();
    return count;
  } catch (error) {
    console.error("Lỗi khi lấy số lượng bộ môn:", error);
    throw new Error("Không thể lấy số lượng bộ môn");
  }
};


module.exports = {
  createDepartmentService,
  getAllDepartmentsService,
  getDepartmentByIdService,
  updateDepartmentService,
  deleteDepartmentService,
  assignHeadOfDepartmentService,
  listSelectHeadOfDepartmentService,
  getAllSubjectInDepartmentService,
  getNumberDepartment
};
