const otpGenerator = require("otp-generator");

const generateOtp = () => { 
  return otpGenerator.generate(6, {
    digits: true,
    upperCaseAlphabets: false,
    specialChars: false,
  });
};

module.exports = {
  generateOtp,
};
