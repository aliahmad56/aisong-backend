const express = require("express");
const {
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
} = require("../controllers/songController");
const { userVerifyToken } = require("../middlewares/authMiddleware");
const router = express.Router();

router.use(userVerifyToken);

router.post("/create", createSong);
router.get("/all", showSongs);
router.get("/search", searchSongs);
// router.get("/sorted", sortedSongs);
router.get("/filter", filterSongs);
router.get('/downlodsong', downloadSong);
router.get("/:songId", showOneSong);
router.post("/incrementPlayCount", incrementPlayCount);
router.put("/edit/:songId", editSong);
router.delete("/remove/:songId", deleteSong);
router.post("/generate-lycris", generateLyrics);
router.put("/like-song", toggleLikeSong);
router.post('/audio-upload', audioUpload);
router.post("/extend-audio", extendSong);


module.exports = router;
