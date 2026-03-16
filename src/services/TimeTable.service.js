const Class = require("../models/Class.model");
const Teacher = require("../models/Teacher.model");
const Period = require("../models/Period.model");
const Timetable = require("../models/TimeTable.model");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_PERIODS_PER_DAY = 9;

/**
 * @param {string} classId - ID lớp học
 * @param {boolean} includeAfternoon - Có xếp tiết buổi chiều hay không
 */
const generateTimetableForClass = async (classId, includeAfternoon = true) => {
    const classData = await Class.findById(classId)
        .populate("grade")
        .populate({
            path: "teachers.teacher",
            select: "fullName timetable subjectSpecialty",
        })
        .populate("teachers.subjects", "subjectName subjectCode");

    if (!classData) throw new Error("Không tìm thấy lớp học");

    // Xác định số tiết tối đa theo buổi
    const MAX_LESSON = includeAfternoon ? MAX_PERIODS_PER_DAY : 5;

    // Lấy dữ liệu số tiết của khối
    const periods = await Period.find({ grade: classData.grade._id }).populate("subject");
    if (!periods.length) throw new Error("Không có dữ liệu số tiết cho khối này");

    let timetable = [];
    const teacherSchedule = {};

    // Xóa timetable cũ trong class và giáo viên
    classData.timetable = [];
    await classData.save();

    const allTeachers = await Teacher.find({});
    for (const t of allTeachers) {
        t.timetable = t.timetable.filter((x) => String(x.classId) !== String(classId));
        await t.save();
    }

    const isSlotAvailable = async (day, lesson, teacherId) => {
        // Kiểm tra xem lớp này đã có tiết nào ở vị trí này chưa
        if (timetable.find((t) => t.dayOfWeek === day && t.lesson === lesson)) return false;

        // Kiểm tra lịch tạm thời của giáo viên (trong phiên tạo TKB này)
        if (teacherSchedule[teacherId] && teacherSchedule[teacherId][day]?.includes(lesson)) return false;

        // 🔹 Kiểm tra xem giáo viên có bị trùng lịch với các lớp khác trong DB không
        const teacher = await Teacher.findById(teacherId);
        if (teacher && teacher.timetable) {
            const hasConflict = teacher.timetable.some(
                (t) => t.dayOfWeek === day && t.lesson === lesson
            );
            if (hasConflict) return false;
        }

        return true;
    };

    const markTeacherSlot = (teacherId, day, lessons) => {
        teacherSchedule[teacherId] = teacherSchedule[teacherId] || {};
        teacherSchedule[teacherId][day] = teacherSchedule[teacherId][day] || [];
        teacherSchedule[teacherId][day].push(...lessons);
    };

    const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

    // 🔹 Random thứ tự môn để xếp
    const shuffledPeriods = shuffleArray(periods);

    // 🔹 Hàm kiểm tra số tiết 1 môn trong 1 ngày
    const getSubjectCountInDay = (day, subjectId) => {
        return timetable.filter(
            (t) => t.dayOfWeek === day && String(t.subjectId) === String(subjectId)
        ).length;
    };

    for (const period of shuffledPeriods) {
        const subject = period.subject;
        const lessonCount = period.lessonCount;

        const teacherEntry = classData.teachers.find((t) =>
            t.subjects.some((s) => String(s._id || s) === String(subject._id))
        );

        if (!teacherEntry) {
            console.warn(`⚠️ Không có giáo viên cho môn ${subject.subjectName} ở lớp ${classData.className}`);
            continue;
        }

        const teacher = await Teacher.findById(teacherEntry.teacher._id);
        if (!teacher) continue;

        let assigned = 0;

        // 🔹 Chỉ cố gắng tạo 1 tiết đôi khi số tiết >= 3 (môn 2 tiết không bắt buộc xếp tiết đôi)
        if (lessonCount >= 3) {
            const day = DAYS[Math.floor(Math.random() * DAYS.length)];
            const lessons = shuffleArray([...Array(MAX_LESSON - 1).keys()].map((i) => i + 1));

            for (const lesson of lessons) {
                // ❌ Bỏ qua trường hợp 5–6 liền kề
                if (lesson === 5) continue;

                const slot1Available = await isSlotAvailable(day, lesson, teacher._id);
                const slot2Available = await isSlotAvailable(day, lesson + 1, teacher._id);

                if (
                    slot1Available &&
                    slot2Available &&
                    getSubjectCountInDay(day, subject._id) < 2
                ) {
                    timetable.push(
                        { dayOfWeek: day, lesson, subjectId: subject._id, teacherId: teacher._id },
                        { dayOfWeek: day, lesson: lesson + 1, subjectId: subject._id, teacherId: teacher._id }
                    );
                    markTeacherSlot(teacher._id, day, [lesson, lesson + 1]);
                    assigned += 2;
                    break;
                }
            }
        }

        // 🔹 Xếp các tiết đơn còn lại (random) với ràng buộc:
        //    - Nếu trong 1 ngày đã có 1 tiết môn này, tiết thứ 2 cùng ngày phải liền kề (không phải 5-6)
        //    - Thêm giới hạn số lần thử để tránh vòng lặp vô hạn khi không tìm được slot hợp lệ
        let attempts = 0;
        const MAX_ATTEMPTS = 3000; // guard to prevent infinite loop
        while (assigned < lessonCount) {
            attempts++;
            if (attempts > MAX_ATTEMPTS) {
                throw new Error(`Không thể xếp đủ tiết cho môn ${subject.subjectName} (yêu cầu ${lessonCount}) sau ${MAX_ATTEMPTS} lần thử — có thể do ràng buộc lịch quá chặt hoặc thiếu giáo viên/slot.`);
            }

            const day = DAYS[Math.floor(Math.random() * DAYS.length)];
            const lesson = Math.floor(Math.random() * MAX_LESSON) + 1;

            // ❌ Không cho tiết đơn nằm ở vị trí > 5 nếu không có buổi chiều
            if (!includeAfternoon && lesson > 5) continue;

            // ❌ Giới hạn 2 tiết/môn/ngày
            if (getSubjectCountInDay(day, subject._id) >= 2) continue;

            // Ràng buộc tiết đôi phải liền nhau nếu cùng ngày
            const existingSameDay = timetable
                .filter((t) => t.dayOfWeek === day && String(t.subjectId) === String(subject._id))
                .map((t) => t.lesson);

            if (existingSameDay.length === 1) {
                const prev = existingSameDay[0];
                const adjacent = Math.abs(prev - lesson) === 1 && Math.min(prev, lesson) !== 5;
                if (!adjacent) continue;
            }

            const slotAvailable = await isSlotAvailable(day, lesson, teacher._id);
            if (!slotAvailable) continue;

            timetable.push({ dayOfWeek: day, lesson, subjectId: subject._id, teacherId: teacher._id });
            markTeacherSlot(teacher._id, day, [lesson]);
            assigned++;
        }

        if (assigned < lessonCount) {
            console.warn(
                `⚠️ Không thể xếp đủ ${lessonCount} tiết cho môn ${subject.subjectName} (${assigned}/${lessonCount})`
            );
        }
    }

    // 🔹 Lưu hoặc cập nhật Timetable trong DB riêng trước
    const savedTimetable = await Timetable.findOneAndUpdate(
        { classId },
        {
            classId,
            gradeId: classData.grade._id,
            timetable,
        },
        { upsert: true, new: true }
    );

    // 🔹 Cập nhật timetable cho class với idTimetable
    classData.timetable = timetable.map(entry => ({
        idTimetable: savedTimetable._id,
        dayOfWeek: entry.dayOfWeek,
        lesson: entry.lesson,
        subjectId: entry.subjectId,
        teacherId: entry.teacherId,
    }));
    await classData.save();

    // 🔹 Ghi vào từng giáo viên
    for (const entry of timetable) {
        const teacher = await Teacher.findById(entry.teacherId);
        teacher.timetable.push({
            dayOfWeek: entry.dayOfWeek,
            lesson: entry.lesson,
            classId: classData._id,
            subjectId: entry.subjectId,
        });
        await teacher.save();
    }

    return {
        message: `Tạo thời khóa biểu cho lớp ${classData.className} thành công`,
        totalPeriods: timetable.length,
        data: timetable,
    };
};



const getAllTimetablesService = async (filters = {}) => {
    const { classId, gradeId, teacherId } = filters;

    // Tạo điều kiện tìm kiếm
    const query = {};
    if (classId) query.classId = classId;
    if (gradeId) query.gradeId = gradeId;
    if (teacherId) query["timetable.teacherId"] = teacherId;

    const timetables = await Timetable.find(query)
        .populate("classId", "className")
        .populate("gradeId", "gradeName")
        .populate("timetable.subjectId", "subjectName")
        .populate("timetable.teacherId", "fullName");

    return timetables;
};

const getOneTimeTableService = async (classId) => {
    if (!classId) throw new Error("Thiếu classId");

    const timetable = await Timetable.findOne({ classId })
        .populate("classId", "className schoolYear")
        .populate("gradeId", "gradeName gradeCode")
        .populate("timetable.subjectId", "subjectName subjectCode")
        .populate("timetable.teacherId", "fullName teacherCode");

    if (!timetable) throw new Error("Không tìm thấy thời khóa biểu cho lớp này");

    return timetable;
};


const updateSingleLessonService = async ({
    timetableId,
    lessonId,
    dayOfWeek,
    lesson,
    subjectId,
    teacherId,
}) => {
    if (!timetableId || !lessonId) throw new Error("Thiếu ID thời khóa biểu hoặc tiết học");

    // 🔹 1️⃣ Lấy thời khóa biểu
    const timetable = await Timetable.findById(timetableId);
    if (!timetable) throw new Error("Không tìm thấy thời khóa biểu");

    const { classId } = timetable;

    // 🔹 2️⃣ Lấy lớp
    const classData = await Class.findById(classId);
    if (!classData) throw new Error("Không tìm thấy lớp học");

    // 🔹 3️⃣ Lấy tiết cần sửa trong timetable
    const targetLesson = timetable.timetable.id(lessonId);
    if (!targetLesson) throw new Error("Không tìm thấy tiết học trong thời khóa biểu");

    // ⚠️ Lưu thông tin cũ NGAY LẬP TỨC trước khi update (quan trọng!)
    const oldTeacherId = targetLesson.teacherId;
    const oldSubjectId = targetLesson.subjectId;
    const oldDay = targetLesson.dayOfWeek;
    const oldLesson = targetLesson.lesson;

    // 🔹 4️⃣ Kiểm tra trùng tiết trong **cùng lớp** (logic mới thêm)
    const isDuplicateInSameClass = timetable.timetable.some(
        (item) =>
            String(item._id) !== String(lessonId) &&
            item.dayOfWeek === dayOfWeek &&
            item.lesson === lesson
    );

    if (isDuplicateInSameClass) {
        throw new Error(
            `❌ Lớp này đã có một môn học khác ở tiết ${lesson} (${dayOfWeek})`
        );
    }

    // 🔹 5️⃣ Kiểm tra trùng giáo viên giữa các lớp khác
    const conflict = await Timetable.findOne({
        _id: { $ne: timetableId },
        timetable: {
            $elemMatch: { teacherId, dayOfWeek, lesson },
        },
    }).populate("classId", "className");

    if (conflict) {
        throw new Error(
            `❌ Giáo viên đã dạy lớp ${conflict.classId.className} trong tiết ${lesson} (${dayOfWeek})`
        );
    }

    // 🔹 6️⃣ Cập nhật tiết trong Timetable
    targetLesson.dayOfWeek = dayOfWeek;
    targetLesson.lesson = lesson;
    targetLesson.subjectId = subjectId;
    targetLesson.teacherId = teacherId;
    await timetable.save();

    // 🔹 7️⃣ Cập nhật tiết trong Class
    // ❌ KHÔNG tìm bằng lessonId vì _id trong Class.timetable khác với _id trong Timetable.timetable
    // ✅ Tìm bằng idTimetable + dayOfWeek + lesson + subjectId cũ
    let classLesson = classData.timetable.find(
        (t) =>
            String(t.idTimetable) === String(timetableId) &&
            t.dayOfWeek === oldDay &&
            t.lesson === oldLesson &&
            String(t.subjectId) === String(oldSubjectId)
    );

    if (classLesson) {
        // Nếu có thì cập nhật
        classLesson.idTimetable = timetableId;
        classLesson.dayOfWeek = dayOfWeek;
        classLesson.lesson = lesson;
        classLesson.subjectId = subjectId;
        classLesson.teacherId = teacherId;
    } else {
        // Nếu không có thì thêm mới
        classData.timetable.push({
            idTimetable: timetableId,
            dayOfWeek,
            lesson,
            subjectId,
            teacherId,
        });
    }
    await classData.save();

    // 🔹 8️⃣ Xóa tiết cũ khỏi giáo viên cũ (nếu đổi giáo viên)
    if (oldTeacherId && String(oldTeacherId) !== String(teacherId)) {
        const oldTeacher = await Teacher.findById(oldTeacherId);
        if (oldTeacher) {
            // ✅ Xóa chính xác tiết cụ thể, bao gồm cả subjectId để tránh xóa nhầm
            oldTeacher.timetable = oldTeacher.timetable.filter(
                (t) =>
                    !(
                        String(t.classId) === String(classId) &&
                        t.dayOfWeek === oldDay &&
                        t.lesson === oldLesson &&
                        String(t.subjectId) === String(oldSubjectId)
                    )
            );
            await oldTeacher.save();
        }
    }

    // 🔹 9️⃣ Cập nhật giáo viên mới (hoặc cùng giáo viên nhưng đổi vị trí)
    const newTeacher = await Teacher.findById(teacherId);
    if (newTeacher) {
        // ✅ Xóa tiết cũ trước (quan trọng! kể cả khi cùng giáo viên)
        newTeacher.timetable = newTeacher.timetable.filter(
            (t) =>
                !(
                    String(t.classId) === String(classId) &&
                    t.dayOfWeek === oldDay &&
                    t.lesson === oldLesson &&
                    String(t.subjectId) === String(oldSubjectId)
                )
        );
        // ✅ Thêm tiết mới
        newTeacher.timetable.push({
            classId,
            subjectId,
            dayOfWeek,
            lesson,
        });
        await newTeacher.save();
    }

    // 🔹 🔟 Trả dữ liệu đầy đủ
    const updated = await Timetable.findById(timetableId)
        .populate("classId gradeId timetable.subjectId timetable.teacherId");

    return {
        message: "✅ Cập nhật tiết học thành công trong thời khóa biểu",
        data: updated,
    };
};





const deleteTimetableSlotService = async (timetableId, { dayOfWeek, lesson }) => {
    const timetable = await Timetable.findById(timetableId);
    if (!timetable) throw new Error("Không tìm thấy thời khóa biểu");

    const targetLesson = timetable.timetable.find(
        (item) => item.dayOfWeek === dayOfWeek && item.lesson === Number(lesson)
    );

    if (!targetLesson)
        throw new Error(`Không tìm thấy tiết ${lesson} (${dayOfWeek}) trong thời khóa biểu`);

    const { classId } = timetable;
    const teacherId = targetLesson.teacherId;
    const subjectId = targetLesson.subjectId;

    // 🧹 Xóa tiết khỏi Timetable
    timetable.timetable = timetable.timetable.filter(
        (item) => !(item.dayOfWeek === dayOfWeek && item.lesson === Number(lesson))
    );
    await timetable.save();

    // 🧩 Đồng bộ Class - xóa chính xác tiết này
    await Class.updateOne(
        { _id: classId },
        {
            $pull: {
                timetable: {
                    dayOfWeek,
                    lesson: Number(lesson),
                    subjectId,
                    teacherId
                }
            }
        }
    );

    // 🧩 Đồng bộ Teacher - chỉ xóa tiết của lớp này, không ảnh hưởng lớp khác
    await Teacher.updateOne(
        { _id: teacherId },
        {
            $pull: {
                timetable: {
                    classId,
                    dayOfWeek,
                    lesson: Number(lesson),
                    subjectId
                }
            }
        }
    );

    return {
        message: `Đã xóa tiết ${lesson} (${dayOfWeek}) khỏi thời khóa biểu lớp`,
        timetable,
    };
};

const checkTeacherAvailabilityService = async (teacherId) => {
    if (!teacherId) throw new Error("Thiếu teacherId");

    const teacher = await Teacher.findById(teacherId).populate("timetable.classId", "className");
    if (!teacher) throw new Error("Không tìm thấy giáo viên");

    // Lấy tất cả các tiết giáo viên đang dạy
    const busySlots = teacher.timetable.map((t) => ({
        dayOfWeek: t.dayOfWeek,
        lesson: t.lesson,
        className: t.classId?.className,
    }));

    // Nhóm theo thứ và tiết (không trùng lặp)
    const uniqueSlots = [];
    const slotSet = new Set();

    for (const slot of busySlots) {
        const slotKey = `${slot.dayOfWeek}-${slot.lesson}`;
        if (!slotSet.has(slotKey)) {
            slotSet.add(slotKey);
            uniqueSlots.push({
                dayOfWeek: slot.dayOfWeek,
                lesson: slot.lesson,
            });
        }
    }

    return {
        teacherId: teacher._id,
        teacherName: teacher.fullName,
        teacherCode: teacher.teacherCode,
        totalBusySlots: uniqueSlots.length,
        conflicts: uniqueSlots,
    };
};

module.exports = {
    generateTimetableForClass,
    getAllTimetablesService,
    getOneTimeTableService,
    updateSingleLessonService,
    deleteTimetableSlotService,
    checkTeacherAvailabilityService
};
