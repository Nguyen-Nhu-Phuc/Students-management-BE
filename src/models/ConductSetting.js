// models/ConductSetting.model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ConductSettingSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            enum: ["EXCELLENT", "GOOD", "AVERAGE", "BELOW_AVERAGE"],
        },
        displayName: {
            type: String,
            required: true,
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

module.exports = mongoose.model("ConductSetting", ConductSettingSchema);
