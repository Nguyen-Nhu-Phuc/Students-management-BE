// models/Student.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const StudentSchema = new Schema(
    {
        studentCode: { type: String, unique: true, required: true },
        fullName: { type: String, required: true },
        dob: { type: Date },
        gender: { type: String, enum: ["Nam", "Nữ"], required: true },
        address: { type: String },
        phone: { type: String },
        email: { type: String },
        admissionYear: { type: Number },
        currentClass: { type: Schema.Types.ObjectId, ref: "Class" },
        active: { type: String, enum: ["active", "inactive"], required: true, default: "active" },
        studyHistory: [
            {
                classId: { type: Schema.Types.ObjectId, ref: "Class" },
                schoolYear: { type: String },
                result: { type: String }
            }
        ],
        scores: [
            {
                subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
                scoreTypeId: { type: Schema.Types.ObjectId, ref: "ScoreType" },
                score: { type: Number },
            }
        ],
        conducts: [
            {
                conduct: { type: Schema.Types.ObjectId, ref: "ConductSetting" },
            }
        ],
        results: [
            {
                semester: { type: String, enum: ["HKI", "HKII", "CN"] },
                class: { type: Schema.Types.ObjectId, ref: "Class" },
                averageScore: { type: Number },
                subject: { type: Schema.Types.ObjectId, ref: "Subject" },
            }
        ],
        summarys: [
            {
                gpa: { type: Number },
                semester: { type: String, enum: ["HKI", "HKII", "CN"] },
                class: { type: Schema.Types.ObjectId, ref: "Class" },
                conduct: { type: String },
                academicAbility: { type: String, enum: ["Yếu", "Trung bình", "Khá", "Giỏi"] },
            }
        ],
        rewards: [{ type: String }],
        disciplines: [{ type: String }],
        parents: [
            {
                name: { type: String },
                phone: { type: String },
                email: { type: String },
                occupation: { type: String }
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Student", StudentSchema);
