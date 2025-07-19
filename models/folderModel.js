var mongoose = require("mongoose");

var Schema = mongoose.Schema;
var folderSchema = new Schema({
  folderName: {
    type: String,
  },

  createdBy: {
    ref: "User",
    type: mongoose.Schema.Types.ObjectId,
  },

  songs: [
    {
      ref: "Song",
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
});
module.exports = mongoose.model("Folder", folderSchema);
