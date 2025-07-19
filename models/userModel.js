var mongoose = require("mongoose");

var Schema = mongoose.Schema;
var user = new Schema({
  name: {
    type: String,
  },

  email: {
    type: String,
  },

  userOtp: {
    type: String,
  },

  isVerified: {
    type: Boolean,
  },

  role: {
    type: String,
    default: "user",
  },

  password: {
    type: String,
  },

  isInvited:{
    type: String,
    default: "false",
  },

  likedSongs:[{
    ref: "Song",
    type: mongoose.Schema.Types.ObjectId
  }]
});

module.exports = mongoose.model("User", user);
