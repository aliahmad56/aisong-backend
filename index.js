var createError = require("http-errors");
var express = require("express");
var request = require("request");
var app = express();
require("dotenv").config();
const db = require("./config/dbConfig.js");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var bodyParser = require("body-parser");
var userRoutes = require("./routes/userRoutes");
const songRoutes = require("./routes/songRoutes");
const folderRoutes = require("./routes/folderRoutes");

var cors = require("cors");
const expressSanitizer = require("express-sanitizer");
const fileUpload = require("express-fileupload");

const port = 5000;
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());
// parse application/json
app.use(logger("dev"));
app.use(cors());
app.use(bodyParser.json());
app.use(expressSanitizer());
app.use(cookieParser());

app.use("/api/user", userRoutes);
app.use("/api/song", songRoutes);
app.use("/api/folder", folderRoutes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});
// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render("error");
});
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
