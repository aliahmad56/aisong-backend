const bcrypt = require("bcryptjs");
const ObjectId = require("mongodb").ObjectID;
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const { sendEmail } = require("../helpers/sendEmail");
const { generateOtp } = require("../helpers/otpGenerate");
const { generateRandomPassword } = require("../helpers/passwordGenerate");

//used for verification user and forget password
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        status: false,
        message: "Email is required.",
      });
    }

    // Generate a 6-digit OTP
    const otp = generateOtp();
    if (!otp) {
      return res.status(404).json({
        status: false,
        message: "Failed to generate otp",
      });
    }

    // Send OTP to email
    const emailSent = await sendEmail(
      email,
      "Verification OTP",
      `Use this OTP ${otp} to verify your account.`
    );

    if (!emailSent) {
      return res.status(500).json({
        status: false,
        message: "Failed to send verification email.",
      });
    }

    // Update user's verification OTP in the database
    const user = await userModel.findOneAndUpdate(
      { email: email },
      { userOtp: otp },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Verification OTP has been sent to the email.",
    });
  } catch (err) {
    console.error("Error sending verification OTP:", err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      err: err.message,
    });
  }
};

const confirmOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        status: false,
        message: "Email and OTP are required.",
      });
    }

    // Verify OTP and update user in a single query
    const user = await userModel.findOneAndUpdate(
      { email, userOtp: otp },
      {
        $set: {
          isVerified: true,
          userOtp: null, // Clear OTP after verification
        },
      },
      { new: true } // Returns the updated document
    );

    if (!user) {
      return res.status(400).json({
        status: false,
        message: "Invalid OTP or email. Please try again.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "OTP verified successfully. Your account is now verified.",
    });
  } catch (err) {
    console.error("Error confirming OTP:", err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      err: err.message,
    });
  }
};

const userRegistration = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: false,
        message: "All required fields must be provided.",
      });
    }

    const lowerCaseEmail = email?.toLowerCase();

    let existingUser = await userModel.findOne({
      // $or: [{ email: lowerCaseEmail }, { phoneno: phoneno }],
      email: lowerCaseEmail,
    });

    if (existingUser?.isVerified === false) {
      const otp = generateOtp();
      if (!otp) {
        return res.status(500).json({
          status: false,
          message: "Failed to generate OTP.",
        });
      }

      const emailSent = await sendEmail(lowerCaseEmail, "Verification OTP", `Use this OTP ${otp} to verify your account.`);
      if (!emailSent) {
        return res.status(500).json({
          status: false,
          message: "User created, but failed to send verification email.",
        });
      }

      existingUser.userOtp = otp;
      await existingUser.save();      

      return res.status(409).json({
        status: false,
        isVerified: false,
        message: "User already registered! Please check your email to verify account",
      });
    }

    if (existingUser) {
      return res.status(409).json({
        status: false,
        message: "User already registered and has active account",
      });
    }

    // Generate OTP
    const otp = generateOtp();
    if (!otp) {
      return res.status(500).json({
        status: false,
        message: "Failed to generate OTP.",
      });
    }

    // Encrypt password
    const encryptedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    let newUser = new userModel({
      name,
      email: lowerCaseEmail,
      userOtp: otp,
      password: encryptedPassword,
      isVerified: false,
    });

    // Save user
    await newUser.save();

    //comment for now
    // Send verification OTP via email
    const emailSent = await sendEmail(lowerCaseEmail, "Verification OTP", `Use this OTP ${otp} to verify your account.`);

    if (!emailSent) {
      return res.status(500).json({
        status: false,
        message: "User created, but failed to send verification email.",
      });
    }

    return res.status(201).json({
      status: true,
      message: "User registered successfully. Verification OTP sent.",
      user: newUser,
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      status: false,
      message: err.message || "Internal Server Error",
    });
  }
};

const login = async (req, res) => {
  try {
    console.log("req.body: ", req.body);
    const { email, password } = req.body;

    // Ensure email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "Email and password are required.",
      });
    }

    // Find the user by email
    const user = await userModel.findOne({ email: email.toLowerCase() });

    if (user) {
      // Check if user is deleted
      if (user.isDeleted == true) {
        return res.status(400).json({
          status: false,
          message: "This email user is deleted by admin",
        });
      }

      // Check if user is verified
      if (!user.isVerified) {
        // Generate a 6-digit OTP
        const otp = generateOtp();
        if (!otp) {
          return res.status(404).json({
            status: false,
            message: "Failed to generate otp",
          });
        }
        const emailSent = await sendEmail(
          email,
          "Verification OTP",
          `Use this OTP ${otp} to verify your account.`
        );

        if (!emailSent) {
          return res.status(500).json({
            status: false,
            message: "Failed to send verification otp to verify your account",
          });
        }
        return res.status(403).json({
          status: false,
          isVerified: false,
          message:
            "User is not verified. Please verify your account before logging in.",
        });
      }

      // Verify password
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (isPasswordMatch) {
        // Generate access token if credentials are correct
        const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
          expiresIn: "2h",
        });

        return res.status(200).json({
          status: true,
          message: "Login successfull",
          user: user,
          accessToken: accessToken,
        });
      } else {
        // Password does not match
        return res.status(400).json({
          status: false,
          message: "Incorrect email or password.",
        });
      }
    } else {
      // User not found
      console.log("Invalid User");
      return res.status(400).json({
        status: false,
        message: "User does not exist.",
      });
    }
  } catch (err) {
    console.log("Error: ", err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      err: err.message,
    });
  }
};


const getCurrentUser = async (req, res) => {
  try {
    // Fetch the user from the database using the userId stored in the req object
    const user = await userModel.findById(req.userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Fetch account information using the userId
    // const account = await accountModel.findOne({ userId: req.userId });

    // if (!account) {
    //   return res
    //     .status(404)
    //     .json({ success: false, message: "Account information not found" });
    // }

    // Combine the user and account data (excluding sensitive data like password)
    const { password, ...userInfo } = user.toObject();
    // const {
    //   password: accountPassword,
    //   __v,
    //   ...accountInfo
    // } = account.toObject();

    // Merge user and account data without wrapping in an 'account' object
    const userWithAccountInfo = { ...userInfo };

    // Return the combined data
    return res.status(200).json({
      success: true,
      user: userWithAccountInfo, // Returning combined user and account data
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


const resetPassword = async (req, res) => {
  try {
    const { otp, password } = req.body;

    // Check if OTP and password are provided
    if (!otp || !password) {
      return res.status(400).json({
        status: false,
        message: "OTP and password are required.",
      });
    }

    // Encrypting the new password
    const encryptedPassword = await bcrypt.hash(password, saltRounds);
    console.log("Encrypted Password:", encryptedPassword);

    // Check if the OTP exists for a user
    const user = await userModel.findOne({ userOtp: otp });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    // Update the password and clear the OTP
    const updatePassword = await userModel.updateOne(
      { userOtp: otp },
      { $set: { userOtp: null, password: encryptedPassword } }
    );

    if (updatePassword.nModified > 0) {
      return res.status(200).json({
        status: true,
        message: "Password updated successfully.",
      });
    } else {
      return res.status(400).json({
        status: false,
        message:
          "Failed to update password. OTP might be expired or already used.",
      });
    }
  } catch (err) {
    console.error("Error:", err);
    if (err) {
      return res.status(422).json({
        status: false,
        message: err.message,
      });
    }
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

const allUserList = async (req, res) => {
  try {
    const userList = await userModel.find({
      isVerified: true,
    });

    return res.status(200).json({
      status: true,
      message: "User loaded successfully",
      user: userList,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

const inviteUser = async (req, res) => {
  try {
    const { email } = req.body; // The email of the invited user

    const userExist = await userModel.findOne({email})
    if(userExist){
      return res.status(409).json({
        status: false,
        message: "User already exists",
      });
    }

    const initialPassword = generateRandomPassword();
    console.log("initialPassword", initialPassword)
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    const newUser = new userModel({
      email,
      password: hashedPassword,
      // isInvited: "true"
      isVerified: true,
    });

    await newUser.save();

    // Optionally, send an invitation email
    const inviteLink = `http://3.130.155.243/login`;
    // Craft the email body
    const emailBody = `
      Hello,

      You've been invited to join our app. Please use the following credentials to log in:
      - Email: ${email}
      - Initial Password: ${initialPassword}

      After logging in, you will be prompted to set a new password.

      Click here to set your password: ${inviteLink}

      Thank you!
    `;
    
    // Send email (you can use nodemailer or any other email service)
    const isEmailSend = sendEmail(email, 'Invitation to Join App', emailBody);
    
    if(!isEmailSend){
      return res.status(500).json({
        status: false,
        message: "Failed to send invitation email",
      });
    }


    return res.status(201).json({
      status: true,
      message: "Invitation sent successfully. The new user can set a new password on login.",
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to send invitation",
      error: error.message,
    });
  }
};

module.exports = {
  userRegistration,
  sendOtp,
  confirmOtp,
  login,
  resetPassword,
  allUserList,
  inviteUser,
  getCurrentUser
};
