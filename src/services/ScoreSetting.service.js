
const ScoreModel = require("../models/ScoreSetting.model");

const createScoreType = async ({ name, displayName, defaultCoefficient, semester }) => {
    try {


        if (!name || !displayName || !defaultCoefficient || !semester) {
            throw new Error("Thiếu thông tin bắt buộc: tên loại điểm, tên hiển thị, hệ số mặc định, học kỳ");
        }


        const existingScoreType = await ScoreModel.findOne({
            name,
            semester
        });

        if (existingScoreType) {
            throw new Error("Loại điểm này đã có trong học kì");
        }

        const newScoreType = new ScoreModel({
            name,
            displayName,
            defaultCoefficient,
            semester,
        });
        await newScoreType.save();
        return newScoreType;
    } catch (error) {
        throw error;
    }
};



const getAllScoreTypeService = async ({ limit = 10000, offset = 0 }) => {
    try {
        const scoreTypes = await ScoreModel.find()
            .skip(offset)
            .limit(limit)
            .sort({ defaultCoefficient: 1 });
        const total = await ScoreModel.countDocuments();
        return { total, data: scoreTypes };
    } catch (error) {
        throw error;
    }
};

const editScoreType = async ({ id, name, displayName, defaultCoefficient, semester, status }) => {
    try {
        if (!id) {
            throw new Error("Thiếu ID loại điểm");
        }

        const scoreType = await ScoreModel.findById(id);
        if (!scoreType) {
            throw new Error("Loại điểm không tồn tại");
        }

        if (name && semester && (name !== scoreType.name || semester !== scoreType.semester)) {
            const existingScoreType = await ScoreModel.findOne({
                _id: { $ne: id },
                name: name,
                semester: semester
            });

            if (existingScoreType) {
                throw new Error("Loại điểm này đã có trong học kì");
            }
        }

        scoreType.name = name || scoreType.name;
        scoreType.displayName = displayName || scoreType.displayName;
        scoreType.defaultCoefficient = defaultCoefficient || scoreType.defaultCoefficient;
        scoreType.semester = semester || scoreType.semester;
        scoreType.status = status || scoreType.status;

        await scoreType.save();
        return scoreType;
    } catch (error) {
        throw error;
    }
};

const syncScoreTypesService = async (classId, subjectId) => {
    const ClassModel = require("../models/Class.model");
    const StudentModel = require("../models/Student.model");
    const SubjectModel = require("../models/Subject.model");

    try {
        // Kiểm tra môn học có tồn tại không
        const subject = await SubjectModel.findById(subjectId);
        if (!subject) {
            throw new Error("Môn học không tồn tại");
        }

        // Kiểm tra lớp có tồn tại không
        const classInfo = await ClassModel.findById(classId).populate({
            path: "teachers.teacher",
            model: "Teacher"
        }).populate({
            path: "teachers.subjects",
            model: "Subject"
        }).populate({
            path: "students",
            model: "Student"
        });

        if (!classInfo) {
            throw new Error("Lớp học không tồn tại");
        }

        // Lấy danh sách học sinh trong lớp
        const students = classInfo.students;
        if (!students || students.length === 0) {
            throw new Error("Lớp học chưa có học sinh nào");
        }

        // Kiểm tra môn học có được dạy trong lớp này không
        const isSubjectTaught = classInfo.teachers.some(teacherObj =>
            teacherObj.subjects && teacherObj.subjects.some(s => s._id.equals(subjectId))
        );

        if (!isSubjectTaught) {
            throw new Error(`Môn học "${subject.subjectName}" không được dạy trong lớp này`);
        }

        // Lấy tất cả các loại điểm đang active
        const activeScoreTypes = await ScoreModel.find({ status: "active" });
        if (!activeScoreTypes || activeScoreTypes.length === 0) {
            throw new Error("Chưa có loại điểm nào được kích hoạt trong hệ thống");
        }

        let totalScoresAdded = 0;
        let studentsUpdated = 0;

        // Đồng bộ điểm cho từng học sinh
        for (const student of students) {
            let studentScoresAdded = 0;
            const currentScores = student.scores || [];

            // Tạo điểm cho môn học cụ thể và mỗi loại điểm
            for (const scoreType of activeScoreTypes) {
                // Kiểm tra xem điểm này đã tồn tại chưa
                const existingScore = currentScores.find(
                    s => s.subjectId.equals(subjectId) && s.scoreTypeId.equals(scoreType._id)
                );

                // Chỉ thêm nếu chưa tồn tại
                if (!existingScore) {
                    currentScores.push({
                        subjectId: subjectId,
                        scoreTypeId: scoreType._id,
                        score: null // Để trống cho giáo viên nhập
                    });
                    studentScoresAdded++;
                }
            }

            // Cập nhật student nếu có điểm mới được thêm
            if (studentScoresAdded > 0) {
                await StudentModel.findByIdAndUpdate(student._id, {
                    scores: currentScores
                });
                studentsUpdated++;
                totalScoresAdded += studentScoresAdded;
            }
        }

        return {
            message: "Đồng bộ điểm thành công",
            subjectName: subject.subjectName,
            studentsCount: students.length,
            studentsUpdated: studentsUpdated,
            scoreTypesCount: activeScoreTypes.length,
            totalScoresAdded: totalScoresAdded
        };
    } catch (error) {
        throw error;
    }
};





module.exports = {
    createScoreType,
    getAllScoreTypeService,
    editScoreType,
    syncScoreTypesService,

}