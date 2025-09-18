import { Request, Response } from 'express';
declare const crypto: any;
import { z } from 'zod';
import { convertToCoreMessages, streamText, Message } from "ai";
import { AuthenticatedRequest } from '../middleware/auth';
import { geminiProModel } from '@/services/ai-service';
import { 
  getUserProgress, 
  getRecentActivity, 
  getFilteredQuestions, 
  getTags, 
  getUserContextForPrompt 
} from '@/services/ai-actions';
import { 
  saveChat, 
  getChatById, 
  getChatsByExternalUserId, 
  deleteChatById,
  getCodeSubmissionsByUser
} from '../services/queries';
import { SearchService, SearchResult } from '@/services/search-service';

const chatRequestSchema = z.object({
  id: z.string(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    // id is optional since useChat doesn't always send it
    id: z.string().optional(),
  })),
});

export const streamChat = async (req: AuthenticatedRequest, res: Response) => {
  // Add CORS headers explicitly like algo-chat does
  (res as any).setHeader('Access-Control-Allow-Origin', '*');
  (res as any).setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  (res as any).setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  (res as any).setHeader('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { id, messages } = chatRequestSchema.parse(req.body);

    const coreMessages = convertToCoreMessages(messages).filter(
      (message) => message.content.length > 0,
    );

  // Dynamic system prompt (focused, tool-aware, efficient)
  const systemPrompt = `
You are Odin — a concise, supportive DSA coach. Your goal is to help users build problem‑solving skills through hints, pattern recognition, and targeted practice, not to dump full solutions.

Core Principles
- Encourage progress, be realistic about difficulty, and keep responses tight.
- Teach with progressive hints: idea → outline → small nudge. Avoid full code unless explicitly asked.
- Personalize using available data (progress, tags, prior submissions). Reuse prior tool results when possible.

Tool Use Policy
- Call a tool only when you need fresh data to answer. If you already have the data from a previous call in this session, reuse it and do not call again.
- Never call the same tool twice in one turn unless the inputs changed materially.
- When recommending problems, include title • difficulty • key tags • leetcodeUrl, and explain why it fits the user.

When To Use Each Tool
- getUserProgressOverview: Compare levels, difficulty mix, or streak; decide what to focus on.
- getFilteredQuestionsToSolve: Recommend problems given topics (SCREAMING_SNAKE_CASE). Prefer unsolved items.
- getUserSubmissionForProblem: Reference the user’s last attempt before giving guidance on that slug.
- getRecentActivity: Summarize what happened lately to adjust advice.
- getAvailableTags: Offer discoverable topics or help map user phrasing to tags.
- getUserContext: Tailor tone, topic focus, and pacing.
- searchWeb: Use for time‑sensitive or external info; summarize with URLs.

Response Style
- Default to short, structured answers. Ask at most one clarifying question only if it blocks progress.
- For coaching: state the core idea, give a small hint, and propose the next micro‑step.
- For recommendations: list 3–5 items max with rationale and links.

Constraints
- Do not reveal final solutions unless the user explicitly asks.
- Cite the LeetCode link when discussing a problem.

Today’s date: ${new Date().toLocaleDateString()}
`;

  // Small helper to access authenticated user
  const getUser = () => (req as AuthenticatedRequest).user;

    const result = await streamText({
      model: geminiProModel,
      system: systemPrompt,
      messages: coreMessages.slice(-10),
      maxSteps: 5, // Limit tool calls to prevent infinite loops

      tools: {
        getUserProgressOverview: {
          description: "Get comprehensive overview of user's DSA learning progress including total problems solved, difficulty breakdown, and overall statistics",
          parameters: z.object({
            includeStats: z.boolean().default(true).describe("Include detailed statistics"),
            timeRange: z.enum(["week", "month", "all"]).default("all").describe("Time range for progress data")
          }),
          execute: async ({ timeRange }) => {
            // Get the authenticated user from the request
            const userId = getUser()?.userId;
            if (!userId) {
              console.error('❌ [TOOL] No authenticated user found');
              return { error: 'User not authenticated' };
            }
            
            try {
              const progress = await getUserProgress(userId, { timeRange });
              return progress;
            } catch (error) {
              console.error('❌ [TOOL] getUserProgressOverview error:', error);
              return { 
                error: 'Failed to fetch user progress',
                details: error instanceof Error ? error.message : 'Unknown error'
              };
            }
          },
        },
        getFilteredQuestionsToSolve: {
          description: "Fetch a curated list of DSA questions by passing SCREAMING_SNAKE_CASE topic name based on selected topics and difficulty levels, along with user-specific metadata like solved/bookmarked status.",
          parameters: z.object({
            topics: z.array(z.string()).min(1).describe("List of topic tags to filter questions by"),
            limit: z.number().min(1).max(100).default(50).describe("Maximum number of questions to fetch (default 50)"),
            unsolvedOnly: z.boolean().optional().describe("If true, only return unsolved questions for the user")
          }),
          execute: async ({ topics, limit, unsolvedOnly }) => {
            // Get the authenticated user from the request
            const userId = getUser()?.userId;
            if (!userId) {
              console.error('❌ [TOOL] No authenticated user found');
              return { error: 'User not authenticated' };
            }
            
            try {
              console.log('🔧 [TOOL] getFilteredQuestionsToSolve called', {
                userId,
                topics,
                limit,
                unsolvedOnly
              });
              const startTime = Date.now();
              const response = await getFilteredQuestions({ topics, userId, limit, unsolvedOnly });
              const durationMs = Date.now() - startTime;
              console.log('✅ [TOOL] getFilteredQuestionsToSolve result', {
                durationMs,
                hasResponse: !!response,
                questionsCount: Array.isArray((response as any)?.questionsWithSolvedStatus)
                  ? (response as any).questionsWithSolvedStatus.length
                  : (Array.isArray((response as any)?.questions) ? (response as any).questions.length : undefined),
                sample: (response as any)?.questionsWithSolvedStatus?.[0] || (response as any)?.questions?.[0] || null
              });
              return response;
            } catch (error) {
              console.error('❌ [TOOL] getFilteredQuestionsToSolve error:', error);
              return { 
                error: 'Failed to fetch filtered questions',
                details: error instanceof Error ? error.message : 'Unknown error'
              };
            }
          }
        },
        getUserSubmissionForProblem: {
          description: "Get the user's latest code submission for a specific problem/question",
          parameters: z.object({
            questionSlug: z.string().describe("The slug/identifier of the problem (e.g., 'two-sum', 'binary-search')"),
            includeMetadata: z.boolean().default(true).describe("Include submission metadata like language, timestamp, etc.")
          }),
          execute: async ({ questionSlug, includeMetadata }) => {
            // Get the authenticated user from the request
            const userId = getUser()?.userId;
            if (!userId) {
              console.error('❌ [TOOL] No authenticated user found');
              return { error: 'User not authenticated' };
            }
            
            try {
              // Get the user's submission for this specific problem
              const submissions = await getCodeSubmissionsByUser({ externalUserId: userId });
              
              const problemSubmission = submissions.find((sub: any) => sub.questionSlug === questionSlug);
              
              if (!problemSubmission) {
                return {
                  found: false,
                  message: `No submission found for problem: ${questionSlug}`
                };
              }

              const result: any = {
                found: true,
                questionSlug,
                code: problemSubmission.code,
                language: problemSubmission.language,
                submissionStatus: problemSubmission.submissionStatus,
              };

              if (includeMetadata) {
                result.problemTitle = problemSubmission.problemTitle;
                result.createdAt = problemSubmission.createdAt;
                result.updatedAt = problemSubmission.updatedAt;
                result.submissionId = problemSubmission.id;
              }

              return result;
            } catch (error) {
              console.error('❌ [TOOL] getUserSubmissionForProblem error:', error);
              return { error: 'Failed to fetch user submission' };
            }
          },
        },
        getRecentActivity: {
          description: "Get user's recent DSA learning activity including recently solved problems, study sessions, and learning milestones",
          parameters: z.object({
            limit: z.number().min(1).max(50).default(10).describe("Number of recent activities to return"),
            includeDetails: z.boolean().default(false).describe("Include detailed information about each activity")
          }),
          execute: async ({ limit, includeDetails }) => {
            // Get the authenticated user from the request
            const userId = getUser()?.userId;
            if (!userId) {
              console.error('❌ [TOOL] No authenticated user found');
              return { error: 'User not authenticated' };
            }
            
            try {
              const activity = await getRecentActivity(userId);
              return activity;
            } catch (error) {
              console.error('❌ [TOOL] getRecentActivity error:', error);
              return { error: 'Failed to fetch recent activity' };
            }
          },
        },
        getAvailableTags: {
          description: "Get available DSA topic tags and categories for filtering questions and organizing learning",
          parameters: z.object({
            includeCounts: z.boolean().default(false).describe("Include count of questions available for each tag"),
            category: z.string().optional().describe("Filter tags by specific category (e.g., 'data-structures', 'algorithms')")
          }),
          execute: async ({ includeCounts, category }) => {
            try {
              const tags = await getTags();
              return tags;
            } catch (error) {
              console.error('❌ [TOOL] getAvailableTags error:', error);
              return { error: 'Failed to fetch available tags' };
            }
          },
        },
        getUserContext: {
          description: "Get comprehensive user context including learning preferences, current focus areas, and personalized insights for creating tailored learning experiences",
          parameters: z.object({
            includeProgress: z.boolean().default(true).describe("Include current learning progress"),
            includePreferences: z.boolean().default(true).describe("Include user learning preferences"),
            includeWeakAreas: z.boolean().default(true).describe("Include identified weak areas")
          }),
          execute: async ({ includeProgress, includePreferences, includeWeakAreas }) => {
            // Get the authenticated user from the request
            const userId = getUser()?.userId;
            if (!userId) {
              console.error('❌ [TOOL] No authenticated user found');
              return { error: 'User not authenticated' };
            }
            
            try {
              const context = await getUserContextForPrompt(userId);
              return context;
            } catch (error) {
              console.error('❌ [TOOL] getUserContext error:', error);
              return { 
                error: 'Failed to fetch user context',
                details: error instanceof Error ? error.message : 'Unknown error'
              };
            }
          },
        },
        searchWeb: {
          description: "Search the web for current information, latest news, or real-time data that might not be in the AI's training data",
          parameters: z.object({
            query: z.string().describe("Search query to look up on the web")
          }),
          execute: async ({ query }) => {
            try {
              const searchService = SearchService.getInstance();
              const results = await searchService.searchWeb(query);
              
              if (results.length === 0) {
                return {
                  message: `No search results found for: ${query}`,
                  results: []
                };
              }

              return {
                message: `Found ${results.length} search results for: ${query}`,
                results: results.map((result: SearchResult, index: number) => ({
                  rank: index + 1,
                  title: result.title,
                  snippet: result.snippet,
                  url: result.link
                }))
              };
            } catch (error) {
              console.error('❌ [TOOL] searchWeb error:', error);
              return {
                message: `Unable to search for: ${query}. Please try a different search term.`,
                results: []
              };
            }
          },
        },
      },
      onFinish: async ({ responseMessages }) => {
        // Save chat to database like algo-chat does
        if (getUser()?.userId) {
          try {
            await saveChat({
              id,
              messages: [...coreMessages, ...responseMessages],
              externalUserId: getUser()!.userId,
              userEmail: getUser()!.email,
            });
          } catch (error) {
            console.error('❌ [CHAT] Failed to save chat to database:', error);
          }
        }
      },
    });

    // Return the streaming response directly like algo-chat does
    const streamResponse = result.toDataStreamResponse();

    // Convert the streaming response to Express response
    // This is the key difference from algo-chat - we need to handle Express response
    if (streamResponse.body) {
      
      // Set proper headers for streaming
      (res as any).setHeader('Content-Type', 'text/plain; charset=utf-8');
      (res as any).setHeader('Cache-Control', 'no-cache');
      (res as any).setHeader('Connection', 'keep-alive');
      
      // Pipe the stream to the response
      streamResponse.body.pipeTo(new WritableStream({
        write(chunk) {
          (res as any).write(chunk);
        },
        close() {
          (res as any).end();
        }
      })).catch(error => {
        console.error('❌ [STREAM] Stream pipe error:', error);
        (res as any).end();
      });
      
    } else {
      console.error('❌ [STREAM] No stream body available');
      res.status(500).json({ error: 'Failed to create stream' });
    }
  } catch (error) {
    console.error('❌ [CHAT] Chat stream error:', error);
    console.error('❌ [CHAT] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messages, chatId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ 
        success: false, 
        message: 'Messages array is required' 
      });
      return;
    }

    await saveChat({
      id: chatId || crypto.randomUUID(),
      messages,
      externalUserId: userId,
      userEmail: req.user?.email,
    });

    // Create the chat object for response
    const createdChat = {
      id: chatId || crypto.randomUUID(),
      messages,
      externalUserId: userId,
      userEmail: req.user?.email,
      createdAt: new Date()
    };

    res.json({
      success: true,
      message: 'Chat created successfully',
      data: { chat: createdChat }
    });

  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

export const getChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const chat = await getChatById({ id });

    if (!chat) {
      res.status(404).json({ 
        success: false, 
        message: 'Chat not found' 
      });
      return;
    }

    // Ensure user can only access their own chats
    if (chat.externalUserId !== userId) {
      res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
      return;
    }

    // Parse messages from JSON string to array
    let parsedMessages;
    try {
      if (typeof chat.messages === 'string') {
        parsedMessages = JSON.parse(chat.messages);
      } else {
        parsedMessages = chat.messages;
      }
    } catch (parseError) {
      console.error('Failed to parse messages for chat:', chat.id, parseError);
      console.error('Raw messages content:', chat.messages);
      parsedMessages = [];
    }

    const parsedChat = {
      ...chat,
      messages: parsedMessages,
      createdAt: chat.createdAt?.toISOString() || new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Chat retrieved successfully',
      data: { chat: parsedChat }
    });

  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

export const getUserChats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    const chats = await getChatsByExternalUserId({ externalUserId: userId });

    // Parse messages from JSON string to array
    const parsedChats = chats.map(chat => {
      try {
        let parsedMessages;
        if (typeof chat.messages === 'string') {
          parsedMessages = JSON.parse(chat.messages);
        } else {
          parsedMessages = chat.messages;
        }

        return {
          ...chat,
          messages: parsedMessages,
          createdAt: chat.createdAt?.toISOString() || new Date().toISOString()
        };
      } catch (parseError) {
        console.error('Failed to parse messages for chat:', chat.id, parseError);
        console.error('Raw messages content for chat:', chat.id, chat.messages);
        // Return chat with empty messages array if parsing fails
        return {
          ...chat,
          messages: [],
          createdAt: chat.createdAt?.toISOString() || new Date().toISOString()
        };
      }
    });

    res.json({
      success: true,
      message: 'Chats retrieved successfully',
      data: { chats: parsedChats }
    });

  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

export const deleteChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const chat = await getChatById({ id });

    if (!chat) {
      res.status(404).json({ 
        success: false, 
        message: 'Chat not found' 
      });
      return;
    }

    // Ensure user can only delete their own chats
    if (chat.externalUserId !== userId) {
      res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
      return;
    }

    await deleteChatById({ id });

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });

  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}; 