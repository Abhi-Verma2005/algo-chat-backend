import { Request, Response } from 'express';
import { z } from 'zod';
import { SearchService } from '@/services/search-service';

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