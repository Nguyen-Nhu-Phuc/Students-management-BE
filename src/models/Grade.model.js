// models/Grade.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const GradeSchema = new Schema(
  {
    gradeName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    gradeCode: {
      type: String,
    },
    description: {
      type: String,
    },
    classes: [
      {
        type: Schema.Types.ObjectId,
        ref: "Class",
      },
    ],
    periods: [
      {
        type: Schema.Types.ObjectId,
        ref: "Period",
      },
    ],
    schoolYear: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Grade", GradeSchema);
