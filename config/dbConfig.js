const mongoose = require("mongoose");

mongoose.Promise = global.Promise;
require("dotenv").config();

mongoose.connect(
  `${process.env.DB_URL}`,
  {
    dbName: process.env.DB_NAME,
    user: process.env.USERR,
    pass: process.env.PASS,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  function (err) {
    if (err) throw err;

    console.log("Successfully connected");
  }
);

module.exports = db = mongoose.connection;
