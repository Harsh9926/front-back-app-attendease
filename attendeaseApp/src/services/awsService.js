import { rekognition, s3 } from '../config/aws-config';
import { AWS_CONFIG } from '../config/aws';

const resolveKey = (fileNameOrKey) => {
  const prefix = (AWS_CONFIG.S3_FACE_PREFIX || '').replace(/^\/+|\/+$/g, '');
  const cleaned = fileNameOrKey.replace(/^\/+/, '');
  if (!prefix) {
    return cleaned;
  }
  return cleaned.startsWith(`${prefix}/`) ? cleaned : `${prefix}/${cleaned}`;
};

const uploadToS3 = async (photoUri, fileName) => {
  if (!AWS_CONFIG.S3_BUCKET_NAME) {
    throw new Error('S3 bucket is not configured on the mobile client.');
  }

  const response = await fetch(photoUri);
  const blob = await response.blob();
  const params = {
    Bucket: AWS_CONFIG.S3_BUCKET_NAME,
    Key: resolveKey(fileName),
    Body: blob,
    ContentType: 'image/jpeg',
  };
  return s3.upload(params).promise();
};

const detectFaces = async (s3FileName) => {
  if (!AWS_CONFIG.S3_BUCKET_NAME) {
    throw new Error('S3 bucket is not configured on the mobile client.');
  }

  const params = {
    Image: {
      S3Object: {
        Bucket: AWS_CONFIG.S3_BUCKET_NAME,
        Name: resolveKey(s3FileName),
      },
    },
    Attributes: ['ALL'],
  };
  return rekognition.detectFaces(params).promise();
};

export const awsService = {
  uploadToS3,
  detectFaces,
};
