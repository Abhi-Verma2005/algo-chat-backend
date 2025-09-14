import express from 'express';
import { login, verifyToken, refreshToken } from '../controllers/auth-controller';

const router = express.Router();

// POST /auth/login - User login
router.post('/login', login);

// GET /auth/verify - Verify JWT token
router.get('/verify', verifyToken);

// POST /auth/refresh - Refresh JWT token
router.post('/refresh', refreshToken);

export default router; 