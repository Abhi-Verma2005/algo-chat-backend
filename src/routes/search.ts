import express, { Router } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { searchQuestions } from '@/controllers/search-controller';

const router: Router = express.Router();

// Basic search endpoint - placeholder for now
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Search functionality coming soon'
  });
});

// Authenticated endpoint to search questions with filters
router.get('/questions', authenticateToken, searchQuestions);

export default router; 