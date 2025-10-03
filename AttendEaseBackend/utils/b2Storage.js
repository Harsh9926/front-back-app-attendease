const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const {
  s3,
  PutObjectCommand,
} = require("../config/awsConfig");

const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION;
const S3_BASE_URL =
  process.env.S3_PUBLIC_BASE_URL ||
  (S3_BUCKET_NAME && AWS_REGION
    ? `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/`
    : null);

const hasB2Config =
  Boolean(B2_APPLICATION_KEY_ID) &&
  Boolean(B2_APPLICATION_KEY) &&
  Boolean(B2_BUCKET_ID) &&
  Boolean(B2_BUCKET_NAME);

function ensureLocalDirectory() {
  const uploadsRoot = path.join(__dirname, "..", "uploads");
  const attendanceDir = path.join(uploadsRoot, "attendance");
  if (!fs.existsSync(attendanceDir)) {
    fs.mkdirSync(attendanceDir, { recursive: true });
  }
  return attendanceDir;
}

async function uploadImageLocally(imageBuffer, fileName) {
  try {
    const attendanceDir = ensureLocalDirectory();
    const filePath = path.join(attendanceDir, fileName);
    await fs.promises.writeFile(filePath, imageBuffer);
    return `/uploads/attendance/${fileName}`;
  } catch (error) {
    console.error("Local image save failed:", error.message);
    throw new Error("Image upload failed");
  }
}

async function uploadImageToS3(imageBuffer, fileName) {
  if (!S3_BUCKET_NAME) {
    return uploadImageLocally(imageBuffer, fileName);
  }

  const key = `attendance/${fileName}`;
  const putParams = {
    Bucket: S3_BUCKET_NAME,
    Key: key,
    Body: imageBuffer,
    ContentType: "image/jpeg",
  };

  try {
    await s3.send(new PutObjectCommand({ ...putParams, ACL: "public-read" }));
  } catch (error) {
    if (
      error?.name === "AccessControlListNotSupported" ||
      error?.Code === "AccessControlListNotSupported"
    ) {
      await s3.send(new PutObjectCommand(putParams));
    } else {
      console.error("S3 upload failed:", error.message);
      return uploadImageLocally(imageBuffer, fileName);
    }
  }

  if (!S3_BASE_URL) {
    return uploadImageLocally(imageBuffer, fileName);
  }

  return `${S3_BASE_URL}${key}`;
}

// Function to upload image to BlackBlaze B2 with S3 fallback
async function uploadImageToB2(imageBuffer, fileName) {
  if (!hasB2Config) {
    return uploadImageToS3(imageBuffer, fileName);
  }

  try {
    const authResponse = await axios.post(
      "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
      {},
      {
        auth: { username: B2_APPLICATION_KEY_ID, password: B2_APPLICATION_KEY },
      }
    );

    const authToken = authResponse.data.authorizationToken;
    const uploadUrlResponse = await axios.post(
      `${authResponse.data.apiUrl}/b2api/v2/b2_get_upload_url`,
      { bucketId: B2_BUCKET_ID },
      { headers: { Authorization: authToken } }
    );

    const uploadAuthToken = uploadUrlResponse.data.authorizationToken;
    const uploadUrl = uploadUrlResponse.data.uploadUrl;

    await axios.post(uploadUrl, imageBuffer, {
      headers: {
        Authorization: uploadAuthToken,
        "X-Bz-File-Name": fileName,
        "Content-Type": "image/jpeg",
        "X-Bz-Content-Sha1": "do_not_verify",
      },
    });

    return `https://f005.backblazeb2.com/file/${B2_BUCKET_NAME}/${fileName}`;
  } catch (error) {
    console.error(
      "Error uploading image to B2:",
      error.response?.data || error.message
    );

    if (S3_BUCKET_NAME) {
      console.warn("B2 upload failed. Falling back to S3 storage.");
      return uploadImageToS3(imageBuffer, fileName);
    }

    return uploadImageLocally(imageBuffer, fileName);
  }
}

function getImageUrl(fileName) {
  if (hasB2Config) {
    return `https://f005.backblazeb2.com/file/${B2_BUCKET_NAME}/${fileName}`;
  }

  if (S3_BASE_URL) {
    return `${S3_BASE_URL}attendance/${fileName}`;
  }

  return `/uploads/attendance/${fileName}`;
}

module.exports = { uploadImageToB2, getImageUrl };
