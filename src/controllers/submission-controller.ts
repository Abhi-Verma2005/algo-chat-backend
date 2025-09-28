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
    const { questionSlug: rawSlug, questionUrl, code, language, problemTitle, submissionStatus, platform } = req.body;
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

    // Validate and normalize language for CodeChef/LeetCode
    const normalizeLanguage = (lang: string, detectedPlatform?: string): string => {
      const l = lang.toLowerCase().trim();
      
      // Common language mappings for CodeChef
      const languageMap: { [key: string]: string } = {
        'c++': 'cpp',
        'c++14': 'cpp',
        'c++17': 'cpp',
        'c++20': 'cpp',
        'cpp': 'cpp',
        'python': 'python',
        'python3': 'python',
        'py': 'python',
        'java': 'java',
        'javascript': 'javascript',
        'js': 'javascript',
        'c': 'c',
        'go': 'go',
        'rust': 'rust',
        'kotlin': 'kotlin',
        'scala': 'scala',
        'php': 'php',
        'ruby': 'ruby',
        'swift': 'swift',
        'dart': 'dart',
        'haskell': 'haskell',
        'r': 'r',
        'mysql': 'mysql',
        'postgresql': 'postgresql',
        'bash': 'bash'
      };
      
      return languageMap[l] || l;
    };

    // Detect platform from URL if not explicitly provided
    let detectedPlatform = platform?.toLowerCase();
    if (!detectedPlatform && questionUrl) {
      if (questionUrl.includes('leetcode.com')) {
        detectedPlatform = 'leetcode';
      } else if (questionUrl.includes('codechef.com')) {
        detectedPlatform = 'codechef';
      }
    }

    const normalizedLanguage = normalizeLanguage(language, detectedPlatform);

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
      language: normalizedLanguage,
      problemTitle: finalTitle,
      submissionStatus: submissionStatus || 'accepted',
    });

    console.log(`✅ [SUBMISSION] Saved code submission for ${detectedPlatform || 'unknown'} problem: ${questionSlug}, language: ${normalizedLanguage}`);

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

export const createCodeChefSubmission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      questionSlug: rawSlug, 
      questionUrl, 
      code, 
      language, 
      problemTitle, 
      submissionStatus = 'accepted',
      contestCode,
      problemCode 
    } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    // Enhanced validation for CodeChef
    if (!code || !language) {
      res.status(400).json({ 
        success: false, 
        message: 'Code and language are required for CodeChef submission' 
      });
      return;
    }

    // Resolve slug for CodeChef
    let questionSlug = (rawSlug || problemCode || '').toString().trim().toLowerCase();
    
    if (!questionSlug && questionUrl) {
      try {
        const url = new URL(questionUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // CodeChef URL patterns: /problems/PROBLEMCODE or /contests/CONTEST/problems/PROBLEMCODE
        const problemIdx = pathParts.indexOf('problems');
        if (problemIdx >= 0 && pathParts[problemIdx + 1]) {
          questionSlug = pathParts[problemIdx + 1].toLowerCase();
        }
      } catch (err) {
        console.error('Failed to parse CodeChef URL:', err);
      }
    }

    if (!questionSlug) {
      res.status(400).json({ 
        success: false, 
        message: 'Question slug, problem code, or valid CodeChef URL is required' 
      });
      return;
    }

    // CodeChef specific language normalization
    const normalizeCodeChefLanguage = (lang: string): string => {
      const l = lang.toLowerCase().trim();
      const codeChefLanguages: { [key: string]: string } = {
        'c++': 'cpp',
        'c++14': 'cpp14',
        'c++17': 'cpp17',
        'c++20': 'cpp20',
        'cpp': 'cpp',
        'python': 'python3',
        'python3': 'python3',
        'py': 'python3',
        'java': 'java',
        'c': 'c',
        'javascript': 'javascript',
        'js': 'javascript',
        'kotlin': 'kotlin',
        'go': 'go',
        'rust': 'rust',
        'scala': 'scala',
        'php': 'php',
        'ruby': 'ruby',
        'haskell': 'haskell',
        'perl': 'perl',
        'bash': 'bash'
      };
      
      return codeChefLanguages[l] || l;
    };

    const normalizedLanguage = normalizeCodeChefLanguage(language);

    // Build enhanced problem title
    let finalTitle = problemTitle;
    if (!finalTitle) {
      finalTitle = questionSlug.toUpperCase();
      if (contestCode) {
        finalTitle = `${contestCode.toUpperCase()} - ${finalTitle}`;
      }
    }

    const submission = await saveCodeSubmission({
      externalUserId: userId,
      questionSlug,
      code,
      language: normalizedLanguage,
      problemTitle: finalTitle,
      submissionStatus: submissionStatus || 'accepted',
    });

    console.log(`✅ [CODECHEF] Saved submission for problem: ${questionSlug}, language: ${normalizedLanguage}, contest: ${contestCode || 'practice'}`);

    // Try to mirror to external Submission table
    try {
      const found = await externalDb
        .select()
        .from(questions)
        .where(eq(questions.slug, questionSlug));
      const q = found?.[0];

      if (q?.id) {
        const existing = await externalDb
          .select()
          .from(Submission)
          .where(and(eq(Submission.userId, userId), eq(Submission.questionId, q.id)));
        const hasAccepted = existing?.some((s: any) => s.status === 'ACCEPTED');
        
        if (!hasAccepted && submissionStatus.toLowerCase().includes('accept')) {
          await externalDb.insert(Submission).values({
            userId,
            questionId: q.id,
            status: 'ACCEPTED',
            score: 0,
            createdAt: new Date(),
          });
          console.log(`✅ [CODECHEF] Mirrored accepted submission to external DB for question: ${questionSlug}`);
        }
      }
    } catch (mirrorErr) {
      console.error('Failed to mirror CodeChef submission to external DB:', mirrorErr);
      // non-blocking
    }

    res.json({
      success: true,
      message: 'CodeChef submission created successfully',
      data: { 
        submission,
        platform: 'codechef',
        normalizedLanguage,
        questionSlug
      }
    });

  } catch (error) {
    console.error('Create CodeChef submission error:', error);
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

export const getSubmissionsByPlatform = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { platform } = req.params; // 'codechef' or 'leetcode'
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    const allSubmissions = await getCodeSubmissionsByUser({ externalUserId: userId });
    
    // Filter by platform based on URL patterns or explicit platform detection
    const platformSubmissions = allSubmissions.filter((submission: any) => {
      const title = submission.problemTitle || '';
      const slug = submission.questionSlug || '';
      
      if (platform.toLowerCase() === 'codechef') {
        // CodeChef problems often have uppercase slugs or contest prefixes
        return slug.match(/^[A-Z0-9_]+$/) || title.includes('COOK') || title.includes('LTIME') || title.includes('START');
      } else if (platform.toLowerCase() === 'leetcode') {
        // LeetCode problems typically have lowercase slugs with hyphens
        return slug.includes('-') || title.match(/^\d+\./);
      }
      
      return false;
    });

    res.json({
      success: true,
      message: `${platform} submissions retrieved successfully`,
      data: { 
        submissions: platformSubmissions,
        platform,
        count: platformSubmissions.length
      }
    });

  } catch (error) {
    console.error(`Get ${req.params.platform} submissions error:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}; 