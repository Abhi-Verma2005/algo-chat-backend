import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  saveCodeSubmission, 
  getCodeSubmissionsByUser, 
  getCodeSubmissionById 
} from '../services/queries';

export const createSubmission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionSlug, code, language, problemTitle, submissionStatus } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    if (!questionSlug || !code || !language) {
      res.status(400).json({ 
        success: false, 
        message: 'Question slug, code, and language are required' 
      });
      return;
    }

    const submission = await saveCodeSubmission({
      externalUserId: userId,
      questionSlug,
      code,
      language,
      problemTitle,
      submissionStatus: submissionStatus || 'accepted',
    });

    res.json({
      success: true,
      message: 'Code submission created successfully',
      data: { submission }
    });

  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

export const getUserSubmissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    const submissions = await getCodeSubmissionsByUser({ externalUserId: userId });

    res.json({
      success: true,
      message: 'Submissions retrieved successfully',
      data: { submissions }
    });

  } catch (error) {
    console.error('Get user submissions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

export const getSubmission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    const submission = await getCodeSubmissionById({ id });

    if (!submission) {
      res.status(404).json({ 
        success: false, 
        message: 'Submission not found' 
      });
      return;
    }

    // Ensure user can only access their own submissions
    if (submission.externalUserId !== userId) {
      res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Submission retrieved successfully',
      data: { submission }
    });

  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}; 