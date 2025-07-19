const express = require("express");
const {userVerifyToken} = require("../middlewares/authMiddleware");
const {
    createFolder,
    listFolder,
    addSongToFolder,
    listSongsInsideFolder,
    removeSongFromFolder} = require("../controllers/folderController")
const router = express.Router();

router.use(userVerifyToken)

router.post("/create-folder", createFolder);
router.get("/folder-list", listFolder);
router.put("/move-song", addSongToFolder);
router.put("/remove-song", removeSongFromFolder); // Assuming this is the correct endpoint for removing a song from a folder
router.get("/song-list/:folderId", listSongsInsideFolder);


module.exports = router;