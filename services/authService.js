import User from "../models/userModel.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendResetEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD },
  });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "Password Reset",
    text: `You requested a password reset.\n\nClick the link below to set a new password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
  });

  console.log("🔗 Password reset link:", resetUrl);
};

export const registerUser = async ({ name, gender, email, password }) => {
  const normalizedEmail = (email || "").toLowerCase().trim();

  if (!name?.trim()) {
    const err = new Error("Name is required");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  if (!normalizedEmail) {
    const err = new Error("Email is required");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  if (!password?.trim()) {
    const err = new Error("Password is required");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const allowedGenders = ["male", "female", "other", "prefer_not_to_say"];
  const normalizedGender = (gender || "other").toLowerCase();
  if (!allowedGenders.includes(normalizedGender)) {
    const err = new Error(`Gender must be one of: ${allowedGenders.join(", ")}`);
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const err = new Error("User already exists");
    err.code = "USER_EXISTS";
    throw err;
  }

  const user = new User({
    name: name.trim(),
    gender: normalizedGender,
    email: normalizedEmail,
    password,
  });
  await user.save();

  const token = signToken(user._id);
  return { user, token };
};

export const loginUser = async (email, password) => {
  const normalizedEmail = (email || "").toLowerCase().trim();
  if (!normalizedEmail || !password?.trim()) {
    const err = new Error("Email and password are required");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) {
    const err = new Error("Invalid email or password");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error("Invalid email or password");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  const token = signToken(user._id);
  return { user, token };
};

export const requestPasswordReset = async (email) => {
  const normalizedEmail = (email || "").toLowerCase().trim();
  if (!normalizedEmail) return;

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = rawToken;                 
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  await sendResetEmail(user.email, rawToken);
};

export const performPasswordReset = async (rawToken, newPassword) => {
  if (!rawToken || !newPassword?.trim()) {
    const err = new Error("Token and new password are required");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const user = await User.findOne({
    passwordResetToken: rawToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    const err = new Error("Token is invalid or has expired");
    err.code = "TOKEN_INVALID";
    throw err;
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const jwtToken = signToken(user._id);
  return { user, token: jwtToken };
};
