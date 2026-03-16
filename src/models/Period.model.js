// models/Period.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const PeriodSchema = new Schema(
  {
    lessonCount: {
      type: Number,
      required: true,
      min: 1,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    grade: {
      type: Schema.Types.ObjectId,
      ref: "Grade",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Period", PeriodSchema);
