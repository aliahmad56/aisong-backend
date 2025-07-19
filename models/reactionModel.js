const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const reactionSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  songId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Song",
    required: true,
  },
  likedAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate likes (one like per user per song)
reactionSchema.index({ userId: 1, songId: 1 }, { unique: true });

module.exports = mongoose.model("Reaction", reactionSchema);
