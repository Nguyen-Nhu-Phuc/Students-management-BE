// models/Subject.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const SubjectSchema = new Schema(
  {
    subjectName: { type: String, required: true },
    subjectCode: { type: String, unique: true, required: true },
    primarySubject: { type: Number, default: 0, required: true },
    grade: { type: Schema.Types.ObjectId, ref: "Grade" },
    description: { type: String },
    gradeLevels: [{ type: Number }],
    departmentID: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    periods: [{ type: Schema.Types.ObjectId, ref: "Period", default: null }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subject", SubjectSchema);
