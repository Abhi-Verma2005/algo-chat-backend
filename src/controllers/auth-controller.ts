import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateUser, getExternalUserByEmail } from '../services/queries';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
      return;
    }

    // Authenticate user against external database
    const user = await authenticateUser(email, password);

    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
      return;
    }

    // Generate JWT token for extension
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data and token
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          leetcodeUsername: user.leetcodeUsername,
          codechefUsername: (user as any).codechefUsername,
          codeforcesUsername: user.codeforcesUsername,
          section: user.section,
          enrollmentNum: user.enrollmentNum,
          profileUrl: user.profileUrl,
          groupId: user.groupId,
          individualPoints: user.individualPoints,
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Get fresh user data from external database
    const user = await getExternalUserByEmail(decoded.email);

    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Token verified',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          leetcodeUsername: user.leetcodeUsername,
          codechefUsername: (user as any).codechefUsername,
          codeforcesUsername: user.codeforcesUsername,
          section: user.section,
          enrollmentNum: user.enrollmentNum,
          profileUrl: user.profileUrl,
          groupId: user.groupId,
          individualPoints: user.individualPoints,
        }
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
      return;
    }

    // Verify current token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Generate new token
    const newToken = jwt.sign(
      { 
        userId: decoded.userId, 
        email: decoded.email, 
        username: decoded.username 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Token refreshed',
      data: { token: newToken }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
}; 