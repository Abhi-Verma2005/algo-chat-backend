import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  saveCodeSubmission, 
  getCodeSubmissionsByUser, 
  getCodeSubmissionById 
} from '../services/queries';
import { externalDb } from '@/lib/algo-db';
import { Submission, questions } from '@/models/algo-schema';
import { and, eq } from 'drizzle-orm';

export const createSubmission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionSlug: rawSlug, questionUrl, code, language, problemTitle, submissionStatus } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    // Resolve slug: prefer provided slug; else derive from URL via DB or path parsing
    let questionSlug = (rawSlug || '').toString().trim();
    const deriveSlugFromUrl = async (url: string): Promise<string | undefined> => {
      const u = url.trim();
      // Try exact DB match by platform URLs
      const byLc = await externalDb.select().from(questions).where(eq(questions.leetcodeUrl, u));
      if (byLc?.[0]?.slug) return byLc[0].slug;
      const byCc = await externalDb.select().from(questions).where(eq(questions.codechefUrl as any, u));
      if (byCc?.[0]?.slug) return byCc[0].slug;
      // Fallback parse
      try {
        const parsed = new URL(u);
        const parts = parsed.pathname.split('/').filter(Boolean);
        const idx = parts.findIndex((p) => p.toLowerCase() === 'problems');
        if (idx >= 0 && parts[idx + 1]) return parts[idx + 1].toLowerCase();
        if (parts.length > 0) return parts[parts.length - 1].toLowerCase();
      } catch {}
      return undefined;
    };

    if (!questionSlug && questionUrl) {
      const derived = await deriveSlugFromUrl(questionUrl);
      if (derived) questionSlug = derived;
    }

    if (!questionSlug || !code || !language) {
      res.status(400).json({ 
        success: false, 
        message: 'Question slug or URL, code, and language are required' 
      });
      return;
    }

    // Normalize slug
    questionSlug = questionSlug.toLowerCase();

    // Derive problem title if missing
    let finalTitle = problemTitle;
    try {
      if (!finalTitle) {
        const foundQ = await externalDb
          .select()
          .from(questions)
          .where(eq(questions.slug, questionSlug));
        const q = foundQ?.[0];
        if (q?.slug) {
          const title = q.slug.split('-').map(s => s ? s[0].toUpperCase() + s.slice(1) : s).join(' ');
          finalTitle = title;
        }
      }
    } catch {}

    const submission = await saveCodeSubmission({
      externalUserId: userId,
      questionSlug,
      code,
      language,
      problemTitle: finalTitle,
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

        if (status === 'ACCEPTED') {
          // Deduplicate: avoid multiple accepted entries for the same user+question
          const existing = await externalDb
            .select()
            .from(Submission)
            .where(and(eq(Submission.userId, userId), eq(Submission.questionId, q.id)));
          const hasAccepted = existing?.some((s: any) => s.status === 'ACCEPTED');
          if (!hasAccepted) {
            await externalDb.insert(Submission).values({
              userId,
              questionId: q.id,
              status: 'ACCEPTED',
              score: 0,
              createdAt: new Date(),
            });
          }
        }
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