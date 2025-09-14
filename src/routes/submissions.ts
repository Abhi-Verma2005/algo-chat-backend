import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  createSubmission, 
  getUserSubmissions, 
  getSubmission 
} from '../controllers/submission-controller';

const router = express.Router();

// All submission routes require authentication
router.use(authenticateToken);

// POST /submissions - Create a new code submission
router.post('/', createSubmission);

// GET /submissions - Get all submissions for the authenticated user
router.get('/', getUserSubmissions);

// GET /submissions/:id - Get a specific submission
router.get('/:id', getSubmission);

export default router; 