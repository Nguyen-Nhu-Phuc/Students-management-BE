const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const Subject = require("../models/Subject.model");
const User = require("../models/Users.model");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const bcrypt = require("bcryptjs");

const getAllStudent = async ({
  limit,
  offset,
  search,
  classId,
  schoolYear,
}) => {
  const queryLimit = parseInt(limit) || 10;
  const queryOffset = parseInt(offset) || 0;

  const filter = {};

  // 🔍 Tìm theo tên hoặc mã học sinh
  if (search?.trim()) {
    const keyword = new RegExp(search.trim(), "i");
    filter.$or = [{ studentCode: keyword }, { fullName: keyword }];
  }

  // 🏫 Lọc theo lớp
  if (classId) {
    filter.currentClass = classId;
  }

  // 📘 Lọc theo năm học (lọc bên trong populate)
  const classMatch = schoolYear ? { schoolYear } : undefined;

  // 📋 Lấy danh sách học sinh
  const isClassQuery = Boolean(classId);
  let studentQuery = Student.find(Object.keys(filter).length ? filter : {})
    .skip(queryOffset)
    .limit(queryLimit)
    .populate({
      path: "currentClass",
      match: classMatch, // chỉ thêm khi có schoolYear
      select: ["timetable", "className", "schoolYear"],
    });

  // Khi lọc theo lớp (nhập điểm/hạnh kiểm), không cần tải toàn bộ scores/history
  if (!isClassQuery) {
    studentQuery = studentQuery.populate("studyHistory").populate("scores");
  }

  const students = await studentQuery
    .populate({
      path: "conducts.conduct",
      select: "name displayName semester status",
    })
    .lean();

  // ⚙️ Nếu có filter theo năm học → loại bỏ học sinh không khớp
  const filteredStudents = schoolYear
    ? students.filter((stu) => stu.currentClass)
    : students;

  const total = filteredStudents.length;

  return { total, students: filteredStudents };
};

const getOneStudent = async ({ id }) => {
  if (!id) {
    throw new Error("ID học sinh không hợp lệ!");
  }

  try {
    const student = await Student.findById(id)
      .populate({
        path: "currentClass",
        populate: {
          path: "timetable.subjectId",
          select: "subjectName subjectCode",
        },
      })
      .populate({
        path: "currentClass",
        populate: {
          path: "timetable.teacherId",
          select: "fullName teacherCode",
        },
      })
      .populate("studyHistory")
      .populate({ path: "scores.subjectId", select: "subjectName subjectCode" })
      .populate({
        path: "scores.scoreTypeId",
        select: "name displayName defaultCoefficient semester",
      })
      .populate({
        path: "conducts.conduct",
        select: "name displayName semester status",
      })
      .lean();

    if (!student) {
      throw new Error("Không tìm thấy thông tin học sinh!");
    }

    return student;
  } catch (err) {
    console.error("Lỗi khi lấy học sinh:", err.message);
    throw new Error("Không lấy được thông tin học sinh!");
  }
};

const moveUpToGradeService = async ({ arrayStudent, newClass }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!Array.isArray(arrayStudent) || arrayStudent.length === 0) {
      throw new Error("Danh sách học sinh không hợp lệ!");
    }

    const targetClass = await Class.findById(newClass).session(session);
    if (!targetClass) {
      throw new Error("Không tìm thấy lớp học mới!");
    }

    const data = [];

    for (const item of arrayStudent) {
      const studentId = item?.id || item;
      const student = await Student.findById(studentId).session(session);
      if (!student) {
        throw new Error(`Không tìm thấy học sinh ${studentId}`);
      }

      const oldClassId = student.currentClass;

      if (!Array.isArray(student.studyHistory)) {
        student.studyHistory = [];
      }
      if (oldClassId) {
        student.studyHistory.push(oldClassId);
      }

      student.currentClass = newClass;
      await student.save({ session });

      if (oldClassId) {
        await Class.findByIdAndUpdate(
          oldClassId,
          { $pull: { students: student._id } },
          { session }
        );
      }

      await Class.findByIdAndUpdate(
        newClass,
        { $addToSet: { students: student._id } },
        { session }
      );

      data.push(student);
    }

    await session.commitTransaction();
    session.endSession();
    return data;
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    session.endSession();
    throw err;
  }
};

const editStudent = async (studentId, updateData) => {
  try {
    if (!studentId) throw new Error("Thiếu studentId");
    if (!updateData || Object.keys(updateData).length === 0)
      throw new Error("Không có dữ liệu cập nhật");

    const student = await Student.findById(studentId);
    if (!student) throw new Error("Không tìm thấy học sinh");

    // Validate conducts in payload: không được trùng học kỳ
    if (Array.isArray(updateData.conducts) && updateData.conducts.length > 0) {
      const conductIds = updateData.conducts.map((c) =>
        c && c.conduct ? c.conduct.toString() : c.toString()
      );
      const ConductSetting = require("../models/ConductSetting");
      const conductDocs = await ConductSetting.find({
        _id: { $in: conductIds },
      });
      if (conductDocs.length !== conductIds.length) {
        throw new Error("Một hoặc nhiều conductId không hợp lệ");
      }

      const semesters = conductDocs.map((d) => d.semester);
      const duplicateSemester = semesters.find(
        (s, idx) => semesters.indexOf(s) !== idx
      );
      if (duplicateSemester) {
        throw new Error(
          "Payload có nhiều conduct cùng học kỳ, vui lòng chỉ giữ 1 conduct cho mỗi học kỳ"
        );
      }
    }

    if (updateData.currentClass) {
      const newClass = await Class.findById(updateData.currentClass);
      if (!newClass) throw new Error("Không tìm thấy lớp mới");

      const oldClass = await Class.findById(student.currentClass);
      if (oldClass && oldClass.students) {
        oldClass.students = oldClass.students.filter(
          (id) => id.toString() !== studentId.toString()
        );
        await oldClass.save();
      }

      if (!newClass.students.includes(studentId)) {
        newClass.students.push(studentId);
        await newClass.save();
      }
    }

    for (const key in updateData) {
      if (
        updateData[key] !== undefined &&
        updateData[key] !== null &&
        updateData[key] !== ""
      ) {
        student[key] = updateData[key];
      }
    }

    const updatedStudent = await student.save();

    if (Array.isArray(updateData.scores) && updateData.scores.length > 0) {
      for (const score of updateData.scores) {
        if (score.subjectId) {
          const subject = await Subject.findById(score.subjectId);
          if (!subject)
            throw new Error(`Không tìm thấy môn học ${score.subjectId}`);
        }
      }
    }

    return updatedStudent;
  } catch (error) {
    console.error("Lỗi trong editStudent service:", error);
    throw error;
  }
};

const getNumberStudent = async () => {
  try {
    const count = await Student.countDocuments();
    return count;
  } catch (error) {
    throw new Error("Không thể lấy số lượng học sinh");
  }
};

const getStudentAllNotInClass = async ({ search, admissionYear }) => {
  try {
    const filter = { currentClass: null, active: "active" };

    if (search?.trim()) {
      const keyword = new RegExp(search.trim(), "i");
      filter.$or = [{ studentCode: keyword }, { fullName: keyword }];
    }

    if (admissionYear) {
      filter.admissionYear = admissionYear;
    }

    const students = await Student.find(filter)
      .select("_id fullName studentCode admissionYear gender dob")
      .lean();
    const total = students.length;

    return { total, students };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách học sinh không có lớp:", error);
    throw new Error("Không thể lấy danh sách học sinh không có lớp");
  }
};

const removeStudentFromClass = async (studentId) => {
  try {
    // Validate input
    if (!studentId) throw new Error("Thiếu studentId");

    // Tìm học sinh
    const student = await Student.findById(studentId).populate(
      "currentClass",
      "className"
    );
    if (!student) throw new Error("Không tìm thấy học sinh");

    // Kiểm tra học sinh có lớp không
    if (!student.currentClass) {
      throw new Error("Học sinh không thuộc lớp nào");
    }

    const oldClassId = student.currentClass._id;
    const oldClassName = student.currentClass.className;

    // Xóa học sinh khỏi mảng students của lớp
    await Class.findByIdAndUpdate(oldClassId, {
      $pull: { students: studentId },
    });

    // Cập nhật student: xóa currentClass và đặt active = "inactive"
    student.currentClass = null;
    student.active = "inactive";
    await student.save();

    return {
      message: "Xóa học sinh khỏi lớp và đánh dấu inactive thành công",
      student: {
        _id: student._id,
        fullName: student.fullName,
        studentCode: student.studentCode,
        active: student.active,
        currentClass: student.currentClass,
      },
      removedFromClass: {
        _id: oldClassId,
        className: oldClassName,
      },
    };
  } catch (error) {
    throw new Error("Lỗi khi xóa học sinh khỏi lớp: " + error.message);
  }
};

// Export Excel template
const exportStudentTemplate = async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Students Template");

    // Define columns - chỉ các trường cơ bản khi đăng ký
    worksheet.columns = [
      { header: "Tên đăng nhập (*)", key: "username", width: 20 },
      { header: "Mật khẩu (*)", key: "password", width: 15 },
      { header: "Mã học sinh (*)", key: "studentCode", width: 15 },
      { header: "Họ và tên (*)", key: "fullName", width: 25 },
      { header: "Ngày sinh (dd/mm/yyyy)", key: "dob", width: 18 },
      { header: "Giới tính (Nam/Nữ) (*)", key: "gender", width: 20 },
      { header: "Địa chỉ", key: "address", width: 35 },
      { header: "Số điện thoại", key: "phone", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Năm nhập học", key: "admissionYear", width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;

    // Add sample data row
    worksheet.addRow({
      username: "HS001",
      password: "123456",
      studentCode: "HS001",
      fullName: "Nguyễn Văn A",
      dob: "01/01/2010",
      gender: "Nam",
      address: "123 Đường ABC, Quận 1, TP.HCM",
      phone: "0123456789",
      email: "nguyenvana@example.com",
      admissionYear: 2024,
    });

    // Add instructions
    worksheet.addRow({});
    const instructionRow = worksheet.addRow({
      username: "Lưu ý:",
    });
    instructionRow.font = { bold: true, color: { argb: "FFFF0000" } };

    worksheet.addRow({
      username: "- Các cột có dấu (*) là bắt buộc",
    });
    worksheet.addRow({
      username: "- Tên đăng nhập và mã học sinh có thể giống nhau",
    });
    worksheet.addRow({
      username: "- Tên đăng nhập phải duy nhất trong hệ thống",
    });
    worksheet.addRow({
      username: "- Giới tính chỉ nhập: Nam hoặc Nữ",
    });
    worksheet.addRow({
      username: "- Ngày sinh theo định dạng: dd/mm/yyyy (ví dụ: 01/01/2010)",
    });
    worksheet.addRow({
      username: "- Mã học sinh phải là duy nhất",
    });
    worksheet.addRow({
      username:
        "- XÓA dòng mẫu (dòng 2) và các dòng hướng dẫn này trước khi import",
    });

    return workbook;
  } catch (error) {
    console.error("Lỗi khi tạo template Excel:", error);
    throw new Error("Không thể tạo template Excel");
  }
};

// Import students from Excel
const importStudentsFromExcel = async (filePath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet("Students Template");
    if (!worksheet) {
      throw new Error(
        "Không tìm thấy sheet 'Students Template' trong file Excel"
      );
    }

    const students = [];
    const errors = [];

    // Lấy tất cả rows (bỏ qua header row)
    const rows = worksheet.getRows(2, worksheet.rowCount) || [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      // Skip empty rows
      if (!row.values || row.values.length <= 1) {
        continue;
      }

      // Skip instruction rows
      const firstCell = row.getCell(1).value;
      if (
        !firstCell ||
        firstCell.toString().includes("Lưu ý") ||
        firstCell.toString().includes("-") ||
        firstCell.toString().toLowerCase().includes("ví dụ")
      ) {
        continue;
      }
      try {
        const username = row.getCell(1).value?.toString().trim();
        const password = row.getCell(2).value?.toString().trim();
        const studentCode = row.getCell(3).value?.toString().trim();
        const fullName = row.getCell(4).value?.toString().trim();
        const dobValue = row.getCell(5).value;
        const gender = row.getCell(6).value?.toString().trim();
        const address = row.getCell(7).value?.toString().trim() || "";
        const phone = row.getCell(8).value?.toString().trim() || "";
        const email = row.getCell(9).value?.toString().trim() || "";
        const admissionYearValue = row.getCell(10).value;

        // Validate required fields
        if (!username) {
          errors.push(`Dòng ${rowNumber}: Thiếu tên đăng nhập`);
          continue;
        }
        if (!password) {
          errors.push(`Dòng ${rowNumber}: Thiếu mật khẩu`);
          continue;
        }
        if (!studentCode) {
          errors.push(`Dòng ${rowNumber}: Thiếu mã học sinh`);
          continue;
        }
        if (!fullName) {
          errors.push(`Dòng ${rowNumber}: Thiếu họ và tên`);
          continue;
        }
        if (!gender || !["Nam", "Nữ"].includes(gender)) {
          errors.push(`Dòng ${rowNumber}: Giới tính phải là 'Nam' hoặc 'Nữ'`);
          continue;
        }

        // Parse date of birth
        let dob = null;
        if (dobValue) {
          if (dobValue instanceof Date) {
            dob = dobValue;
          } else {
            const dobString = dobValue.toString().trim();
            if (dobString.length > 0) {
              // Parse dd/mm/yyyy format
              const dobParts = dobString.split("/");
              if (dobParts.length === 3) {
                const day = parseInt(dobParts[0]);
                const month = parseInt(dobParts[1]) - 1;
                const year = parseInt(dobParts[2]);
                dob = new Date(year, month, day);

                if (isNaN(dob.getTime())) {
                  errors.push(
                    `Dòng ${rowNumber}: Ngày sinh không hợp lệ (format: dd/mm/yyyy)`
                  );
                  continue;
                }
              }
            }
          }
        }

        // Parse admission year
        let admissionYear = null;
        if (admissionYearValue) {
          admissionYear = parseInt(admissionYearValue);
          if (isNaN(admissionYear)) {
            admissionYear = null;
          }
        }

        // Build student object
        const studentData = {
          username,
          password,
          studentCode,
          fullName,
          dob: dob || undefined,
          gender,
          address: address || undefined,
          phone: phone || undefined,
          email: email || undefined,
          admissionYear: admissionYear || undefined,
          active: "active",
        };

        students.push(studentData);
      } catch (err) {
        errors.push(`Dòng ${rowNumber}: ${err.message}`);
      }
    }
    // Nếu không có học sinh nào được parse
    if (students.length === 0 && errors.length === 0) {
      return {
        success: false,
        errors: [
          "Không tìm thấy dữ liệu học sinh hợp lệ trong file Excel. Vui lòng kiểm tra lại file.",
        ],
        imported: 0,
      };
    }

    if (errors.length > 0) {
      return { success: false, errors, imported: 0 };
    }

    // Check for duplicate usernames in the file
    const usernames = students.map((s) => s.username);
    const duplicateUsernames = usernames.filter(
      (username, index) => usernames.indexOf(username) !== index
    );
    if (duplicateUsernames.length > 0) {
      return {
        success: false,
        errors: [
          `Tên đăng nhập bị trùng trong file: ${duplicateUsernames.join(", ")}`,
        ],
        imported: 0,
      };
    }

    // Check for duplicate student codes in the file
    const studentCodes = students.map((s) => s.studentCode);
    const duplicates = studentCodes.filter(
      (code, index) => studentCodes.indexOf(code) !== index
    );
    if (duplicates.length > 0) {
      return {
        success: false,
        errors: [`Mã học sinh bị trùng trong file: ${duplicates.join(", ")}`],
        imported: 0,
      };
    }

    // Check for existing usernames in database
    const existingUsers = await User.find({
      username: { $in: usernames },
    }).select("username");

    if (existingUsers.length > 0) {
      const existingUsernames = existingUsers.map((u) => u.username);
      return {
        success: false,
        errors: [
          `Tên đăng nhập đã tồn tại trong hệ thống: ${existingUsernames.join(
            ", "
          )}`,
        ],
        imported: 0,
      };
    }

    // Check for existing student codes in database
    const existingStudents = await Student.find({
      studentCode: { $in: studentCodes },
    }).select("studentCode");

    if (existingStudents.length > 0) {
      const existingCodes = existingStudents.map((s) => s.studentCode);

      return {
        success: false,
        errors: [
          `Mã học sinh đã tồn tại trong hệ thống: ${existingCodes.join(", ")}`,
        ],
        imported: 0,
      };
    }

    // Use transaction to ensure data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create students and users
      const insertedStudents = [];
      const insertedUsers = [];

      for (const studentData of students) {
        // Hash password
        const hashedPassword = await bcrypt.hash(studentData.password, 10);

        // Create student profile (without username and password)
        const { username, password, ...profileData } = studentData;
        const student = await Student.create([profileData], { session });

        // Create user account
        const user = await User.create(
          [
            {
              username: studentData.username,
              password: hashedPassword,
              role: "student",
              roleRef: "Student",
              linkedId: student[0]._id,
            },
          ],
          { session }
        );

        insertedStudents.push(student[0]);
        insertedUsers.push(user[0]);
      }

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        imported: insertedStudents.length,
        students: insertedStudents,
        errors: [],
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      throw error;
    }
  } catch (error) {
    console.error("❌ Lỗi khi import học sinh từ Excel:", error);
    throw new Error("Không thể import học sinh từ Excel: " + error.message);
  }
};

// Nhập điểm cho học sinh bằng scoreId
const inputScoreForStudent = async (studentId, scoreId, score) => {
  try {
    if (!studentId || !scoreId) {
      throw new Error("Thiếu thông tin bắt buộc: studentId, scoreId");
    }

    if (score !== null && score !== undefined) {
      const numScore = parseFloat(score);
      if (isNaN(numScore) || numScore < 0 || numScore > 10) {
        throw new Error("Điểm phải là số từ 0 đến 10");
      }
    }

    const student = await Student.findById(studentId);
    if (!student) {
      throw new Error("Không tìm thấy học sinh");
    }

    // Tìm điểm theo scoreId (là _id của object trong mảng scores)
    const scoreRecord = student.scores.id(scoreId);
    if (!scoreRecord) {
      throw new Error("Không tìm thấy cột điểm");
    }

    // Cập nhật điểm
    scoreRecord.score = score;
    await student.save();

    return {
      message: "Nhập điểm thành công",
      student: await Student.findById(studentId)
        .populate("scores.subjectId", "subjectName")
        .populate("scores.scoreTypeId", "name displayName"),
    };
  } catch (error) {
    throw error;
  }
};

// Nhập điểm cho nhiều học sinh cùng lúc
const inputScoresForMultipleStudents = async (scores) => {
  try {
    if (!Array.isArray(scores) || scores.length === 0) {
      throw new Error("Danh sách điểm không hợp lệ");
    }

    const results = [];
    const errors = [];

    for (const scoreData of scores) {
      try {
        const { studentId, scoreId, score } = scoreData;
        const result = await inputScoreForStudent(studentId, scoreId, score);
        results.push({
          studentId,
          scoreId,
          success: true,
          message: "Nhập điểm thành công",
        });
      } catch (error) {
        errors.push({
          studentId: scoreData.studentId,
          scoreId: scoreData.scoreId,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      total: scores.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  } catch (error) {
    throw error;
  }
};

// Thêm cột điểm cho học sinh (thêm score entry mới)
const addScoreColumnForStudent = async (studentId, subjectId, scoreTypeId) => {
  try {
    if (!studentId || !subjectId || !scoreTypeId) {
      throw new Error(
        "Thiếu thông tin bắt buộc: studentId, subjectId, scoreTypeId"
      );
    }

    const student = await Student.findById(studentId);

    if (!student) {
      throw new Error("Không tìm thấy học sinh");
    }

    // Kiểm tra subject và scoreType có tồn tại
    const subject = await Subject.findById(subjectId);

    if (!subject) {
      throw new Error("Môn học không tồn tại");
    }

    const ScoreType = require("../models/ScoreSetting.model");
    const scoreType = await ScoreType.findById(scoreTypeId);

    if (!scoreType) {
      throw new Error("Loại điểm không tồn tại");
    }

    // Khởi tạo mảng scores nếu chưa có
    if (!student.scores) {
      student.scores = [];
    }

    // Thêm cột điểm mới (không kiểm tra trùng vì 1 học sinh có thể có nhiều cột điểm)
    student.scores.push({
      subjectId,
      scoreTypeId,
      score: null,
    });

    await student.save();

    const newScore = student.scores[student.scores.length - 1];

    const updatedStudent = await Student.findById(studentId)
      .populate("scores.subjectId", "subjectName")
      .populate("scores.scoreTypeId", "name displayName");

    return {
      message: "Thêm cột điểm thành công",
      scoreId: newScore._id.toString(),
      student: updatedStudent,
    };
  } catch (error) {
    console.error("Error in addScoreColumnForStudent:", error);
    throw error;
  }
};

// Xóa cột điểm của học sinh bằng scoreId
const removeScoreColumnForStudent = async (studentId, scoreId) => {
  try {
    if (!studentId || !scoreId) {
      throw new Error("Thiếu thông tin bắt buộc: studentId, scoreId");
    }

    const student = await Student.findById(studentId);
    if (!student) {
      throw new Error("Không tìm thấy học sinh");
    }

    // Tìm điểm theo scoreId
    const scoreRecord = student.scores.id(scoreId);
    if (!scoreRecord) {
      throw new Error("Không tìm thấy cột điểm cần xóa");
    }

    // Xóa điểm bằng phương thức remove của Mongoose subdocument
    scoreRecord.deleteOne();
    await student.save();

    return {
      message: "Xóa cột điểm thành công",
      student: await Student.findById(studentId)
        .populate("scores.subjectId", "subjectName")
        .populate("scores.scoreTypeId", "name displayName"),
    };
  } catch (error) {
    throw error;
  }
};

// Thêm cột điểm đồng loạt cho tất cả học sinh trong lớp
const addScoreColumnForAllStudentsInClass = async (
  classId,
  subjectId,
  scoreTypeId
) => {
  try {
    if (!classId || !subjectId || !scoreTypeId) {
      throw new Error(
        "Thiếu thông tin bắt buộc: classId, subjectId, scoreTypeId"
      );
    }

    // Kiểm tra lớp có tồn tại không
    const classInfo = await Class.findById(classId).populate("students");
    if (!classInfo) {
      throw new Error("Không tìm thấy lớp học");
    }

    if (!classInfo.students || classInfo.students.length === 0) {
      throw new Error("Lớp học chưa có học sinh nào");
    }

    // Kiểm tra subject có tồn tại không
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw new Error("Môn học không tồn tại");
    }

    // Kiểm tra scoreType có tồn tại không
    const ScoreType = require("../models/ScoreSetting.model");
    const scoreType = await ScoreType.findById(scoreTypeId);
    if (!scoreType) {
      throw new Error("Loại điểm không tồn tại");
    }

    // Thêm cột điểm cho từng học sinh
    const results = [];
    const errors = [];

    for (const student of classInfo.students) {
      try {
        // Khởi tạo mảng scores nếu chưa có
        if (!student.scores) {
          student.scores = [];
        }

        // Thêm cột điểm mới
        student.scores.push({
          subjectId,
          scoreTypeId,
          score: null,
        });

        await student.save();

        const newScore = student.scores[student.scores.length - 1];

        results.push({
          studentId: student._id.toString(),
          scoreId: newScore._id.toString(),
          studentCode: student.studentCode,
          fullName: student.fullName,
          success: true,
        });
      } catch (error) {
        console.error(
          `Error adding score column for student ${student._id}:`,
          error
        );
        errors.push({
          studentId: student._id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      message: `Thêm cột điểm thành công cho ${results.length}/${classInfo.students.length} học sinh`,
      className: classInfo.className,
      subject: {
        subjectId: subject._id,
        subjectName: subject.subjectName,
      },
      scoreType: {
        scoreTypeId: scoreType._id,
        displayName: scoreType.displayName,
        name: scoreType.name,
      },
      total: classInfo.students.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  } catch (error) {
    console.error("Error in addScoreColumnForAllStudentsInClass:", error);
    throw error;
  }
};

// Thêm conduct cho học sinh
const addConductForStudent = async (studentId, conductId) => {
  try {
    if (!studentId || !conductId) {
      throw new Error("Thiếu thông tin bắt buộc: học sinh, loại hạnh kiểm");
    }

    const ConductSetting = require("../models/ConductSetting");

    const conductSetting = await ConductSetting.findById(conductId);
    if (!conductSetting) {
      throw new Error("Không tìm thấy conduct setting");
    }

    const student = await Student.findById(studentId).populate(
      "conducts.conduct"
    );
    if (!student) {
      throw new Error("Không tìm thấy học sinh");
    }

    // Kiểm tra học sinh đã có conduct cho cùng semester chưa
    const existing = (student.conducts || []).find(
      (c) => c.conduct && c.conduct.semester === conductSetting.semester
    );
    if (existing) {
      existing.conduct = conductId;
      await student.save();

      const updated = await Student.findById(studentId).populate(
        "conducts.conduct"
      );
      return {
        message: "Cập nhật hạnh kiểm cho học sinh thành công",
        student: updated,
      };
    }

    // Thêm conduct mới (nếu chưa có cho học kỳ này)
    if (!student.conducts) student.conducts = [];
    student.conducts.push({ conduct: conductId });
    await student.save();

    const updated = await Student.findById(studentId).populate(
      "conducts.conduct"
    );
    return {
      message: "Thêm hạnh kiểm cho học sinh thành công",
      student: updated,
    };
  } catch (error) {
    throw error;
  }
};

// Lấy điểm của học sinh đang đăng nhập
const getMyGrades = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.linkedId) {
    throw new Error("Không tìm thấy thông tin học sinh liên kết!");
  }

  const student = await Student.findById(user.linkedId)
    .populate({ path: "scores.subjectId", select: "subjectName subjectCode" })
    .populate({
      path: "scores.scoreTypeId",
      select: "name displayName defaultCoefficient semester",
    })
    .populate({ path: "results.subject", select: "subjectName subjectCode" })
    .populate({ path: "results.class", select: "className schoolYear" })
    .populate({ path: "summarys.class", select: "className schoolYear" })
    .lean();

  if (!student) {
    throw new Error("Không tìm thấy học sinh!");
  }

  return {
    scores: student.scores || [],
    results: student.results || [],
    summarys: student.summarys || [],
  };
};

// Lấy thời khóa biểu lớp của học sinh đang đăng nhập
const getMySchedule = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.linkedId) {
    throw new Error("Không tìm thấy thông tin học sinh liên kết!");
  }

  const student = await Student.findById(user.linkedId).lean();
  if (!student || !student.currentClass) {
    throw new Error("Học sinh chưa được xếp lớp!");
  }

  const Timetable = require("../models/TimeTable.model");
  const timetable = await Timetable.findOne({ classId: student.currentClass })
    .populate({
      path: "timetable.subjectId",
      select: "subjectName subjectCode",
    })
    .populate({ path: "timetable.teacherId", select: "fullName teacherCode" })
    .lean();

  return {
    timetable: timetable?.timetable || [],
  };
};

// Lấy thông tin lớp học hiện tại của học sinh đang đăng nhập
const getMyClass = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.linkedId) {
    throw new Error("Không tìm thấy thông tin học sinh liên kết!");
  }

  const student = await Student.findById(user.linkedId)
    .select("fullName studentCode currentClass")
    .lean();

  if (!student || !student.currentClass) {
    throw new Error("Học sinh chưa được xếp lớp!");
  }

  const classInfo = await Class.findById(student.currentClass)
    .populate({ path: "homeroomTeacher", select: "fullName teacherCode" })
    .select("className schoolYear homeroomTeacher")
    .lean();

  if (!classInfo) {
    throw new Error("Không tìm thấy lớp học!");
  }

  return {
    student: { fullName: student.fullName, studentCode: student.studentCode },
    className: classInfo.className,
    schoolYear: classInfo.schoolYear,
    homeroomTeacher: classInfo.homeroomTeacher,
  };
};

module.exports = {
  getOneStudent,
  getAllStudent,
  moveUpToGradeService,
  getOneStudent,
  editStudent,
  getNumberStudent,
  getStudentAllNotInClass,
  removeStudentFromClass,
  exportStudentTemplate,
  importStudentsFromExcel,
  inputScoreForStudent,
  inputScoresForMultipleStudents,
  addScoreColumnForStudent,
  removeScoreColumnForStudent,
  addScoreColumnForAllStudentsInClass,
  addConductForStudent,
  getMyGrades,
  getMySchedule,
  getMyClass,
};
