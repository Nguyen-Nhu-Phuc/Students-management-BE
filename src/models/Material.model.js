// models/Material.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const MaterialSchema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        fileUrl: { type: String, required: true },
        subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
        classIds: [{ type: Schema.Types.ObjectId, ref: "Class" }],
        uploadedBy: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        approvedBy: { type: Schema.Types.ObjectId, ref: "Teacher" }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Material", MaterialSchema);
