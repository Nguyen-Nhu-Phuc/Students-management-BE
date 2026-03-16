const mongoose = require("mongoose");
const { Schema } = mongoose;

const TokenBlacklistSchema = new Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

// Tự động xóa token đã hết hạn
TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("TokenBlacklist", TokenBlacklistSchema);
