const multer = require("multer");
const multerS3 = require("multer-s3");
const { s3 } = require("../config/awsConfig");
require("dotenv").config();

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: (req, file, cb) => {
      cb(null, `faces/${req.body.userId}/${Date.now()}_${file.originalname}`);
    },
  }),
});

module.exports = upload;
