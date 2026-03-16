// models/Class.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ClassSchema = new Schema(
  {
    className: { type: String, required: true },
    schoolYear: { type: String, required: true },
    homeroomTeacher: { type: Schema.Types.ObjectId, ref: "Teacher" },
    students: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    teachers: [
      {
        teacher: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
        subjects: [{ type: Schema.Types.ObjectId, ref: "Subject", required: true }],
      },
    ],
    grade: { type: Schema.Types.ObjectId, ref: "Grade" },
    timetable: [
      {
        idTimetable: { type: Schema.Types.ObjectId, ref: "Timetable" },
        dayOfWeek: { type: String },
        lesson: { type: Number },
        subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
        teacherId: { type: Schema.Types.ObjectId, ref: "Teacher" },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", ClassSchema);
