const Teacher = require("../models/Teacher.model");
const Department = require("../models/Department.model");
const Subject = require("../models/Subject.model");
const Class = require("../models/Class.model");

const User = require("../models/Users.model");
const { Types } = require("mongoose");

const getAllTeacher = async ({ limit, offset }) => {
  try {
    const queryLimit = parseInt(limit, 10) || 10;
    const queryOffset = parseInt(offset, 10) || 0;

    const teachers = await Teacher.find()
      .skip(queryOffset)
      .limit(queryLimit)
      .sort({ createdAt: -1 })
      .populate("homeroomClass", ["className", "schoolYear", "grade"])
      .populate("subjectSpecialty", "subjectName")
      .populate("departments", "name")
      .populate([
        {
          path: "teachingClasses",
          select: "className schoolYear teachers",
          populate: [
            { path: "teachers.teacher", select: "fullName teacherCode" },
            { path: "teachers.subjects", select: "subjectName subjectCode" },
          ],
        },
      ])
      .populate({
        path: "timetable",
        select: "_id classId",
        populate: [
          {
            path: "classId",
            select: "className schoolYear",
          },
          {
            path: "subjectId",
            select: "subjectName subjectCode",
          },
        ],
      })
      .lean();

    const filteredTeachers = teachers.map((teacher) => {
      const filteredTeachingClasses = (teacher.teachingClasses || []).map((cls) => {
        const matchedTeacher = cls.teachers.find(
          (t) => t.teacher?._id?.toString() === teacher._id.toString()
        );

        return {
          ...cls,
          teachers: matchedTeacher ? [matchedTeacher] : [],
        };
      });

      return {
        ...teacher,
        teachingClasses: filteredTeachingClasses.filter((cls) => cls.teachers.length > 0),
      };
    });

    const total = await Teacher.countDocuments();

    return { total, classes: filteredTeachers };
  } catch (error) {
    throw new Error(error.message || "Không thể lấy danh sách giáo viên");
  }
};


const getOneTeacher = async (teacherId) => {
  try {
    if (!teacherId) throw new Error("Thiếu teacherId");

    const teacher = await Teacher.findById(teacherId)
      .populate("subjectSpecialty", ["subjectName", "subjectCode"])
      .populate("homeroomClass", "className")
      .populate("teachingClasses", "className")
      .populate({
        path: "departments",
        select: "name teachers subjects",
        populate: [
          {
            path: "teachers",
            select: "fullName teacherCode"
          },
          {
            path: "subjects",
            select: "subjectName subjectCode"
          }
        ]
      })
      .populate({
        path: "timetable",
        select: "_id classId",
        populate: [
          {
            path: "classId",
            select: "className schoolYear",
          },
          {
            path: "subjectId",
            select: "subjectName subjectCode",
          },
        ],
      });

    // .populate("timetable.subjectId", "subjectName");

    if (!teacher) throw new Error("Không tìm thấy giáo viên");

    return teacher;
  } catch (error) {
    throw new Error(error.message || "Không thể lấy thông tin giáo viên");
  }
};

const getNumberTeacher = async () => {
  try {
    const count = await Teacher.countDocuments();
    return count;
  } catch (error) {
    throw new Error(error.message || "Không thể đếm số lượng giáo viên");
  }
};

const editTeacher = async (teacherId, updateData) => {
  try {
    if (!teacherId) throw new Error("Thiếu teacherId");
    if (!updateData || Object.keys(updateData).length === 0)
      throw new Error("Dữ liệu cập nhật trống");

    if (updateData.active === "inactive") {
      const classesAsHomeroom = await Class.find({ homeroomTeacher: teacherId });

      const teacher = await Teacher.findById(teacherId).populate("teachingClasses").populate("departments");

      if (classesAsHomeroom.length > 0) {
        throw new Error("Không thể dừng hoạt động giáo viên đang là chủ nhiệm lớp");
      }
      if (teacher.teachingClasses && teacher.teachingClasses.length > 0) {
        throw new Error("Không thể dừng hoạt động giáo viên đang được phân công dạy lớp");
      }
      if (teacher.departments) {
        throw new Error("Không thể dừng hoạt động giáo viên thuộc bộ môn");
      }
    }

    if (
      updateData.subjectSpecialty &&
      Array.isArray(updateData.subjectSpecialty)
    ) {
      const validSubjects = await Subject.find({
        _id: { $in: updateData.subjectSpecialty },
      });

      if (validSubjects.length !== updateData.subjectSpecialty.length) {
        throw new Error("Một hoặc nhiều môn học không tồn tại");
      }
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("subjectSpecialty", "subjectName")
      .populate("homeroomClass", "className")
      .populate("teachingClasses", "className")
      .populate("departments", ["name", "teachers", "subjects"])
      .populate("timetable.classId", "className")
      .populate("timetable.subjectId", "subjectName");

    if (!updatedTeacher)
      throw new Error("Không tìm thấy giáo viên để cập nhật");

    return updatedTeacher;
  } catch (error) {
    throw new Error(error.message || "Không thể chỉnh sửa giáo viên");
  }
};

const assignTeacherToDepartmentService = async ({ teacherId, subjectIds }) => {
  if (!teacherId) throw new Error("Thiếu teacherId");
  // if (!Array.isArray(subjectIds) || subjectIds.length === 0)
  //   throw new Error("Danh sách subjectIds phải là một mảng và không được rỗng");

  // 🔹 Lấy thông tin giáo viên
  const teacher = await Teacher.findById(teacherId)
    .populate("subjectSpecialty", "_id subjectName")
    .populate("teachingClasses", "_id className schoolYear teachers")
    .populate("departments", "_id name");

  if (teacher.active !== "active") {
    throw new Error("Chỉ có thể gán môn chuyên môn cho giáo viên đang hoạt động");
  }

  if (!teacher) throw new Error("Không tìm thấy giáo viên");

  // 🔹 Kiểm tra Department
  const deptId = teacher.departments?._id;
  if (!deptId) throw new Error("Giáo viên chưa được gán vào tổ bộ môn");

  // 🔹 Lấy danh sách môn thuộc tổ bộ môn
  const deptSubjects = await Subject.find({ departmentID: deptId }).select("_id subjectName");
  const deptSubjectIds = deptSubjects.map((s) => String(s._id));

  // 🔹 Kiểm tra môn không thuộc tổ
  const invalidSubjects = subjectIds.filter((id) => !deptSubjectIds.includes(String(id)));
  if (invalidSubjects.length > 0) {
    const invalidNames = await Subject.find({ _id: { $in: invalidSubjects } }).select("subjectName");
    throw new Error(
      `Không thể gán các môn không thuộc tổ bộ môn của giáo viên: ${invalidNames
        .map((s) => s.subjectName)
        .join(", ")}`
    );
  }

  const newSubjectIds = subjectIds.map((id) => String(id));
  const oldSubjectIds = teacher.subjectSpecialty.map((s) => String(s._id));
  const removedSubjectIds = oldSubjectIds.filter((id) => !newSubjectIds.includes(id));

  // Nếu không bỏ môn nào thì cập nhật luôn
  if (removedSubjectIds.length === 0) {
    teacher.subjectSpecialty = newSubjectIds;
    await teacher.save();
    return await teacher.populate("subjectSpecialty");
  }

  // 🔹 Kiểm tra lớp nào đang dạy các môn bị bỏ
  const lockedSubjects = new Set();

  for (const cls of teacher.teachingClasses) {
    // class.teachers chứa danh sách { teacher, subjects }
    const teachingInfo = cls.teachers.find(
      (t) => String(t.teacher) === String(teacherId)
    );

    if (!teachingInfo) continue;

    // Các môn mà giáo viên đang dạy trong lớp này
    const teachingSubjects = teachingInfo.subjects.map((s) => String(s));

    // Nếu môn bị bỏ trùng với môn đang dạy => không được phép
    for (const subId of removedSubjectIds) {
      if (teachingSubjects.includes(subId)) {
        const subjectData = await Subject.findById(subId).select("subjectName");
        if (subjectData) {
          lockedSubjects.add(`${subjectData.subjectName} (lớp ${cls.className})`);
        }
      }
    }
  }

  if (lockedSubjects.size > 0) {
    throw new Error(
      `Không thể bỏ các môn mà giáo viên đang dạy: ${Array.from(lockedSubjects).join(", ")}`
    );
  }

  // 🔹 Nếu mọi thứ hợp lệ thì cập nhật lại danh sách môn chuyên môn
  teacher.subjectSpecialty = newSubjectIds;
  await teacher.save();

  return await teacher.populate("subjectSpecialty");
};

const teachingAssignmentToClassService = async ({ teacherId, classId, subjectIds }) => {
  if (!teacherId) throw new Error("Thiếu teacherId");
  if (!classId) throw new Error("Thiếu classId");
  if (!Array.isArray(subjectIds) || subjectIds.length === 0)
    throw new Error("Danh sách subjectIds không hợp lệ");


  // 🔹 Lấy thông tin giáo viên và lớp
  const [teacher, classData] = await Promise.all([
    Teacher.findById(teacherId).populate("subjectSpecialty", "subjectCode subjectName"),
    Class.findById(classId).populate("teachers.teacher"),
  ]);

  if (!teacher) throw new Error("Không tìm thấy giáo viên");
  if (!classData) throw new Error("Không tìm thấy lớp học");
  if (teacher.active !== "active") {
    throw new Error("Chỉ có thể gán môn chuyên môn cho giáo viên đang hoạt động");
  }

  // Helper + chuẩn hóa danh sách subjectIds thành string/ObjectId để so sánh/lưu
  const toIdStr = (v) => String(v && v._id ? v._id : v);
  const subjectIdStrs = subjectIds.map((id) => String(id));
  const subjectObjectIds = subjectIdStrs.map((id) => new Types.ObjectId(id));

  // Giáo viên chỉ được gán những môn thuộc chuyên môn
  const teacherSubjects = (teacher.subjectSpecialty || []).map((s) => toIdStr(s));
  const invalidSubjects = subjectIdStrs.filter((id) => !teacherSubjects.includes(id));
  if (invalidSubjects.length > 0) {
    throw new Error("Giáo viên không có chuyên môn cho một số môn được gán");
  }

  // Với mỗi môn, nếu đang có giáo viên khác dạy thì gỡ khỏi người đó
  for (const subId of subjectIdStrs) {
    const existingTeacherForSubject = classData.teachers.find((t) =>
      (t.subjects || []).some((s) => toIdStr(s) === subId)
    );

    if (
      existingTeacherForSubject &&
      toIdStr(existingTeacherForSubject.teacher) !== String(teacherId)
    ) {
      existingTeacherForSubject.subjects = (existingTeacherForSubject.subjects || []).filter(
        (s) => toIdStr(s) !== subId
      );

      if (existingTeacherForSubject.subjects.length === 0) {
        classData.teachers = classData.teachers.filter(
          (t) => toIdStr(t.teacher) !== toIdStr(existingTeacherForSubject.teacher)
        );
      }
    }
  }

  // Tạo mới object teacher trong lớp nếu chưa có
  let teacherEntry = classData.teachers.find(
    (t) => toIdStr(t.teacher) === String(teacherId)
  );

  if (!teacherEntry) {
    classData.teachers.push({ teacher: teacher._id, subjects: [] });
    teacherEntry = classData.teachers[classData.teachers.length - 1];
  }

  // Đảm bảo mảng subjects tồn tại
  if (!Array.isArray(teacherEntry.subjects)) {
    teacherEntry.subjects = [];
  }

  // Thêm các môn (tránh trùng lặp) và đảm bảo lưu đúng kiểu ObjectId
  const existingSet = new Set((teacherEntry.subjects || []).map((s) => toIdStr(s)));
  for (const subId of subjectIdStrs) {
    if (!existingSet.has(subId)) {
      teacherEntry.subjects.push(new Types.ObjectId(subId));
      existingSet.add(subId);
    }
  }

  // Đảm bảo Mongoose ghi nhận thay đổi nested array
  classData.markModified("teachers");
  await classData.save();

  // Đảm bảo teacher.teachingClasses có classId
  const isTeachingThisClass = (teacher.teachingClasses || []).some(
    (cid) => String(cid) === String(classId)
  );
  if (!isTeachingThisClass) {
    teacher.teachingClasses.push(classId);
    await teacher.save();
  }

  // Trả về dữ liệu đã populate đầy đủ teacher + subjects
  return await Class.findById(classId).populate([
    {
      path: "teachers.teacher",
      select: "fullName teacherCode",
      populate: { path: "subjectSpecialty", select: "subjectName" },
    },
    {
      path: "teachers.subjects",
      select: "subjectName subjectCode",
    },
  ]);
};

const getAllTeachersNotYetInCharge = async () => {
  try {
    const teachers = await Teacher.find({
      active: "active",
      homeroomClass: { $in: [null, undefined] }
    })
      .select('fullName teacherCode subjectSpecialty')
      .populate('subjectSpecialty', 'subjectName subjectCode');
    return teachers;
  } catch (error) {
    throw new Error(error.message || "Không thể lấy danh sách giáo viên chưa được phân công");
  }
};

const getAllSelectTeacher = async () => {
  try {
    const teachers = await Teacher.find({
      active: "active",
    })
      .select('fullName teacherCode subjectSpecialty')
      .populate('subjectSpecialty', 'subjectName subjectCode');
    return teachers;
  } catch (error) {
    throw new Error(error.message || "Không thể lấy danh sách giáo viên");
  }
};

const getListTeachersNotInDepartmentService = async () => {
  try {
    const teachersNotInDept = await Teacher.find({
      active: "active",
      $or: [
        { departments: { $exists: false } },
        { departments: undefined },
        { departments: null },
      ],
    });

    return teachersNotInDept;
  } catch (error) {
    throw new Error(error.message || "Không thể lấy danh sách giáo viên không thuộc bộ môn");
  }
};


const unassignTeachingFromClassService = async ({ teacherId, classId, subjectIds }) => {
  if (!teacherId) throw new Error("Thiếu trường required: teacherId");
  if (!classId) throw new Error("Thiếu trường required: classId");
  if (!subjectIds) throw new Error("Thiếu trường required: subjectIds");

  // 🔹 Lấy dữ liệu lớp và giáo viên
  const [classData, teacher] = await Promise.all([
    Class.findById(classId),
    Teacher.findById(teacherId),
  ]);

  if (!classData) throw new Error("Không tìm thấy lớp học");
  if (!teacher) throw new Error("Không tìm thấy giáo viên");

  // 1️⃣ Xóa tiết học có subject + teacher tương ứng trong thời khóa biểu
  classData.timetable = classData.timetable.filter(
    (lesson) =>
      !(
        String(lesson.subjectId) === String(subjectIds) &&
        String(lesson.teacherId) === String(teacherId)
      )
  );

  // 2️⃣ Xử lý danh sách giáo viên dạy trong lớp
  const teacherIndex = classData.teachers.findIndex(
    (t) => String(t.teacher._id || t.teacher) === String(teacherId)
  );

  if (teacherIndex !== -1) {
    const teacherEntry = classData.teachers[teacherIndex];

    // Xóa môn khỏi danh sách subjects của giáo viên trong lớp
    teacherEntry.subjects = teacherEntry.subjects.filter(
      (s) => String(s) !== String(subjectIds)
    );

    // Nếu không còn môn nào thì xóa luôn giáo viên khỏi lớp
    if (teacherEntry.subjects.length === 0) {
      classData.teachers.splice(teacherIndex, 1);
    }
  }

  // 3️⃣ Lưu lại thay đổi class
  await classData.save();

  // 4️⃣ Nếu giáo viên không còn dạy lớp này nữa, cập nhật lại trong model Teacher
  const stillTeaching = classData.teachers.some(
    (t) => String(t.teacher._id || t.teacher) === String(teacherId)
  );

  if (!stillTeaching) {
    // Xóa class khỏi danh sách teachingClasses của giáo viên
    teacher.teachingClasses = teacher.teachingClasses.filter(
      (clsId) => String(clsId) !== String(classId)
    );
    await teacher.save();
  }

  // 5️⃣ Trả về dữ liệu lớp đã populate
  const updatedClass = await Class.findById(classId).populate([
    {
      path: "teachers.teacher",
      select: "fullName teacherCode",
      populate: { path: "subjectSpecialty", select: "subjectName" },
    },
    {
      path: "teachers.subjects",
      select: "subjectName subjectCode",
    },
  ]);

  return updatedClass;
};


//===================ROLE TEACHER=======================//




const getOneTeacherRoleTeacher = async (teacherId) => {
  try {
    if (!teacherId) throw new Error("Thiếu teacherId");

    const teacher = await User.findById(teacherId)
      .select('-password -refreshToken')
      .populate({
        path: 'linkedId',
        populate: [
          {
            path: 'subjectSpecialty',
            select: 'subjectName subjectCode'
          },
          {
            path: 'homeroomClass',
            select: 'className schoolYear grade'
          },
          {
            path: 'teachingClasses',
            select: 'className schoolYear teachers',
            populate: [
              { path: 'teachers.teacher', select: 'fullName teacherCode' },
              { path: 'teachers.subjects', select: 'subjectName subjectCode' }
            ]
          },
          {
            path: 'departments',
            select: 'name teachers subjects',
            populate: [
              {
                path: 'teachers',
                select: 'fullName teacherCode'
              },
              {
                path: 'subjects',
                select: 'subjectName subjectCode'
              }
            ]
          },
          {
            path: 'timetable',
            select: '_id classId subjectId',
            populate: [
              {
                path: 'classId',
                select: 'className schoolYear'
              },
              {
                path: 'subjectId',
                select: 'subjectName subjectCode'
              }
            ]
          }
        ]
      });

    if (!teacher) throw new Error("Không tìm thấy giáo viên");

    return teacher;
  } catch (error) {
    throw new Error(error.message || "Không thể lấy thông tin giáo viên");
  }
};

module.exports = {
  getAllTeachersNotYetInCharge,
  getAllTeacher,
  getOneTeacher,
  getNumberTeacher,
  editTeacher,
  assignTeacherToDepartmentService,
  teachingAssignmentToClassService,
  getAllSelectTeacher,
  getListTeachersNotInDepartmentService,
  unassignTeachingFromClassService,
  getOneTeacherRoleTeacher
};
