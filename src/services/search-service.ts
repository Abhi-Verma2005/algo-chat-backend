export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export class SearchService {
  private static instance: SearchService;

  private constructor() {
    // Mock search service for development
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  public async searchWeb(query: string): Promise<SearchResult[]> {
    try {
      // Mock search results for development
      // In production, this would use a real search API
      const mockResults: SearchResult[] = [
        {
          title: `Search results for: ${query}`,
          snippet: `This is a mock search result for "${query}". In production, this would return real search results from a search engine API.`,
          link: 'https://example.com'
        },
        {
          title: `Additional results for: ${query}`,
          snippet: `More mock search results for "${query}". Replace this with actual search API integration.`,
          link: 'https://example.com'
        }
      ];

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return mockResults;
    } catch (error) {
      console.error('Search service error:', error);
      
      // Fallback to basic mock results if search fails
      return [
        {
          title: 'Search temporarily unavailable',
          snippet: 'Please try again later or rephrase your query.',
          link: '#'
        }
      ];
    }
  }
} 