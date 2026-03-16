// models/Department.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const DepartmentSchema = new Schema(
    {
        name: { type: String, required: true },
        description: { type: String },
        head: { type: Schema.Types.ObjectId, ref: "Teacher" }, // trưởng bộ môn
        teachers: [{ type: Schema.Types.ObjectId, ref: "Teacher" }],
        subjects: [{ type: Schema.Types.ObjectId, ref: "Subject" }]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Department", DepartmentSchema);
