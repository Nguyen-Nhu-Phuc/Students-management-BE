const mongoose = require("mongoose");
const { Schema } = mongoose;

const TeacherSchema = new Schema(
  {
    teacherCode: { type: String, unique: true, required: true },
    fullName: { type: String, required: true },
    dob: { type: Date },
    gender: { type: String, enum: ["Nam", "Nữ"], required: true },
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    subjectSpecialty: [{ type: Schema.Types.ObjectId, ref: "Subject" }],
    homeroomClass: { type: Schema.Types.ObjectId, ref: "Class" },
    teachingClasses: [{ type: Schema.Types.ObjectId, ref: "Class" }],
    departments: { type: Schema.Types.ObjectId, ref: "Department" },
    active: { type: String, enum: ["active", "inactive"], required: true, default: "active" },
    timetable: [
      {
        dayOfWeek: { type: String },
        lesson: { type: Number },
        classId: { type: Schema.Types.ObjectId, ref: "Class" },
        subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
      },
    ],
    educationLevel: { type: String },
    workingYear: { type: Number },
    achievements: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", TeacherSchema);
