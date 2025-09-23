import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

// Globally suppress noisy logs unless explicitly enabled
if (process.env.VERBOSE_LOGS !== 'true') {
  const noop = (..._args: any[]) => {};
  // @ts-ignore
  console.log = noop;
  // @ts-ignore
  console.info = noop;
  // @ts-ignore
  console.warn = noop;
}

import express, { Router } from 'express';
import net from 'net';
import cors from 'cors';
import { corsMiddleware } from '@/middleware/cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import submissionRoutes from './routes/submissions';
import searchRoutes from './routes/search';



const app = express();
const START_PORT: number = parseInt(process.env.PORT || '3001', 10);

// Centralized CORS configuration
app.use(corsMiddleware);

// Other middleware after CORS
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Optionally enable verbose server logs by env flag
if (process.env.VERBOSE_LOGS === 'true') {
  app.use((req: any, res: any, next: any) => {
    console.log('🌐 [SERVER] Incoming request:', req.method, req.url);
    console.log('📝 [SERVER] Request headers:', req.headers);
    console.log('📝 [SERVER] Request body:', req.body);
    console.log('📝 [SERVER] Request query:', req.query);
    console.log('📝 [SERVER] Request params:', req.params);
    console.log('---');
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Algo Chat Backend is running'
  });
});

// Version endpoint
app.get('/version', (req, res) => {
  res.json({
    name: 'algo-chat-backend',
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    env: process.env.NODE_ENV || 'development'
  });
});

// Test CORS endpoint
app.get('/api/test-cors', (req: any, res: any) => {
  // Add CORS headers explicitly
  (res as any).setHeader('Access-Control-Allow-Origin', '*');
  (res as any).setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  (res as any).setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  (res as any).setHeader('Access-Control-Allow-Credentials', 'true');
  
  res.json({ 
    message: 'CORS is working!',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin
  });
});

// Test AI tools endpoint
app.get('/api/test-tools', async (req: any, res: any) => {
  
  try {
    // Test basic database connectivity
    const { getTags } = await import('./services/ai-actions');
    const tags = await getTags();
    
    res.json({ 
      message: 'AI tools are working!',
      timestamp: new Date().toISOString(),
      databaseConnection: 'OK',
      availableTags: tags.length,
      sampleTags: tags.slice(0, 5)
    });
  } catch (error) {
    console.error('❌ [TEST] AI tools test failed:', error);
    res.status(500).json({ 
      message: 'AI tools test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test specific tool endpoint
app.get('/api/test-tool/:toolName', async (req: any, res: any) => {
  const { toolName } = req.params;
  
  try {
    let result;
    
    switch (toolName) {
      case 'getTags':
        const { getTags } = await import('./services/ai-actions');
        result = await getTags();
        break;
      case 'getUserProgress':
        const { getUserProgress } = await import('./services/ai-actions');
        result = await getUserProgress('test-user-123', { timeRange: 'all' });
        break;
      case 'getFilteredQuestions':
        const { getFilteredQuestions } = await import('./services/ai-actions');
        result = await getFilteredQuestions({ 
          topics: ['ARRAYS'], 
          userId: 'test-user-123', 
          limit: 5 
        });
        break;
      default:
        return res.status(400).json({ error: 'Unknown tool name' });
    }
    
    res.json({ 
      toolName,
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ [TEST] Tool ${toolName} test failed:`, error);
    res.status(500).json({ 
      toolName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/search', searchRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ [SERVER] Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

async function getAvailablePort(start: number, maxTries = 20): Promise<number> {
  let port = start;
  for (let i = 0; i < maxTries; i++) {
    const isFree = await new Promise<boolean>((resolve) => {
      const tester = net.createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
          tester.close(() => resolve(true));
        })
        .listen(port);
    });
    if (isFree) return port;
    port += 1;
  }
  return start; // fallback to start if none found
}

(async () => {
  const port = await getAvailablePort(START_PORT);
  const server = app.listen(port, () => {
    console.info(`Server listening on port ${port}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.info('Shutting down server...');
    server.close(() => {
      console.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();