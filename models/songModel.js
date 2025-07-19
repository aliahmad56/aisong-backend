var mongoose = require("mongoose");

var Schema = mongoose.Schema;
var songSchema = new Schema({
  title: {
    type: String,
  },

  songUrl: {
    type: String,
  },

  songImageUrl: {
    type: String,
  },

  duration: {
    type: String,
    default: "0.0.0",
  },

  tags: {
    type: [String],
    default: [],
  },
  lycrics: {
    type: String,
    default: "",
  },

  liked: {
    type: String,
    default: "false",
  },

  likeCount: {
    type: Number,
    default: 0, 
  },

  playCount: {
    type: Number,
    default: 0,
  },
  

  discription: {
    type: String,
  },

  attribute: {
    type: String,
  },

  songType: {
   type: String,
   enum: [ "full song", "clip"],
    default: "full song",
  },

  audioId: {
    type: String,
    default: "",
  },

  generatedBy: {
    // type: mongoose.Schema.Types.ObjectId,
    type: String,
    ref: "User",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Song", songSchema);
