# Code Verification System - Backend Implementation

## Overview

Complete backend implementation for AI-powered code verification and question completion tracking system.

## 🏗️ Architecture

### Database Schema

Uses existing tables from `/src/models/algo-schema.ts`:

- **`Submission`** - Stores completed question submissions
- **`questions`** - Contains question metadata and details
- **`User`** - User information and authentication

**Note:** Verification details are logged to console for audit purposes rather than stored in database to avoid requiring new tables.

### API Endpoints

#### 1. **POST /api/verify-solution**

Verifies if submitted code is legitimate (not hardcoded)

**Request Body:**

```json
{
  "questionId": "uuid",
  "questionTitle": "Problem Title",
  "questionText": "Full problem description...",
  "code": "submitted code...",
  "platform": "codechef"
}
```

**Response:**

```json
{
  "success": true,
  "isLegitimate": true,
  "confidence": 0.95,
  "feedback": "Code demonstrates proper algorithmic thinking...",
  "reasonsForDecision": ["Uses appropriate algorithm", "Handles edge cases"],
  "suggestions": ["Consider optimizing time complexity"]
}
```

#### 2. **POST /api/mark-question-done**

Marks question as completed after successful verification

**Request Body:**

```json
{
  "questionId": "uuid",
  "platform": "codechef",
  "code": "verified code...",
  "verificationDetails": {
    "isLegitimate": true,
    "confidence": 0.95,
    "feedback": "...",
    "reasonsForDecision": ["..."],
    "suggestions": ["..."]
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Question marked as completed successfully",
  "submissionId": "uuid",
  "score": 85,
  "verificationDetails": {...}
}
```

#### 3. **GET /api/verification/health**

Health check for verification system

## 🧠 AI Verification Logic

### Verification Criteria

The AI analyzes code based on:

1. **Legitimate Solution Indicators:**

   - Proper algorithmic approach
   - General logic for all inputs
   - Appropriate data structures
   - Edge case handling

2. **Hardcoded Solution Red Flags:**
   - Hardcoded return statements
   - Precomputed answer arrays
   - Specific test case handling
   - No real algorithm implementation

### AI Prompt Structure

```
You are an expert code reviewer tasked with determining if a solution is legitimate or hardcoded.

**Problem Statement:** {questionTitle}
**Full Problem Description:** {questionText}
**Submitted Code:** {code}
**Platform:** {platform}

Analyze and determine:
1. Is this a legitimate algorithmic solution?
2. Key factors: proper algorithm, hardcoded outputs, edge cases, reasonable approach
3. Red flags vs Green flags
```

## 📁 File Structure

```
src/
├── controllers/
│   └── verification-controller.ts    # Main verification logic
├── routes/
│   └── verification.ts              # API route definitions
├── models/
│   └── algo-schema.ts               # Database schema (updated)
└── services/
    └── ai-service.ts                # Gemini AI model configuration
```

## 🔧 Key Features

### 1. **AI-Powered Code Analysis**

- Uses Google Gemini 2.0 Flash model
- Structured response with confidence scoring
- Detailed feedback and suggestions

### 2. **Secure Authentication**

- All endpoints require valid JWT tokens
- User context passed through middleware
- User-specific submissions tracking

### 3. **Comprehensive Logging**

- Request/response logging for debugging
- Verification result tracking
- User activity monitoring

### 4. **Database Integration**

- Automatic submission record creation
- Score calculation based on difficulty/confidence
- Verification audit logging to console

### 5. **Error Handling**

- Comprehensive try-catch blocks
- Meaningful error messages
- Graceful failure handling

## 🚀 Deployment Notes

### Environment Variables Required:

```bash
EXTERNAL_DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key
```

### Database Requirements

No new tables required. Uses existing `Submission`, `questions`, and `User` tables from the external database.

## 🔄 Integration with Frontend

The backend integrates seamlessly with the Chrome extension frontend:

1. **Frontend detects successful CodeChef submission**
2. **Extracts code and problem text from DOM**
3. **Calls /api/verify-solution for AI analysis**
4. **If legitimate, calls /api/mark-question-done**
5. **User receives success/failure feedback in chat**

## 📊 Monitoring & Analytics

The system logs:

- Verification requests and results
- Success/failure rates
- User completion patterns
- AI confidence scores
- Platform-specific metrics

## 🔐 Security Considerations

1. **Authentication Required:** All endpoints protected
2. **Input Validation:** Comprehensive request validation
3. **SQL Injection Prevention:** Using Drizzle ORM parameterized queries
4. **Rate Limiting:** Can be added via middleware
5. **Code Storage:** Stores code securely for audit purposes

## 🧪 Testing

### Health Check Endpoint

```bash
GET /api/verification/health
Authorization: Bearer <token>
```

### Manual Testing

Use the frontend Chrome extension or test with curl:

```bash
curl -X POST http://localhost:3001/api/verify-solution \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "questionId": "test-id",
    "questionTitle": "Test Problem",
    "questionText": "Problem description...",
    "code": "def solution(): return 42",
    "platform": "codechef"
  }'
```

## 📈 Future Enhancements

1. **Multiple AI Models:** Support for different AI providers
2. **Code Similarity Detection:** Check against known solutions
3. **Performance Analytics:** Track user improvement over time
4. **Batch Verification:** Process multiple submissions
5. **Custom Scoring:** Platform-specific scoring algorithms
