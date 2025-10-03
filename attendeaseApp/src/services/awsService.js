import { rekognition, s3 } from '../config/aws-config';
import { AWS_CONFIG } from '../config/aws';

const uploadToS3 = async (photoUri, fileName) => {
  const response = await fetch(photoUri);
  const blob = await response.blob();
  const params = {
    Bucket: AWS_CONFIG.S3_BUCKET_NAME,
    Key: fileName,
    Body: blob,
    ContentType: 'image/jpeg',
  };
  return s3.upload(params).promise();
};

const detectFaces = async (s3FileName) => {
  const params = {
    Image: {
      S3Object: {
        Bucket: AWS_CONFIG.S3_BUCKET_NAME,
        Name: s3FileName,
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
