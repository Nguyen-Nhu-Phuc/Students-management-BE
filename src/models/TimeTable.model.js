const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
    {
        classId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            required: true,
        },
        gradeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Grade",
            required: true,
        },
        timetable: [
            {
                dayOfWeek: {
                    type: String,
                    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                    required: true,
                },
                lesson: { type: Number, required: true },
                subjectId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Subject",
                    required: true,
                },
                teacherId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Teacher",
                    required: true,
                },
            },
        ],
    },
    { timestamps: true }
);

timetableSchema.index({ classId: 1 }, { unique: true });

module.exports = mongoose.model("Timetable", timetableSchema);
