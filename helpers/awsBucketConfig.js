// awsConfig.js
const AWS = require('aws-sdk');

// Set up AWS S3 configuration
const configureAWS = () => {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME } = process.env;

  // Update AWS configuration
  AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID, // Your AWS access key
    secretAccessKey: AWS_SECRET_ACCESS_KEY, // Your AWS secret key
    region: 'us-east-2', // The region of your S3 bucket
  });

  return new AWS.S3();
};

module.exports = configureAWS;
