// models/ScoreType.model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ScoreTypeSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            enum: ["ORAL", "15MIN", "45MIN", "FINAL"],
        },
        displayName: {
            type: String,
            required: true,
        },
        defaultCoefficient: {
            type: Number,
            required: true,
            min: 1,
        },

        semester: {
            type: String,
            required: true,
            enum: ["HKI", "HKII", "CN"],
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ScoreType", ScoreTypeSchema);
