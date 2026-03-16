const Class = require("../models/Class.model");
const Student = require("../models/Student.model");
const Teacher = require("../models/Teacher.model");
const mongoose = require("mongoose");
const Grade = require("../models/Grade.model");

const createClass = async (data) => {
  try {
    if (!data || !data.className || !data.schoolYear) {
      throw new Error("Thiếu thông tin bắt buộc (className, schoolYear)");
    }

    const newClass = new Class({
      className: data.className,
      schoolYear: data.schoolYear,
      homeroomTeacher: data.homeroomTeacher || null,
      grade: data.grade || null,
    });

    if (data.grade) {
      await Grade.findByIdAndUpdate(
        data.grade,
        { $addToSet: { classes: newClass._id } },
        { new: true }
      );
    }

    await newClass.save();


    return newClass;
  } catch (error) {
    throw error;
  }
};


const getAllClasses = async ({ limit, offset }) => {
  try {
    const queryLimit = parseInt(limit) || 10;
    const queryOffset = parseInt(offset) || 0;

    const classes = await Class.find()
      .skip(queryOffset)
      .limit(queryLimit)
      .sort({ className: 1 })
      .populate([
        {
          path: "homeroomTeacher",
          select: "fullName teacherCode gender",
          populate: {
            path: "subjectSpecialty",
            select: "subjectName",
          }
        },
        {
          path: "students",
          select: "fullName studentCode gender dob admissionYear active",
        },
        {
          path: "teachers",
          populate: [
            {
              path: "teacher",
              select: "fullName teacherCode",
            },
            {
              path: "subjects",
              select: "subjectName subjectCode",
            },
          ],
        },

        {
          path: "grade",
          select: "gradeName gradeCode schoolYear"
        }
      ])
      .sort({ createdAt: -1 });

    const total = await Class.countDocuments();

    return { total, classes };
  } catch (error) {
    throw new Error(error.message || "Không thể lấy danh sách lớp");
  }
};

const getOneClass = async (classId) => {
  try {
    if (!classId) throw new Error("Thiếu classId");

    const classData = await Class.findById(classId)
      .populate("homeroomTeacher", "fullName")
      .populate("students", "fullName studentCode gender dob active")
      .populate("grade", "gradeName gradeCode schoolYear")
      .populate([
        {
          path: "homeroomTeacher",
          select: "fullName teacherCode gender",
          populate: {
            path: "subjectSpecialty",
            select: "subjectName",
          }
        },
        {
          path: "students",
          select: "fullName studentCode gender dob admissionYear active",
        },
        {
          path: "teachers",
          populate: [
            {
              path: "teacher",
              select: "fullName teacherCode",
            },
            {
              path: "subjects",
              select: "subjectName subjectCode",
            },
          ],
        },

        {
          path: "grade",
          select: "gradeName gradeCode schoolYear"
        }
      ])
      .populate({
        path: "timetable",
        populate: [
          {
            path: "teacherId",
            select: "fullName teacherCode",
          },
          {
            path: "subjectId",
            select: "subjectName subjectCode",
          },
        ],
      });
    if (!classData) throw new Error("Không tìm thấy lớp");

    if (!classData) throw new Error("Không tìm thấy lớp");

    return classData;
  } catch (error) {
    throw new Error(error.message || "Không thể lấy thông tin lớp");
  }
};

const getStudentsWithScoresAndConducts = async (classId) => {
  try {
    if (!classId) throw new Error("Thiếu classId");

    const classInfo = await Class.findById(classId).populate({
      path: "students",
      select: "_id studentCode fullName gender dob admissionYear active scores conducts",
      populate: [
        { path: "scores.subjectId", select: "subjectName subjectCode" },
        { path: "scores.scoreTypeId", select: "name displayName defaultCoefficient semester" },
        { path: "conducts.conduct", select: "name displayName semester" },
      ],
    });

    if (!classInfo) throw new Error("Lớp học không tồn tại");

    // Map students to a cleaner structure
    const students = (classInfo.students || []).map((stu) => {
      const scores = (stu.scores || []).map((s) => ({
        scoreId: s._id,
        subject: s.subjectId ? { _id: s.subjectId._id, subjectName: s.subjectId.subjectName, subjectCode: s.subjectId.subjectCode } : { _id: s.subjectId },
        scoreType: s.scoreTypeId
          ? {
            _id: s.scoreTypeId._id,
            name: s.scoreTypeId.name,
            displayName: s.scoreTypeId.displayName,
            coefficient: s.scoreTypeId.defaultCoefficient,
            semester: s.scoreTypeId.semester,
          }
          : { _id: s.scoreTypeId },
        score: s.score,
      }));

      const conducts = (stu.conducts || []).map((c) => ({
        _id: c._id,
        conductSetting: c.conduct ? { _id: c.conduct._id, name: c.conduct.name, displayName: c.conduct.displayName, semester: c.conduct.semester } : null,
      }));

      return {
        _id: stu._id,
        studentCode: stu.studentCode,
        fullName: stu.fullName,
        gender: stu.gender,
        dob: stu.dob,
        admissionYear: stu.admissionYear,
        active: stu.active,
        scores,
        conducts,
      };
    });

    return {
      classId: classInfo._id,
      className: classInfo.className,
      schoolYear: classInfo.schoolYear,
      totalStudents: students.length,
      students,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Tính điểm trung bình học kỳ cho tất cả học sinh trong lớp
 * Input: { semester, classId }
 * - Kiểm tra tồn tại của các ScoreType active cho semester
 * - Kiểm tra với mỗi học sinh và mỗi môn được dạy trong lớp có đầy đủ cột điểm (scoreType) hay không
 * - Nếu thiếu -> ném lỗi và dừng
 * - Nếu đủ -> tính điểm trung bình từng môn theo hệ số và lưu vào student.results (theo subject)
 *   và lưu điểm trung bình học kỳ (GPA) vào student.summarys
 */
const calculateSemesterResults = async ({ semester, classId }) => {
  const ScoreType = require("../models/ScoreSetting.model");
  const Student = require("../models/Student.model");

  if (!semester) throw new Error("Thiếu semester");
  if (!classId) throw new Error("Thiếu classId");

  // Lấy lớp và danh sách môn được dạy trong lớp
  const classInfo = await Class.findById(classId).populate({
    path: "teachers",
    populate: { path: "subjects", select: "_id subjectName primarySubject" },
  });
  if (!classInfo) throw new Error("Lớp học không tồn tại");

  // Thu thập subjectIds và subjectMap dạy trong lớp
  const subjectSet = new Set();
  const subjectMap = new Map(); // Map để lưu subjectId -> {subjectName, primarySubject}
  (classInfo.teachers || []).forEach((t) => {
    (t.subjects || []).forEach((s) => {
      const subjectId = String(s._id || s);
      subjectSet.add(subjectId);
      if (s.subjectName) {
        subjectMap.set(subjectId, { subjectName: s.subjectName, primarySubject: s.primarySubject || 0 });
      }
    });
  });
  const subjectIds = Array.from(subjectSet);

  if (subjectIds.length === 0) {
    throw new Error("Lớp chưa có môn được phân công, không thể tính điểm");
  }

  // Nếu là CN, không cần validate điểm, chỉ lấy học sinh và tính từ HKI/HKII
  if (semester === "CN") {
    const students = await Student.find({ _id: { $in: classInfo.students } })
      .populate({ path: "conducts.conduct", select: "_id name displayName semester" });

    // Validation: đảm bảo mỗi học sinh đã được đánh giá hạnh kiểm cho HKII (sử dụng hạnh kiểm HK2 cho cả năm)
    const missingConducts = [];
    for (const stu of students) {
      const hasConductForHKII = (stu.conducts || []).some(
        (c) => c.conduct && c.conduct.semester === "HKII"
      );
      if (!hasConductForHKII) {
        missingConducts.push(stu.studentCode);
      }
    }

    if (missingConducts.length > 0) {
      const studentList = missingConducts.slice(0, 10).join(", ");
      const more = missingConducts.length > 10 ? ` và ${missingConducts.length - 10} học sinh khác` : "";
      throw new Error(`Các học sinh sau chưa được đánh giá hạnh kiểm học kỳ II (cần cho tính cả năm): ${studentList}${more}`);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      for (const stu of students) {
        // Tính GPA cho CN: (GPA_HKI + 2*GPA_HKII)/3
        const hkiSummary = (stu.summarys || []).find(s => s.semester === "HKI" && String(s.class) === String(classId));
        const hkiiSummary = (stu.summarys || []).find(s => s.semester === "HKII" && String(s.class) === String(classId));
        const gpaHKI = hkiSummary ? Number(hkiSummary.gpa) : 0;
        const gpaHKII = hkiiSummary ? Number(hkiiSummary.gpa) : 0;
        const semesterAvgFromResults = +((gpaHKI + 2 * gpaHKII) / 3).toFixed(2);

        // Lấy academicAbility từ HKII (hoặc lấy từ HKI nếu HKII không có)
        const academicAbility = (hkiiSummary && hkiiSummary.academicAbility) || (hkiSummary && hkiSummary.academicAbility) || "Yếu";

        // Ghi đè CN summary cũ nếu có
        stu.summarys = (stu.summarys || []).filter((s) => !(s.semester === "CN" && String(s.class) === String(classId)));

        // Sử dụng hạnh kiểm của học kỳ II cho cả năm
        const conductForSemester = (stu.conducts || []).find((c) => c.conduct && c.conduct.semester === "HKII");
        const conductValue = conductForSemester ? (conductForSemester.conduct.displayName || conductForSemester.conduct.name) : null;
        stu.summarys.push({ gpa: semesterAvgFromResults, semester: "CN", class: classId, conduct: conductValue, academicAbility });

        await stu.save({ session });
      }

      await session.commitTransaction();
      session.endSession();
      return { message: `Tính điểm cả năm cho lớp ${classInfo.className} thành công`, total: students.length };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  // Lấy các loại điểm active cho semester (HKI/HKII)
  const activeScoreTypes = await ScoreType.find({ status: "active", semester });
  if (!activeScoreTypes || activeScoreTypes.length === 0) {
    throw new Error(`Không có loại điểm active cho học kỳ ${semester}`);
  }

  // Lấy tất cả học sinh của lớp, populate scores và conducts
  const students = await Student.find({ _id: { $in: classInfo.students } })
    .populate({ path: "scores.subjectId", select: "_id subjectName" })
    .populate({ path: "scores.scoreTypeId", select: "_id name displayName defaultCoefficient semester" })
    .populate({ path: "conducts.conduct", select: "_id name displayName semester" });

  // Validation: đảm bảo mỗi học sinh có điểm cho mỗi subject và mỗi active scoreType
  const missingEntries = [];
  for (const stu of students) {
    for (const subjectId of subjectIds) {
      for (const st of activeScoreTypes) {
        const found = (stu.scores || []).some((sc) => String(sc.subjectId._id || sc.subjectId) === String(subjectId) && String(sc.scoreTypeId._id || sc.scoreTypeId) === String(st._id));
        if (!found) {
          const subjectInfo = subjectMap.get(subjectId);
          const subjectName = subjectInfo ? subjectInfo.subjectName : subjectId;
          missingEntries.push({ studentId: stu._id, studentCode: stu.studentCode, subjectName, scoreTypeId: st._id, scoreTypeName: st.displayName || st.name });
        }
      }
    }
  }

  if (missingEntries.length > 0) {
    // Build readable error with subject names
    const messages = missingEntries.slice(0, 10).map((m) => `HS:${m.studentCode} thiếu ${m.scoreTypeName} cho môn ${m.subjectName}`);
    const more = missingEntries.length > 10 ? ` và ${missingEntries.length - 10} lỗi khác` : "";
    throw new Error(`Phát hiện thiếu điểm: ${messages.join(", ")} ${more}`);
  }

  // Validation: đảm bảo mỗi học sinh đã được đánh giá hạnh kiểm cho học kỳ này
  const missingConducts = [];
  for (const stu of students) {
    const hasConductForSemester = (stu.conducts || []).some(
      (c) => c.conduct && c.conduct.semester === semester
    );
    if (!hasConductForSemester) {
      missingConducts.push(stu.studentCode);
    }
  }

  if (missingConducts.length > 0) {
    const studentList = missingConducts.slice(0, 10).join(", ");
    const more = missingConducts.length > 10 ? ` và ${missingConducts.length - 10} học sinh khác` : "";
    throw new Error(`Các học sinh sau chưa được đánh giá hạnh kiểm học kỳ ${semester}: ${studentList}${more}`);
  }

  // All validated -> begin transaction to write results
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    for (const stu of students) {
      // Tính điểm trung bình từng môn
      const subjectAverages = [];
      for (const subjectId of subjectIds) {
        let numerator = 0;
        let denom = 0;
        for (const st of activeScoreTypes) {
          // lấy tất cả cột điểm phù hợp (có thể có nhiều cột cùng type) -> lấy trung bình của các cột đó
          const matched = (stu.scores || []).filter((sc) => String(sc.subjectId._id || sc.subjectId) === String(subjectId) && String(sc.scoreTypeId._id || sc.scoreTypeId) === String(st._id));
          const values = matched.map((m) => (m.score !== null && m.score !== undefined ? Number(m.score) : NaN)).filter((v) => !isNaN(v));
          if (values.length === 0) {
            // shouldn't happen due to earlier validation
            throw new Error(`Thiếu điểm cho HS ${stu.studentCode} môn ${subjectId} loại ${st.displayName || st.name}`);
          }
          const avgOfType = values.reduce((a, b) => a + b, 0) / values.length;
          numerator += avgOfType * (st.defaultCoefficient || 1);
          denom += (st.defaultCoefficient || 1);
        }
        const subjectAvg = denom > 0 ? +(numerator / denom).toFixed(2) : 0;
        subjectAverages.push({ subjectId, averageScore: subjectAvg });
      }

      // Cập nhật student.results: xóa các kết quả cũ cho cùng semester và class
      stu.results = (stu.results || []).filter((r) => !(r.semester === semester && String(r.class) === String(classId)));
      // Thêm từng subject result
      for (const sa of subjectAverages) {
        stu.results.push({ semester, class: classId, averageScore: sa.averageScore, subject: sa.subjectId });
      }

      // Lấy trung bình từ results vừa cập nhật
      const resultsForSemester = stu.results.filter(
        (r) => r.semester === semester && String(r.class) === String(classId)
      );
      const semesterAvgFromResults = resultsForSemester.length > 0
        ? +(
          resultsForSemester.reduce((acc, it) => acc + (Number(it.averageScore) || 0), 0) /
          resultsForSemester.length
        ).toFixed(2)
        : 0;

      // Lấy hạnh kiểm
      const conductForSemester = (stu.conducts || []).find((c) => c.conduct && c.conduct.semester === semester);
      const conductValue = conductForSemester ? (conductForSemester.conduct.displayName || conductForSemester.conduct.name) : null;

      // Tính academicAbility dựa vào điểm các môn và hạnh kiểm
      let academicAbility = "Yếu";

      // Nếu hạnh kiểm yếu => academicAbility: "Yếu"
      if (conductValue && conductValue.toLowerCase().includes("yếu")) {
        academicAbility = "Yếu";
      } else {
        // Phân loại điểm các môn theo primarySubject
        const primarySubjectScores = [];
        const otherSubjectScores = [];

        for (const sa of subjectAverages) {
          const subjectInfo = subjectMap.get(String(sa.subjectId));
          if (subjectInfo && subjectInfo.primarySubject === 1) {
            primarySubjectScores.push(sa.averageScore);
          } else {
            otherSubjectScores.push(sa.averageScore);
          }
        }

        // Kiểm tra điều kiện xếp loại Giỏi
        const hasExcellentPrimary = primarySubjectScores.some(score => score >= 8);
        const allOthersGood = otherSubjectScores.every(score => score >= 6.5);
        const excellentConduct = conductValue && (conductValue.toLowerCase().includes("giỏi") || conductValue.toLowerCase().includes("khá") || conductValue.toLowerCase().includes("xuất sắc"));
        // Kiểm tra khống chế: nếu có môn chính < 6.5 thì không được Giỏi
        const hasPrimaryBelow6_5 = primarySubjectScores.some(score => score < 6.5);

        if (hasExcellentPrimary && allOthersGood && semesterAvgFromResults >= 8 && excellentConduct && !hasPrimaryBelow6_5) {
          academicAbility = "Giỏi";
        }
        // Kiểm tra điều kiện xếp loại Khá
        else {
          const hasGoodPrimary = primarySubjectScores.some(score => score >= 6.5);
          const allOthersFair = otherSubjectScores.every(score => score >= 5.0);
          const goodConduct = conductValue && (conductValue.toLowerCase().includes("giỏi") || conductValue.toLowerCase().includes("khá") || conductValue.toLowerCase().includes("xuất sắc"));
          // Kiểm tra khống chế: nếu có môn chính < 5 thì không được Khá
          const hasPrimaryBelow5 = primarySubjectScores.some(score => score < 5);

          if (hasGoodPrimary && allOthersFair && semesterAvgFromResults >= 6.5 && goodConduct && !hasPrimaryBelow5) {
            academicAbility = "Khá";
          }
          // Kiểm tra điều kiện xếp loại Trung bình
          else {
            const hasAveragePrimary = primarySubjectScores.some(score => score >= 5);
            const allOthersPass = otherSubjectScores.every(score => score >= 4);

            if (hasAveragePrimary && allOthersPass && semesterAvgFromResults >= 4) {
              academicAbility = "Trung bình";
            }
            // Còn lại là Yếu
            else {
              academicAbility = "Yếu";
            }
          }
        }
      }

      stu.summarys = (stu.summarys || []).filter((s) => !(s.semester === semester && String(s.class) === String(classId)));
      stu.summarys.push({ gpa: semesterAvgFromResults, semester, class: classId, conduct: conductValue, academicAbility });

      await stu.save({ session });
    }

    await session.commitTransaction();
    session.endSession();
    return { message: `Tính điểm học kỳ ${semester} cho lớp ${classInfo.className} thành công`, total: students.length };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

const getClassByHomeroomTeacher = async (teacherId) => {
  try {
    if (!teacherId) throw new Error("Thiếu teacherId");

    const classData = await Class.findOne({ homeroomTeacher: teacherId })
      .populate([
        {
          path: "homeroomTeacher",
          select: "fullName teacherCode gender",
          populate: {
            path: "subjectSpecialty",
            select: "subjectName",
          },
        },
        {
          path: "students",
          select: "fullName studentCode gender dob admissionYear active",
        },
        {
          path: "teachers",
          populate: [
            {
              path: "teacher",
              select: "fullName teacherCode",
            },
            {
              path: "subjects",
              select: "subjectName subjectCode",
            },
          ],
        },

        {
          path: "grade",
          select: "gradeName gradeCode schoolYear",
        },
      ])
      .populate({
        path: "timetable",
        populate: [
          {
            path: "teacherId",
            select: "fullName teacherCode",
          },
          {
            path: "subjectId",
            select: "subjectName subjectCode",
          },
        ],
      });

    if (!classData) throw new Error("Không tìm thấy lớp do giáo viên chủ nhiệm");

    return classData;
  } catch (error) {
    throw new Error(error.message || "Không thể lấy lớp theo giáo viên chủ nhiệm");
  }
};

const deleteClass = async (classId) => {
  try {
    if (!classId) throw new Error("Thiếu classId");

    const currentClass = await Class.findById(classId);
    if (!currentClass) throw new Error("Không tìm thấy lớp để xóa");

    // Kiểm tra các dữ liệu liên kết
    const linkedData = [];

    if (currentClass.homeroomTeacher) {
      linkedData.push("giáo viên chủ nhiệm");
    }

    if (currentClass.students?.length > 0) {
      linkedData.push("học sinh");
    }

    if (currentClass.teachers?.length > 0) {
      linkedData.push("giáo viên giảng dạy");
    }

    if (currentClass.grade) {
      linkedData.push("khối");
    }

    if (currentClass.timetable?.length > 0) {
      linkedData.push("thời khóa biểu");
    }

    // Nếu có bất kỳ dữ liệu liên kết nào thì không cho xóa
    if (linkedData.length > 0) {
      throw new Error(
        `Không thể xóa lớp vì đang có dữ liệu liên kết: ${linkedData.join(", ")}`
      );
    }

    await Class.findByIdAndDelete(classId);

    return { message: "Xóa lớp thành công" };
  } catch (error) {
    throw new Error(error.message || "Xóa lớp thất bại");
  }
};

const getNumberClass = async () => {
  try {
    const count = await Class.countDocuments();
    return count;
  } catch (error) {
    throw new Error(error.message || "Không thể đếm số lượng lớp");
  }
};

const editClass = async (classId, updateData) => {
  try {
    if (!classId) throw new Error("Thiếu classId");

    // 1️⃣ Lấy thông tin lớp hiện tại
    const currentClass = await Class.findById(classId);
    if (!currentClass) throw new Error("Không tìm thấy lớp");

    // 2️⃣ Kiểm tra logic GVCN (giáo viên chủ nhiệm)
    if (updateData.homeroomTeacher && currentClass.homeroomTeacher) {
      throw new Error(
        "Giáo viên chủ nhiệm chỉ được bổ nhiệm 1 lần cho lớp này, không thể thay đổi"
      );
    }

    // 3️⃣ Kiểm tra GVCN mới (nếu có)
    if (updateData.homeroomTeacher && !currentClass.homeroomTeacher) {
      const teacher = await Teacher.findById(updateData.homeroomTeacher).populate(
        "homeroomClass",
        "className"
      );

      if (!teacher) throw new Error("Không tìm thấy giáo viên");
      if (teacher.homeroomClass) {
        throw new Error(
          `Giáo viên ${teacher.fullName} đã là GVCN của lớp ${teacher.homeroomClass.className}`
        );
      }
    }

    // 4️⃣ Xử lý học sinh thêm/xóa khỏi lớp
    if (updateData.students && Array.isArray(updateData.students)) {
      const oldStudents = currentClass.students.map((id) => id.toString());
      const newStudents = updateData.students.map((id) => id.toString());

      const removedStudents = oldStudents.filter((id) => !newStudents.includes(id));
      const addedStudents = newStudents.filter((id) => !oldStudents.includes(id));

      if (removedStudents.length > 0) {
        await Student.updateMany(
          { _id: { $in: removedStudents } },
          { $set: { currentClass: null } }
        );
      }

      if (addedStudents.length > 0) {
        await Student.updateMany(
          { _id: { $in: addedStudents } },
          { $set: { currentClass: classId } }
        );
      }
    }

    // 5️⃣ Xử lý khi đổi khối (grade)
    if (updateData.grade && updateData.grade.toString() !== currentClass.grade?.toString()) {
      // Kiểm tra grade mới có tồn tại không
      const newGrade = await Grade.findById(updateData.grade);
      if (!newGrade) throw new Error("Khối lớp mới không tồn tại");

      // Gỡ lớp khỏi khối cũ
      if (currentClass.grade) {
        await Grade.findByIdAndUpdate(currentClass.grade, {
          $pull: { classes: classId },
        });
      }

      // Thêm lớp vào khối mới
      await Grade.findByIdAndUpdate(updateData.grade, {
        $addToSet: { classes: classId },
      });
    }

    // 6️⃣ Cập nhật thông tin lớp
    const updatedClass = await Class.findByIdAndUpdate(classId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("homeroomTeacher", "fullName")
      .populate("students", ["fullName", "studentCode", "gender", "dob"])
      .populate("grade", ["gradeName", "schoolYear"]);

    if (!updatedClass) throw new Error("Cập nhật lớp thất bại");

    // 7️⃣ Đồng bộ giáo viên chủ nhiệm
    if (updateData.homeroomTeacher && !currentClass.homeroomTeacher) {
      await Teacher.findByIdAndUpdate(updateData.homeroomTeacher, {
        $set: { homeroomClass: classId },
      });
    }

    return updatedClass;
  } catch (error) {
    throw new Error(error.message || "Cập nhật lớp thất bại");
  }
};


const countStudentsInClass = async (classId) => {
  try {
    if (!classId) {
      throw new Error("Class ID is required");
    }

    const classData = await Class.findById(classId).populate("students");
    if (!classData) {
      throw new Error("Class not found");
    }

    // Đếm số học sinh
    const studentCount = classData.students.length;

    return { classId, className: classData.className, studentCount };
  } catch (error) {
    throw new Error(error.message || "Failed to count students in class");
  }
};

const assignHomeroomTeacher = async (classId, teacherId) => {
  try {
    if (!classId || !teacherId) throw new Error("Thiếu classId hoặc teacherId");

    // 1️⃣ Lấy lớp hiện tại (populate để có tên GVCN)
    const currentClass = await Class.findById(classId).populate(
      "homeroomTeacher",
      "fullName"
    );
    if (!currentClass) throw new Error("Không tìm thấy lớp");

    // 2️⃣ Lấy thông tin giáo viên (populate lớp chủ nhiệm hiện tại)
    const teacher = await Teacher.findById(teacherId).populate(
      "homeroomClass",
      "className"
    );
    if (!teacher) throw new Error("Không tìm thấy giáo viên");

    // 3️⃣ Gom lỗi nếu có
    const errors = [];

    if (currentClass.homeroomTeacher) {
      errors.push(
        `Lớp này đã có giáo viên chủ nhiệm là ${currentClass.homeroomTeacher.fullName}`
      );
    }

    if (teacher.homeroomClass) {
      errors.push(
        `Giáo viên ${teacher.fullName} đã là GVCN của lớp ${teacher.homeroomClass.className}, không thể chủ nhiệm thêm`
      );
    }

    // 4️⃣ Nếu có bất kỳ lỗi nào thì ném ra cùng lúc
    if (errors.length > 0) {
      throw new Error(errors.join(" và "));
    }

    // 5️⃣ Nếu hợp lệ thì cập nhật cả 2 bảng
    currentClass.homeroomTeacher = teacherId;
    await currentClass.save();

    // teacher.departments = [];

    teacher.homeroomClass = classId;
    await teacher.save();

    // 6️⃣ Trả về lớp đã populate GVCN
    return await currentClass.populate("homeroomTeacher", "fullName");
  } catch (error) {
    throw new Error(error.message || "Không thể phân bổ giáo viên chủ nhiệm");
  }
};

const removeHomeroomTeacher = async (classId) => {
  try {
    if (!classId) throw new Error("Thiếu classId");

    const currentClass = await Class.findById(classId).populate(
      "homeroomTeacher",
      "fullName"
    );
    if (!currentClass) throw new Error("Không tìm thấy lớp");

    if (!currentClass.homeroomTeacher) {
      throw new Error("Lớp này chưa có giáo viên chủ nhiệm để xóa");
    }

    const teacherId = currentClass.homeroomTeacher._id;

    currentClass.homeroomTeacher = null;
    await currentClass.save();

    await Teacher.findByIdAndUpdate(teacherId, {
      $set: { homeroomClass: null },
    });

    return currentClass;
  } catch (error) {
    throw new Error(error.message || "Không thể xóa giáo viên chủ nhiệm");
  }
};

const getClassesWithoutHomeroomTeacher = async (limit, offset) => {
  try {
    // Kiểm tra đầu vào
    if (limit == null || offset == null)
      throw new Error("Thiếu limit hoặc offset");

    const query = {
      $or: [{ homeroomTeacher: { $exists: false } }, { homeroomTeacher: null }],
    };

    const total = await Class.countDocuments(query);

    const classes = await Class.find(query)
      .populate("grade", "gradeName")
      .skip(offset)
      .limit(limit)
      .lean();

    return { total, classes };
  } catch (error) {
    throw new Error("Lỗi khi lấy danh sách lớp chưa có GVCN: " + error.message);
  }
};

const getClassesWithHomeroomTeacher = async (limit, offset) => {
  try {
    if (limit == null || offset == null)
      throw new Error("Thiếu limit hoặc offset");

    const query = { homeroomTeacher: { $ne: null } };

    const total = await Class.countDocuments(query);

    const classes = await Class.find(query)
      .populate("grade", "gradeName")
      .populate("homeroomTeacher", "fullName teacherCode")
      .skip(offset)
      .limit(limit)
      .lean();

    return { total, classes };
  } catch (error) {
    throw new Error("Lỗi khi lấy danh sách lớp đã có GVCN: " + error.message);
  }
};

const getListClassesNotSubjectAssignment = async (subjectIds = []) => {
  try {

    const subjectObjectIds = (Array.isArray(subjectIds) ? subjectIds : [subjectIds])
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Lấy các lớp không có bất kỳ giáo viên nào được phân công những môn trong subjectIds
    const query =
      subjectObjectIds.length === 0
        ? {} // Không truyền/không có id hợp lệ -> trả về tất cả lớp
        : {
          $nor: [
            {
              teachers: {
                $elemMatch: {
                  subjects: { $elemMatch: { $in: subjectObjectIds } },
                },
              },
            },
          ],
        };

    const classes = await Class.find(query)
      .select("_id className schoolYear")
      .sort({ createdAt: -1 });

    return {
      message: "Lấy danh sách lớp thành công",
      total: classes.length,
      data: classes,
    };
  } catch (error) {
    throw new Error(
      "Lỗi khi lấy danh sách lớp chưa được phân công môn học: " + error.message
    );
  }
};

const getAllIdClasses = async () => {
  try {
    const classes = await Class.find().select("_id className schoolYear").sort({ className: 1 })

    return classes
  } catch (error) {
    throw new Error("Lỗi khi lấy danh sách ID lớp: " + error.message);
  }
};

const arrangeStudentsByClassService = async (students, classId) => {
  try {
    if (!classId) throw new Error("Thiếu classId");
    if (!students || !Array.isArray(students) || students.length === 0) {
      throw new Error("Danh sách học sinh không hợp lệ");
    }


    const classData = await Class.findById(classId);
    if (!classData) throw new Error("Không tìm thấy lớp");

    const studentIds = students.map(id => id.toString());
    const existingStudents = await Student.find({ _id: { $in: studentIds } });

    if (existingStudents.length !== studentIds.length) {
      throw new Error("Một số học sinh không tồn tại trong hệ thống");
    }


    const studentsWithClass = existingStudents.filter(s => s.currentClass);
    if (studentsWithClass.length > 0) {
      const names = studentsWithClass.map(s => s.fullName).join(", ");
      throw new Error(`Học sinh sau đã có lớp: ${names}`);
    }


    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $set: { currentClass: classId } }
    );

    await Class.findByIdAndUpdate(
      classId,
      { $addToSet: { students: { $each: studentIds } } }
    );


    const updatedClass = await Class.findById(classId)
      .populate("students", "fullName studentCode gender dob")
      .populate("homeroomTeacher", "fullName teacherCode")
      .populate("grade", "gradeName");

    return {
      message: "Sắp xếp học sinh vào lớp thành công",
      class: updatedClass,
      addedStudents: studentIds.length
    };
  } catch (error) {
    throw new Error("Lỗi khi sắp xếp học sinh vào lớp: " + error.message);
  }
};

const transferStudentToClass = async (studentId, newClassId) => {
  try {
    // Validate input
    if (!studentId) throw new Error("Thiếu studentId");
    if (!newClassId) throw new Error("Thiếu newClassId");

    // Kiểm tra học sinh có tồn tại không
    const student = await Student.findById(studentId).populate("currentClass", "className");
    if (!student) throw new Error("Không tìm thấy học sinh");

    // Kiểm tra lớp mới có tồn tại không
    const newClass = await Class.findById(newClassId);
    if (!newClass) throw new Error("Không tìm thấy lớp mới");

    // Kiểm tra học sinh đã ở lớp mới chưa
    if (student.currentClass && student.currentClass._id.toString() === newClassId.toString()) {
      throw new Error("Học sinh đã ở trong lớp này rồi");
    }

    const oldClassId = student.currentClass ? student.currentClass._id : null;

    // Xóa học sinh khỏi lớp cũ (nếu có)
    if (oldClassId) {
      await Class.findByIdAndUpdate(
        oldClassId,
        { $pull: { students: studentId } }
      );
    }

    // Thêm học sinh vào lớp mới
    await Class.findByIdAndUpdate(
      newClassId,
      { $addToSet: { students: studentId } }
    );

    // Cập nhật currentClass của học sinh
    student.currentClass = newClassId;
    await student.save();

    // Lấy thông tin đầy đủ để trả về
    const updatedStudent = await Student.findById(studentId)
      .populate("currentClass", "className schoolYear grade");

    return {
      message: "Chuyển lớp thành công",
      student: updatedStudent,
      oldClass: oldClassId ? (await Class.findById(oldClassId).select("className")) : null,
      newClass: await Class.findById(newClassId).select("className")
    };
  } catch (error) {
    throw new Error("Lỗi khi chuyển lớp: " + error.message);
  }
};


const getOneClassSelectScoreTypesService = async (classId) => {

  try {

    const classInfo = await Class.findById(classId).populate({
      path: "selectedScoreTypes.scoreTypeId",
      model: "ScoreType"
    });
    if (!classInfo) {
      throw new Error("Lớp học không tồn tại");
    }
    return classInfo.selectedScoreTypes;
  } catch (error) {
    throw error;
  }

}

const getStudentsWithScoresBySubject = async (classId, subjectId) => {
  const Subject = require("../models/Subject.model");
  const ScoreType = require("../models/ScoreSetting.model");

  try {
    // Kiểm tra lớp có tồn tại không
    const classInfo = await Class.findById(classId)
      .populate({
        path: "students",
        model: "Student",
        select: "studentCode fullName gender dob scores"
      })
      .populate({
        path: "teachers",
        populate: [
          {
            path: "teacher",
            select: "fullName teacherCode"
          },
          {
            path: "subjects",
            select: "subjectName subjectCode"
          }
        ]
      });

    if (!classInfo) {
      throw new Error("Lớp học không tồn tại");
    }

    // Kiểm tra môn học có tồn tại không
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw new Error("Môn học không tồn tại");
    }

    // Kiểm tra môn học có được dạy trong lớp này không
    const isSubjectTaught = classInfo.teachers.some(teacherObj =>
      teacherObj.subjects && teacherObj.subjects.some(s => s._id.equals(subjectId))
    );

    if (!isSubjectTaught) {
      throw new Error(`Môn học "${subject.subjectName}" không được dạy trong lớp này`);
    }

    // Lấy tất cả các loại điểm active
    const activeScoreTypes = await ScoreType.find({ status: "active" }).sort({ defaultCoefficient: 1 });

    // Xử lý danh sách học sinh và điểm
    const studentsWithScores = classInfo.students.map(student => {
      // Lọc điểm của môn học này
      const subjectScores = student.scores.filter(score =>
        score.subjectId.equals(subjectId)
      );

      // Trả về TẤT CẢ các cột điểm (kể cả trùng loại)
      const allScores = subjectScores.map(scoreRecord => {
        // Tìm thông tin scoreType
        const scoreType = activeScoreTypes.find(st => st._id.equals(scoreRecord.scoreTypeId));

        return {
          scoreId: scoreRecord._id, // ID duy nhất của cột điểm
          subjectId: scoreRecord.subjectId,
          scoreTypeId: scoreRecord.scoreTypeId,
          scoreTypeName: scoreType ? scoreType.name : "Unknown",
          scoreTypeDisplayName: scoreType ? scoreType.displayName : "Unknown",
          coefficient: scoreType ? scoreType.defaultCoefficient : 1,
          semester: scoreType ? scoreType.semester : "Unknown",
          score: scoreRecord.score
        };
      });

      return {
        studentId: student._id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        gender: student.gender,
        dob: student.dob,
        scores: allScores // Trả về tất cả các cột điểm
      };
    });

    return {
      className: classInfo.className,
      schoolYear: classInfo.schoolYear,
      subject: {
        subjectId: subject._id,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode
      },
      scoreTypes: activeScoreTypes.map(st => ({
        scoreTypeId: st._id,
        name: st.name,
        displayName: st.displayName,
        coefficient: st.defaultCoefficient,
        semester: st.semester
      })),
      students: studentsWithScores,
      totalStudents: studentsWithScores.length
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createClass,
  getAllClasses,
  getOneClass,
  deleteClass,
  getNumberClass,
  editClass,
  countStudentsInClass,
  assignHomeroomTeacher,
  removeHomeroomTeacher,
  getClassesWithoutHomeroomTeacher,
  getClassesWithHomeroomTeacher,
  getAllIdClasses,
  getListClassesNotSubjectAssignment,
  arrangeStudentsByClassService,
  transferStudentToClass,
  getOneClassSelectScoreTypesService,
  getStudentsWithScoresBySubject,
  getClassByHomeroomTeacher,
  getStudentsWithScoresAndConducts
  , calculateSemesterResults
};
