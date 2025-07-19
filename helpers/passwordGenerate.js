const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-8);  // Generates an 8-character random password
  };

  module.exports = {
    generateRandomPassword,
  };
  