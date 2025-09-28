import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  createSubmission, 
  getUserSubmissions, 
  getSubmission,
  createCodeChefSubmission,
  getSubmissionsByPlatform
} from '../controllers/submission-controller';

const router = express.Router();

// All submission routes require authentication
router.use(authenticateToken);

// POST /submissions - Create a new code submission
router.post('/', createSubmission);

// POST /submissions/codechef - Create a new CodeChef submission with enhanced validation
router.post('/codechef', createCodeChefSubmission);

// GET /submissions - Get all submissions for the authenticated user
router.get('/', getUserSubmissions);

// GET /submissions/platform/:platform - Get submissions filtered by platform (codechef/leetcode)
router.get('/platform/:platform', getSubmissionsByPlatform);

// GET /submissions/:id - Get a specific submission
router.get('/:id', getSubmission);

export default router; 