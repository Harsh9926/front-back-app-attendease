const DEFAULT_BUCKET =
  (process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME || "").trim();
const DEFAULT_REGION = (process.env.AWS_REGION || "").trim();
const PUBLIC_BASE_URL = (process.env.S3_PUBLIC_BASE_URL || "").trim();

const isHttpUrl = (value) => /^https?:\/\//i.test(value);

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");
const trimLeadingSlash = (value) => value.replace(/^\/+/, "");

function buildPublicFaceUrl(key) {
  if (!key || typeof key !== "string") {
    return null;
  }

  if (isHttpUrl(key)) {
    return key;
  }

  const normalizedKey = trimLeadingSlash(key);

  if (PUBLIC_BASE_URL) {
    return `${trimTrailingSlash(PUBLIC_BASE_URL)}/${normalizedKey}`;
  }

  if (!DEFAULT_BUCKET) {
    return null;
  }

  if (DEFAULT_REGION) {
    return `https://${DEFAULT_BUCKET}.s3.${DEFAULT_REGION}.amazonaws.com/${normalizedKey}`;
  }

  return `https://${DEFAULT_BUCKET}.s3.amazonaws.com/${normalizedKey}`;
}

module.exports = {
  buildPublicFaceUrl,
};
