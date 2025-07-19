const folderModel = require("../models/folderModel");

const createFolder = async (req, res) => {
  try {
    const { folderName } = req.body;
    const userId = req.userId;

    if (!folderName) {
      return res
        .status(400)
        .json({ status: false, message: "Folder name is required." });
    }

    const newFolder = new folderModel({ folderName, createdBy: userId });
    
    const savedFolder = await newFolder.save();

    return res.status(201).json({
      status: true,
      message: "Folder created successfully. ",
      data: savedFolder,
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

const listFolder = async (req, res) => {
  try {
    const userId = req.userId;

    const folders = await folderModel.find({ createdBy: userId });
    return res.status(200).json({
      status: true,
      message: "Folders fetched successfully.",
      data: folders,
    });
  } catch (error) {
    console.error("Error listing folders:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

const addSongToFolder = async (req, res) => {
  try {
    const { folderId, songId } = req.body;

    const folder = await folderModel.findById(folderId);
    if (!folder) {
      return res
        .status(404)
        .json({ status: false, message: "Folder not found." });
    }

    if (!folder.songs.includes(songId)) {
      folder.songs.push(songId);
      await folder.save();
    }

    return res.status(200).json({
      status: true,
      message: "Song added to folder successfully.",
      data: folder,
    });
  } catch (error) {
    console.error("Error adding song to folder:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

const removeSongFromFolder = async (req, res) => {
  try {
    const { folderId, songId } = req.body;

    // Validate required fields
    if (!folderId || !songId) {
      return res.status(400).json({
        status: false,
        message: "Both folderId and songId are required."
      });
    }

    // Find the requested folder
    const folder = await folderModel.findById(folderId);
    if (!folder) {
      return res
        .status(404)
        .json({ status: false, message: "Folder not found." });
    }

    // Check if the song exists in the folder
    if (!folder.songs.includes(songId)) {
      return res.status(404).json({
        status: false,
        message: "Song not found in the specified folder."
      });
    }

    // Remove the song from the folder's songs array
    folder.songs = folder.songs.filter(song => song.toString() !== songId.toString());
    
    // Save the updated folder
    await folder.save();

    return res.status(200).json({
      status: true,
      message: "Song removed from folder successfully.",
      data: folder,
    });
  } catch (error) {
    console.error("Error removing song from folder:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error", error: error.message });
  }
};


const listSongsInsideFolder = async (req, res) => {
  try {
    const { folderId } = req.params;

    const folder = await folderModel.findById(folderId).populate("songs");
    if (!folder) {
      return res
        .status(404)
        .json({ status: false, message: "Folder not found." });
    }

    console.log("folder details are", folder);

    return res.status(200).json({
      status: true,
      message: "Songs inside folder fetched successfully.",
      data: folder,
    });
  } catch (error) {
    console.error("Error fetching songs in folder:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

module.exports = {
  createFolder,
  listFolder,
  addSongToFolder,
  listSongsInsideFolder,
  removeSongFromFolder
};
