import rateLimit from 'express-rate-limit';

export const createRateLimiter = (
  windowMs: number = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: number = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const chatRateLimiter = createRateLimiter(60000, 10); // 10 requests per minute for chat
export const authRateLimiter = createRateLimiter(900000, 5); // 5 requests per 15 minutes for auth
export const generalRateLimiter = createRateLimiter(); 