# Algo Chat Backend

This is the backend API for the Algo Chat application, providing authentication, chat management, and code submission functionality for the Chrome extension.

## Features

- **Dual Database Setup**: Local database for chat/submissions, external database for user authentication
- **JWT Authentication**: Secure token-based authentication for the Chrome extension
- **Chat Management**: Create, read, and delete chat conversations
- **Code Submissions**: Store and retrieve user code submissions
- **External User Integration**: Authenticate users from external database system

## Database Architecture

### Local Database (PostgreSQL)
- **Chat Table**: Stores chat conversations and messages
- **CodeSubmissions Table**: Stores user code submissions

### External Database (PostgreSQL)
- **User Table**: User authentication and profile data
- **Questions Table**: DSA questions and metadata
- **Submissions Table**: Contest submissions and scores
- **Groups & Contests**: Group management and contest data

## Setup Instructions

### 1. Environment Configuration

Copy the environment example file and configure your database connections:

```bash
cp env.example .env
```

Update the `.env` file with your database credentials:

```env
# Database Configuration
POSTGRES_URL=postgresql://username:password@localhost:5432/algo_chat_local
EXTERNAL_DATABASE_URL=postgresql://username:password@localhost:5432/algo_chat_external

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,chrome-extension://*
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Database Setup

#### Generate Database Schema
```bash
pnpm run db:generate
```

#### Run Migrations
```bash
pnpm run db:migrate
```

#### View Database (Optional)
```bash
pnpm run db:studio
```

### 4. Start Development Server

```bash
pnpm run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `GET /auth/verify` - Verify JWT token
- `POST /auth/refresh` - Refresh JWT token

### Chat Management
- `POST /chat` - Create a new chat
- `GET /chat/:id` - Get a specific chat
- `GET /chat` - Get all chats for authenticated user
- `DELETE /chat/:id` - Delete a specific chat

### Code Submissions
- `POST /submissions` - Create a new code submission
- `GET /submissions` - Get all submissions for authenticated user
- `GET /submissions/:id` - Get a specific submission

## Authentication Flow

1. **Login**: User provides email/password to `/auth/login`
2. **Token Generation**: Backend validates against external database and returns JWT token
3. **Token Usage**: Extension includes token in `Authorization: Bearer <token>` header
4. **Token Verification**: Backend verifies token on protected endpoints
5. **Token Refresh**: Extension can refresh expired tokens via `/auth/refresh`

## Database Schema

### Local Database Tables

```sql
-- Chat table for storing conversations
CREATE TABLE "Chat" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamp NOT NULL,
  "messages" json NOT NULL,
  "external_user_id" varchar(255) NOT NULL,
  "user_email" varchar(255)
);

-- Code submissions table
CREATE TABLE "CodeSubmissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "external_user_id" varchar(255) NOT NULL,
  "question_slug" varchar(255) NOT NULL,
  "code" text NOT NULL,
  "language" varchar(50) NOT NULL DEFAULT 'python',
  "problem_title" varchar(500),
  "submission_status" varchar(50) NOT NULL DEFAULT 'accepted',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
```

### External Database Tables

The external database contains comprehensive DSA platform data including:
- Users and authentication
- Questions and difficulty levels
- Contest management
- Group organization
- Submission tracking

## Development

### Project Structure
```
src/
├── controllers/     # Request handlers
├── middleware/      # Authentication and validation
├── models/         # Database schemas
├── routes/         # API route definitions
├── services/       # Business logic and database queries
├── lib/           # Database connections and utilities
└── index.ts       # Main application entry point
```

### Adding New Features

1. **Create Schema**: Add new tables to `models/schema.ts`
2. **Add Queries**: Implement database operations in `services/queries.ts`
3. **Create Controller**: Add business logic in `controllers/`
4. **Define Routes**: Add API endpoints in `routes/`
5. **Update Migration**: Run `pnpm run db:generate` to create migration files

### Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test --coverage
```

## Deployment

### Production Environment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure production database URLs
4. Set appropriate CORS origins
5. Use environment-specific configuration

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**: Check database URLs and credentials in `.env`
2. **Migration Failures**: Ensure database exists and user has proper permissions
3. **JWT Errors**: Verify `JWT_SECRET` is set and consistent
4. **CORS Issues**: Check `ALLOWED_ORIGINS` configuration

### Logs

The application logs important events to console:
- Database connection status
- Authentication attempts
- API request/response details
- Error stack traces

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include input validation
4. Write tests for new features
5. Update documentation

## License

This project is licensed under the MIT License. 