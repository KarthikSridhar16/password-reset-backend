import express from 'express';
import { forgotPassword, resetPassword, login, register } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/login', login);

export default router;