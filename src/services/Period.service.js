const Period = require("../models/Period.model");
const Grade = require("../models/Grade.model");
const Subject = require("../models/Subject.model");


const createPeriod = async ({ data }) => {
    try {
        const { lessonCount, subject, grade } = data || {};

        // ✅ Kiểm tra dữ liệu đầu vào
        if (!lessonCount || !subject || !grade) {
            throw new Error("Thiếu thông tin bắt buộc: lessonCount, subject, grade");
        }

        // ✅ Kiểm tra khối tồn tại
        const gradeDoc = await Grade.findById(grade);
        if (!gradeDoc) {
            throw new Error("Khối không tồn tại");
        }

        // ✅ Kiểm tra môn học tồn tại
        const subjectDoc = await Subject.findById(subject);
        if (!subjectDoc) {
            throw new Error("Môn học không tồn tại");
        }

        // ✅ Kiểm tra xem khối đã có môn học này chưa
        const existingPeriod = await Period.findOne({ grade, subject });
        if (existingPeriod) {
            throw new Error("Khối này đã có môn học này rồi");
        }

        // ✅ Tạo Period mới
        const newPeriod = new Period({
            lessonCount,
            subject,
            grade,
        });
        await newPeriod.save();

        // ✅ Liên kết Period vào Grade
        if (!gradeDoc.periods.includes(newPeriod._id)) {
            gradeDoc.periods.push(newPeriod._id);
            await gradeDoc.save();
        }

        // ✅ Liên kết Period vào Subject
        if (!subjectDoc.periods.includes(newPeriod._id)) {
            subjectDoc.periods.push(newPeriod._id);
            await subjectDoc.save();
        }

        return await newPeriod.populate(["subject", "grade"]);
    } catch (error) {
        throw error;
    }
};

const updatePeriod = async ({ id, data }) => {
    try {
        if (!id) throw new Error("Thiếu ID tiết học");
        const periodDoc = await Period.findById(id);
        if (!periodDoc) throw new Error("Tiết học không tồn tại");

        const oldSubjectId = periodDoc.subject?.toString();
        const oldGradeId = periodDoc.grade?.toString();

        // ✅ Nếu subject hoặc grade thay đổi → kiểm tra trùng lặp
        if (
            (data.subject && data.subject !== oldSubjectId) ||
            (data.grade && data.grade !== oldGradeId)
        ) {
            const newSubjectId = data.subject || oldSubjectId;
            const newGradeId = data.grade || oldGradeId;

            const duplicate = await Period.findOne({
                subject: newSubjectId,
                grade: newGradeId,
                _id: { $ne: id }, // loại trừ chính nó
            });

            if (duplicate) {
                throw new Error("Khối này đã có môn học này rồi");
            }
        }

        // ✅ Cập nhật thông tin chính
        const updatedPeriod = await Period.findByIdAndUpdate(id, data, { new: true });

        // ✅ Nếu grade thay đổi → cập nhật lại liên kết trong Grade
        if (data.grade && data.grade !== oldGradeId) {
            await Grade.updateOne({ _id: oldGradeId }, { $pull: { periods: id } });

            const newGrade = await Grade.findById(data.grade);
            if (!newGrade) throw new Error("Khối mới không tồn tại");
            await Grade.updateOne({ _id: newGrade._id }, { $addToSet: { periods: id } });
        }

        // ✅ Nếu subject thay đổi → cập nhật lại liên kết trong Subject
        if (data.subject && data.subject !== oldSubjectId) {
            await Subject.updateOne({ _id: oldSubjectId }, { $pull: { periods: id } });

            const newSubject = await Subject.findById(data.subject);
            if (!newSubject) throw new Error("Môn học mới không tồn tại");
            await Subject.updateOne({ _id: newSubject._id }, { $addToSet: { periods: id } });
        }

        return await updatedPeriod.populate(["subject", "grade"]);
    } catch (error) {
        throw error;
    }
};


const getAllPeriodService = async ({ limit, offset }) => {

    const queryLimit = parseInt(limit) || 10;
    const queryOffset = parseInt(offset) || 0;

    const data = await Period.find()
        .sort({ createdAt: -1 })
        .skip(queryOffset)
        .limit(queryLimit)
        .populate("subject", ["subjectName", "subjectCode"])
        .populate("grade", ["gradeName", "gradeCode"]);

    const total = await Period.countDocuments();

    return { total, data };
};

const getOnePeriodService = async ({ id }) => {
    const data = await Period.findById(id)
        .populate("subject", ["subjectName", "subjectCode"])
        .populate("grade", ["gradeName", "gradeCode"]);
    return data;
};


const deletePeriod = async ({ id }) => {
    try {
        if (!id) throw new Error("Thiếu ID tiết học");

        const periodDoc = await Period.findById(id);
        if (!periodDoc) throw new Error("Tiết học không tồn tại");

        const gradeId = periodDoc.grade?.toString();
        const subjectId = periodDoc.subject?.toString();

        // ✅ Xóa Period
        await Period.findByIdAndDelete(id);

        // ✅ Gỡ liên kết khỏi Grade và Subject
        if (gradeId) {
            await Grade.updateOne({ _id: gradeId }, { $pull: { periods: id } });
        }
        if (subjectId) {
            await Subject.updateOne({ _id: subjectId }, { $pull: { periods: id } });
        }

        return { message: "Xóa tiết học thành công" };
    } catch (error) {
        throw error;
    }
};

module.exports = { createPeriod, updatePeriod, getAllPeriodService, getOnePeriodService, deletePeriod };
