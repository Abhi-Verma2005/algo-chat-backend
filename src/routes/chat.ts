import express, { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { chatRateLimiter } from '@/middleware/rate-limit';
import { 
  createChat, 
  getChat, 
  getUserChats, 
  deleteChat,
  streamChat
} from '../controllers/chat-controller';
import { getChatsByExternalUserId } from '../services/queries';

const router: Router = express.Router();

// Minimal middleware (no verbose logs)
router.use((req: any, res: any, next: any) => next());

// Handle CORS preflight for streaming endpoint
router.options('/stream', (req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// All chat routes require authentication and rate limiting
router.use(authenticateToken);
router.use(chatRateLimiter);

// Post-auth middleware (no logs)
router.use((req: any, res: any, next: any) => next());

// POST /chat/stream - Stream chat with AI (this should be before the general POST route)
router.post('/stream', async (req: any, res: any) => {
  try {
    await streamChat(req, res);
  } catch (error) {
    console.error('❌ [STREAM] Error in streamChat:', error);
    res.status(500).json({ error: 'Internal server error in streamChat' });
  }
});

// POST /chat - Create a new chat
router.post('/', createChat);

// GET /chat - Get all chats for the authenticated user
router.get('/', getUserChats);

// GET /chat/history - Get chat history (alias for GET /chat)
router.get('/history', getUserChats);

// GET /chat/recent - Recent chats (additional alias)
router.get('/recent', getUserChats);

// GET /chat/debug - Debug endpoint to see raw database data
router.get('/debug', async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const chats = await getChatsByExternalUserId({ externalUserId: userId });
    
    res.json({
      success: true,
      message: 'Debug data retrieved',
      data: {
        userId,
        totalChats: chats.length,
        chats: chats.map((chat: any) => ({
          id: chat.id,
          createdAt: chat.createdAt,
          externalUserId: chat.externalUserId,
          userEmail: chat.userEmail,
          messagesType: typeof chat.messages,
          messagesLength: typeof chat.messages === 'string' ? chat.messages.length : 'N/A',
          messagesPreview: typeof chat.messages === 'string' ? chat.messages.substring(0, 100) + '...' : chat.messages
        }))
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ success: false, message: 'Debug failed' });
  }
});

// GET /chat/:id - Get a specific chat (placed after static routes)
router.get('/:id', getChat);

// DELETE /chat/:id - Delete a specific chat
router.delete('/:id', deleteChat);

export default router; 