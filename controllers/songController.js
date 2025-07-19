const axios = require("axios");
const FormData = require("form-data"); // Add this import
const fs = require("fs");
const path = require("path");
const os = require("os");

const Song = require("../models/songModel");
const { songSchema } = require("../utils/validations/songValidation");
const songModel = require("../models/songModel");
const userModel = require("../models/userModel");
const reactionModel = require("../models/reactionModel");
const folderModel = require("../models/folderModel");
const {sendEmail} = require("../helpers/sendEmail");
const mongoose = require('mongoose');

const moment = require("moment"); // Optional, makes date comparison easier
const AWS = require('aws-sdk');
const configureAWS = require('../helpers/awsBucketConfig'); // Import the AWS config


const createSong = async (req, res) => {
  try {
    const userId = req.userId;
    console.log("userId is", userId);
    const { customMode, instrumental, prompt, style, title, model,
          clipStart,
          lyricsStart,
          promptStrength,
          lyricsStrength,
          clarity,
          negativeTags, songType, lyrics, clipLength } = req.body;

    if (title.length > 100) {
      return res.status(400).json({
        status: false,
        message: "Title is too long. Please provide a short title.",
      });
    }

    console.log ("Request body negativeTags", req.body.negativeTags);

    // Validate input
    const { error } = songSchema.validate({
      customMode,
      instrumental,
      prompt,
      style,
      title,
      model,
      clipStart,
      lyricsStart,
      promptStrength,
      lyricsStrength,
      clarity,
      negativeTags,
      songType, 
      lyrics,
      clipLength
    });
    
    if (error) {
      return res
        .status(400)
        .json({ status: false, message: error.details[0].message });
    }

    let clip;
    if(songType==="clip")
    {
      clip=true;
    }
    else{
      clip=false;
    }

    console.log("Song clip is", clip);

    //call an AI api
    try {
      const songDetails = await axios.post(
        "http://52.202.112.168/ai/generate-song/",
        {
          customMode,
          instrumental,
          prompt,
          lyrics,
          style,
          title,
          model,
          clipStart,
          lyricsStart,
          promptStrength,
          lyricsStrength,
          clarity,
          negativeTags,
          clip,
          clipLength
        },
        { timeout: 1000000 } // 10 minutes in milliseconds
      );

      console.log("songDetails", songDetails);
      console.log("songDetails data", songDetails.data);

      // Extract the songs array from the API response
      const results = songDetails.data.data;

      // If no results or results is empty, return an error
      if (!results || !Array.isArray(results) || results.length === 0) {
        return res.status(409).json({
          status: false,
          message: "Song is not created due to some error in AI API",
        });
      }

      // Create and save song
      let saveSongData = [];

      // Process all song objects in the results array
      for (const songData of results) {
        console.log("Processing song:", songData.title);
        console.log("Song tags are:", songData.tags);
        console.log("Song prompts are:", songData.prompt);

        const song = new Song({
          title: songData.title,
          audioId: songData.id, // Fixed: Use songData.id instead of songData.audio.id
          songUrl: songData.stream_audio_url,
          songImageUrl: songData.image_url,
          lycrics: songData.prompt || "",
          tags: Array.isArray(songData.tags)
            ? songData.tags.map((tag) => tag.trim())
            : [],
          duration: songData.duration,
          generatedBy: userId,
          discription: prompt || "",
          songType: songType || "full song"
        });
        
        const savedSong = await song.save();
        saveSongData.push(savedSong);
      }
          
      if (saveSongData.length === 0) {
        return res.status(409).json({
          status: false,
          message: "Failed to process any valid songs from the AI response",
        });
      }
      
      return res.status(201).json({
        status: true,
        message: "Song created successfully",
        data: saveSongData,
      });
    } catch (error) {
      console.log("error logged are", error);

      // Extract and return the actual error message from the API response
      if (error?.response && error.response?.data) {
        return res.status(error.response.status || 409).json({
          status: false,
          message: error.response?.data?.detail || "Error from AI service",
        });
      }

      // Default error response if we can't extract a specific message
      return res.status(409).json({
        status: false,
        message: "Error connecting to AI service",
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Error creating song:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const editSong = async (req, res) => {
  try {
    const { songId } = req.params;
    const { title, lycrics, attribute, discription, tags } = req.body;
     console.log("Song lyrics is", lycrics)
    // Prepare the update object with new fields
    const updateData = { title, lycrics, attribute, discription };

    // If tags array is provided, update the tags field
    if (tags && Array.isArray(tags)) {
      updateData.tags = tags;
    }

    // Update song
    const updatedSong = await Song.findByIdAndUpdate(
      songId,
      updateData,
      { new: true }
    );

    if (!updatedSong) {
      return res.status(404).json({ status: false, message: "Song not found" });
    }

    return res.status(200).json({
      status: true,
      message: "Song updated successfully",
      data: updatedSong,
    });
  } catch (error) {
    console.error("Error editing song:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

// Delete a song
const deleteSong = async (req, res) => {
  try {
    const { songId } = req.params;

    const deletedSong = await Song.findByIdAndDelete(songId);
    if (!deletedSong) {
      return res.status(404).json({ status: false, message: "Song not found" });
    }

      await userModel.updateMany(
        { likedSongs: songId },
        { $pull: { likedSongs: songId } }
      );

    await folderModel.updateMany(
      { songs: songId },
      { $pull: { songs: songId } }
    );

    await reactionModel.deleteMany({ songId });

    return res
      .status(200)
      .json({ status: true, message: "Song deleted successfully" });
  } catch (error) {
    console.error("Error deleting song:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

const showSongs = async (req, res) => {
  try {
    let { page, limit } = req.query;
    console.log("Show Songs function called");

    page = isNaN(parseInt(page, 10)) ? 1 : parseInt(page, 10);
    limit = isNaN(parseInt(limit, 10)) ? 20 : parseInt(limit, 10);
    const skip = (page - 1) * limit;

    const totalSongs = await Song.countDocuments();
    const totalPages = Math.ceil(totalSongs / limit);

    const songsWithReactions = await Song.aggregate([
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "reactions", // collection name
          localField: "_id",
          foreignField: "songId",
          as: "reactions",
        },
      },
      {
        $lookup: {
          from: "users", // collection name
          localField: "reactions.userId",
          foreignField: "_id",
          as: "likedUsers",
        },
      },
      {
        $project: {
          title: 1,
          songUrl: 1,
          songImageUrl: 1,
          duration: 1,
          tags: 1,
          songType:1,
          lycrics: 1,
          liked: 1,
          likeCount: 1,
          discription: 1,
          attribute: 1,
          playCount:1,
          generatedBy: 1,
          createdAt: 1,
          likedUsers: {
            _id: 1,
            name: 1,
            email: 1,
          },
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Songs retrieved successfully",
      data: songsWithReactions,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching songs:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

const showOneSong = async (req, res) => {
  try {
    const { songId } = req.params;
    console.log("songId is", songId);
    const songDetails = await songModel.findById(songId);
    if (!songDetails) {
      return res.status(404).json({
        status: false,
        message: "No song details found",
      });
    }

    // Format the createdAt date
    const formattedDate = songDetails.createdAt
      ? new Date(songDetails.createdAt).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
        })
      : "N/A"; // Default value if no date exists

    let songData = {
      ...songDetails.toObject(),
      createdAt: formattedDate,
    };

    return res.status(200).json({
      status: true,
      message: "Song loaded successfully",
      data: songData,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      message: error.message,
    });
  }
};

const generateLyrics = async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("Prompt is", prompt);

    const aiResponse = await axios.post(
      "http://3.130.155.243/generate-lyrics/",
      {
        prompt,
      },
      { timeout: 600000 } // 5 minutes in milliseconds
    );

    console.log("AI api response is", aiResponse.data);

    if (aiResponse?.data?.status !== "SUCCESS" && !aiResponse.data?.length) {
      return res.status(409).json({
        status: false,
        message: "Lyrics is not generted due to some error in AI api",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Lyrics generated successfully",
      lyricsData: aiResponse.data,
    });
  } catch (error) {
    console.error("Error creating song:", error.message);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const toggleLikeSong = async (req, res) => {
  try {
    const userId = req.userId;
    console.log('userId...', userId);
    const { songId, reactionType } = req.body;

    if (!songId || !reactionType) {
      return res.status(400).json({
        status: false,
        message: "Song ID and reactionType are required.",
      });
    }

    const user = await userModel.findById(userId);
    const song = await songModel.findById(songId);

    if (!user || !song) {
      return res.status(404).json({
        status: false,
        message: "User or Song not found.",
      });
    }

    if (reactionType === "like") {
      // Check if already liked
      const alreadyLiked = await reactionModel.findOne({ userId, songId });

      if (alreadyLiked) {
        return res.status(400).json({
          status: false,
          message: "Song is already liked.",
        });
      }

      // Create reaction
      await reactionModel.create({ userId, songId });

      // Increment likeCount
      song.likeCount += 1;
      await song.save();

      return res.status(200).json({
        status: true,
        message: "Song liked successfully.",
        liked: true,
      });
    }

    if (reactionType === "dislike") {
      const reaction = await reactionModel.findOne({ userId, songId });

      if (!reaction) {
        return res.status(400).json({
          status: false,
          message: "You haven't liked this song yet.",
        });
      }

      // Delete the like
      await reactionModel.deleteOne({ userId, songId });

      // Decrease likeCount (min 0)
      song.likeCount = Math.max(song.likeCount - 1, 0);
      await song.save();

      return res.status(200).json({
        status: true,
        message: "Song unliked successfully.",
        liked: false,
      });
    }

    return res.status(400).json({
      status: false,
      message: "Invalid reactionType. Use 'like' or 'dislike'.",
    });
  } catch (error) {
    console.error("Error toggling song reaction:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};


const incrementPlayCount = async (req, res) => {
  try {
    const { songId } = req.body;

    const song = await songModel.findByIdAndUpdate(
      songId,
      { $inc: { playCount: 1 } },
      { new: true }
    );

    if (!song) {
      return res.status(404).json({ status: false, message: "Song not found" });
    }

    res.status(200).json({
      status: true,
      message: "Play count updated",
      playCount: song.playCount,
    });
  } catch (error) {
    console.error("Error updating play count:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};


const searchSongs = async (req, res) => {
  try {
    console.log("Search api is hitting");
    const { title } = req.query;

    if (!title) {
      return res.status(400).json({
        status: false,
        message: "Song title is required to search songs",
      });
    }

    console.log("Song title is", title);

    // Search songs by title
    const songs = await songModel.find({
      title: { $regex: title, $options: "i" }, // Case-insensitive match
    });
    console.log("songs details are", songs);
    return res.status(200).json({
      status: true,
      songs: songs,
    });
  } catch (error) {
    console.error("Error searching songs:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const filterSongs = async (req, res) => {
  try {
    const { filterBy, dateCreated, sortBy } = req.query;
    const userId = req.user?._id; // Assuming req.user is set after authentication

    const query = {};

    // Filter: Liked Songs (liked by any user)
    if (filterBy === "liked") {
      query.liked = "true";
    }
    

    // Filter: Published (songs created by the logged-in user)
    if (filterBy === "published" && userId) {
      query.generatedBy = mongoose.Types.ObjectId(userId);
    }

    // Filter: Date Created
    if (dateCreated) {
      let startDate, endDate;

      const today = moment().startOf("day");
      const tomorrow = moment(today).add(1, "days");
      const yesterday = moment(today).subtract(1, "days");
      const lastWeek = moment(today).subtract(7, "days");

      if (dateCreated === "today") {
        startDate = today;
        endDate = tomorrow;
      } else if (dateCreated === "yesterday") {
        startDate = yesterday;
        endDate = today;
      } else if (dateCreated === "lastWeek") {
        startDate = lastWeek;
        endDate = tomorrow;
      }

      if (startDate && endDate) {
        query.createdAt = { $gte: startDate.toDate(), $lt: endDate.toDate() };
      }
    }

      // Sorting logic
      let sortOption = { createdAt: -1 }; // Default: Newest First
      if (sortBy === "oldest") {
        sortOption = { createdAt: 1 };
      }

    const songs = await songModel.find(query).sort(sortOption);

    return res.status(200).json({ 
      status: true,
      message: "Songs loaded successfully",
      data: songs 
    
    });
  } catch (error) {
    console.error("Error filtering songs:", error);
    return res.status(500).json({ 
      status: false,
      message: "Internal server error", 
      error: error.message
    });
  }
};

const audioUpload = async (req, res, next) => {
  try {
    console.log("Upload audio function called");
    console.log("req.files ", req.files);

    let file;
    if (Array.isArray(req.files?.file)) {
      file = req.files.file[0];  // If it's an array, take the first file
    } else {
      file = req.files?.file;  // If it's an object, use it directly
    }

    if (!file) {
      return res.status(400).json({ 
        status: false, 
        message: "No file uploaded" 
      });
    }

    let typeFile;
    if (file.mimetype.includes("audio")) {
      typeFile = "Audio";
    } else {
      return res.status(400).json({
        status: false, 
        message: "Please select only audio file"
      });
    }

    console.log("Upload audio file is", file);

    // Create a temporary file path
    const tempFilePath = path.join(os.tmpdir(), file.name);
    
    // Write the file data to the temporary file
    fs.writeFileSync(tempFilePath, file.data);
    
    // Create proper FormData using the form-data package
    const formData = new FormData();
    formData.append("file", fs.createReadStream(tempFilePath));

    // Send the audio file to the AI API
    const aiResponse = await axios.post("http://52.202.112.168/ai/process-audio/", formData, {
      headers: {
        ...formData.getHeaders(), // This will set the proper Content-Type with boundary
      },
      timeout: 600000  // 10 minutes in milliseconds
    });

    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    if (!aiResponse || !aiResponse.data) {
      return res.status(500).json({
        status: false,
        message: "AI processing failed or no response received."
      });
    }
    
    return res.status(200).json({
      status: true,
      message: "File uploaded and processed successfully",
      data: aiResponse.data,
    });

  } catch (error) {
    console.error("Error in audio upload:", error);
    return res.status(500).json({ 
      status: false, 
      message: error.message,
      error: error.message || error
    });
  }
};

const downloadSong = async (req, res) => {
  try {
    console.log("Download song API hitting");
    const { songId } = req.query;
    console.log("Song id is", songId);

    // Find the song from the database
    const song = await songModel.findById(songId);
    if (!song) {
      return res.status(404).json({
        status: false,
        message: 'Song not found',
      });
    }

    const songUrl = song.songUrl;
    console.log("Full song URL is", songUrl);

    const songKey = songUrl.replace('https://ai-song-bucket.s3.amazonaws.com/', '');  // Remove the base URL part
    console.log("Extracted songKey is", songKey);

    // Set up the parameters for S3
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: songKey, // The key of the file in the bucket
    };

    const s3 = configureAWS(); // Use the AWS configuration from awsConfig.js
    // Get the song from S3 and pipe it to the response
    s3.getObject(params, (err, data) => {
      if (err) {
        console.error("Error fetching file from S3:", err);
        return res.status(500).json({
          status: false,
          message: "Failed to download song from AWS S3",
          error: err.message,
        });
      }

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Set the correct content headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${song.title}.mp3"`);
      res.setHeader('Content-Length', data.Body.length); // Important for audio files
      
      // Pipe the S3 file to the response
      // return res.status.josn({
      //   status: true,
      //   downloadedSong: data.Body}); // The song file from S3
      return res.send(data.Body);

    });

  } catch (error) {
    console.error("Error in downloadSong API:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const extendSong = async (req, res) => {
  try {
    console.log("Extend song API hitting");

    const {
      defaultParamFlag,
      audioId,
      songId,
      prompt,
      style,
      title,
      continueAt,
      model,
      instrumental,

      clipStart,
      lyricsStart,
      promptStrength,
      lyricsStrength,
      clarity,
      negativeTags,
      customMode 
    } = req.body;

    console.log("Request body is backend is", req.body);

    // Validate input
        if (
        defaultParamFlag === undefined ||
        customMode === undefined ||
        instrumental === undefined ||
        lyricsStart === undefined ||  
        !songId ||
        continueAt === undefined ||
        !audioId ||
        !prompt ||
        !style ||
        !title ||
        !model ||
        clipStart === undefined ||
        promptStrength === undefined ||
        lyricsStrength === undefined ||
        clarity === undefined ||
        negativeTags === undefined
      ) {
        return res.status(400).json({
          status: false,
          message: "Incomplete parameters provided",
        });
      }

    console.log("Song model and time is",    model, continueAt);
    // Call AI API
    const songDetails = await axios.post(
      "http://52.202.112.168/ai/extend-audio/",
      {
        defaultParamFlag,
        audioId,
        prompt,
        style,
        title,
        model,
        continueAt,
        instrumental,
        customMode,

        clipStart,
        promptStrength,
        lyricsStrength,
        clarity,
        negativeTags,
        clipStart,
        lyricsStart

      },
      { timeout: 1000000 }
    );

    const results = songDetails.data;
    console.log("songDetails data", results);

    // Check if we have a valid response with data array
    if (!results || !results.data || !Array.isArray(results.data) || results.data.length === 0) {
      return res.status(409).json({
        status: false,
        message: "Song is not extended due to some error in AI API",
      });
    }

    const updatedSongData = results.data[0];
    console.log("Updated song data before saving into DB", updatedSongData);
    // Update the song in the database with the first result
    const updatedSong = await songModel.findByIdAndUpdate(
      songId, 
      updatedSongData, // Data to update
      { new: true } // Option to return the updated document
    );

    if (!updatedSong) {
      return res.status(404).json({
        status: false,
        message: "Song extended from AI but not found in database",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Song extended successfully",
      data: updatedSong,
    });
  } catch (error) {
    console.error("Error extending song:", error.message);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


module.exports = {
  createSong,
  editSong,
  deleteSong,
  showSongs,
  showOneSong,
  generateLyrics,
  toggleLikeSong,
  searchSongs,
  // sortedSongs,
  filterSongs,
  audioUpload,
  downloadSong,
  extendSong,
  incrementPlayCount
};
