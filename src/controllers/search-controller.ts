import { Request, Response } from 'express';
import { z } from 'zod';
import { SearchService } from '@/services/search-service';
import { getFilteredQuestions } from '@/services/ai-actions';
import { AuthenticatedRequest } from '@/middleware/auth';

const searchRequestSchema = z.object({
  query: z.string().min(1),
});

export const searchWeb = async (req: Request, res: Response) => {
  try {
    const { query } = searchRequestSchema.parse(req.body);
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query parameter is required'
      });
    }

    const searchService = SearchService.getInstance();
    const results = await searchService.searchWeb(query);

    return res.json(results);
    
  } catch (error) {
    console.error('Search API error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        errors: error.errors
      });
    }
    
    return res.status(500).json({
      error: 'Search failed'
    });
  }
};

// New: search questions with platform/tags/difficulty/slug/url filters
export const searchQuestions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const schema = z.object({
      platform: z.enum(['LEETCODE', 'CODECHEF', 'CODEFORCES']).optional(),
      tags: z.preprocess((v) => (typeof v === 'string' ? v.split(',') : v), z.array(z.string()).optional()),
      difficulty: z.preprocess(
        (v) => (typeof v === 'string' && v.includes(',') ? v.split(',') : v),
        z.union([
          z.enum(['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'VERYHARD']),
          z.array(z.enum(['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'VERYHARD']))
        ]).optional()
      ),
      slug: z.string().optional(),
      url: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      unsolvedOnly: z.coerce.boolean().optional(),
    });

    const {
      platform, tags = [], difficulty, slug, url, limit, unsolvedOnly
    } = schema.parse(req.query);

    const result = await getFilteredQuestions({
      topics: (tags as string[]) ?? [],
      userId,
      limit: limit as number,
      unsolvedOnly: !!unsolvedOnly,
      platform: platform as any,
      difficulty: difficulty as any,
      slug: slug as string | undefined,
      url: url as string | undefined,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('searchQuestions error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Invalid parameters', errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};