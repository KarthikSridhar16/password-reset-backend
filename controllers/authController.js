import {
  registerUser,
  loginUser,
  requestPasswordReset,
  performPasswordReset,
} from "../services/authService.js";

const statusByCode = {
  USER_EXISTS: 400,
  INVALID_CREDENTIALS: 400,
  TOKEN_INVALID: 400,
};

const toStr = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
const toEnum = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);

export const register = async (req, res, next) => {
  try {
    const email   = toStr(req.body.email).trim().toLowerCase(); // ONLY email now
    const password= toStr(req.body.password).trim();
    const name    = toStr(req.body.name).trim();
    const gender  = toEnum(
      toStr(req.body.gender).trim().toLowerCase(),
      ["male", "female", "other", "prefer_not_to_say"],
      "other"
    );

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const { user, token } = await registerUser({ name, gender, email, password });

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: { id: user._id, email: user.email, name: user.name, gender: user.gender },
    });
  } catch (err) {
    const code = err.code && { USER_EXISTS: 400, INVALID_CREDENTIALS: 400, TOKEN_INVALID: 400 }[err.code];
    if (code) return res.status(code).json({ message: err.message });
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const email    = toStr(req.body.email).trim().toLowerCase();
    const password = toStr(req.body.password).trim();
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const { user, token } = await loginUser(email, password);
    return res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, email: user.email, name: user.name, gender: user.gender },
    });
  } catch (err) {
    const code = err.code && statusByCode[err.code];
    if (code) return res.status(code).json({ message: err.message });
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const email = toStr(req.body.email).trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });
    await requestPasswordReset(email);
    return res.status(200).json({ message: "Password reset link has been sent." });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const newPassword = toStr(req.body.newPassword).trim();
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }
    const { user, token: jwtToken } = await performPasswordReset(token, newPassword);
    return res.status(200).json({
      message: "Password has been reset successfully",
      token: jwtToken,
      user: { id: user._id, email: user.email, name: user.name, gender: user.gender },
    });
  } catch (err) {
    const code = err.code && statusByCode[err.code];
    if (code) return res.status(code).json({ message: err.message });
    next(err);
  }
};
