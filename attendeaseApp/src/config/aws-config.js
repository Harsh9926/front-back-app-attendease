import AWS from 'aws-sdk';
import { AWS_CONFIG } from './aws';

AWS.config.update({
  accessKeyId: AWS_CONFIG.ACCESS_KEY_ID,
  secretAccessKey: AWS_CONFIG.SECRET_ACCESS_KEY,
  region: AWS_CONFIG.REGION,
});

const rekognition = new AWS.Rekognition();
const s3 = new AWS.S3();

export { rekognition, s3 };
