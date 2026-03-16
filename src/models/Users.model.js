// models/User.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const UsersSchema = new Schema(
    {
        username: { type: String, unique: true, required: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["admin", "teacher", "student", "parent"], required: true },
        linkedId: { type: Schema.Types.ObjectId, refPath: "roleRef" },
        roleRef: { type: String, enum: ["Student", "Teacher", "Parent"] },
        lastLogin: { type: Date },
        refreshToken: { type: String }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Users", UsersSchema);
