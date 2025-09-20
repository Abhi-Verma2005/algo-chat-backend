import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  saveCodeSubmission, 
  getCodeSubmissionsByUser, 
  getCodeSubmissionById 
} from '../services/queries';
import { externalDb } from '@/lib/algo-db';
import { Submission, questions } from '@/models/algo-schema';
import { eq } from 'drizzle-orm';

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

    // Also mirror to external Submission table for solved-status parity
    try {
      // Lookup question by slug in external DB
      const found = await externalDb
        .select()
        .from(questions)
        .where(eq(questions.slug, questionSlug));
      const q = found?.[0];

      if (q?.id) {
        // Normalize status to enum
        const raw = (submissionStatus || 'accepted').toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
        const allowed = new Set([
          'PENDING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR'
        ]);
        const status = allowed.has(raw) ? (raw as any) : (raw.includes('ACCEPT') ? 'ACCEPTED' : 'PENDING');

        await externalDb.insert(Submission).values({
          userId,
          questionId: q.id,
          status: status as any,
          score: 0,
          createdAt: new Date(),
        });
      }
    } catch (mirrorErr) {
      console.error('Mirror to external Submission failed:', mirrorErr);
      // non-blocking
    }

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