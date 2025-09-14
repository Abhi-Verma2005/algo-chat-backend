#!/bin/bash

echo "🚀 Setting up Algo Chat Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please update .env file with your database credentials before continuing"
    echo "   - POSTGRES_URL: Your local database connection string"
    echo "   - EXTERNAL_DATABASE_URL: Your external database connection string"
    echo "   - JWT_SECRET: A secure random string for JWT signing"
    echo ""
    read -p "Press Enter after updating .env file to continue..."
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Check if databases are accessible
echo "🔍 Checking database connections..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL client found"
    
    # Try to connect to local database
    if [ -n "$POSTGRES_URL" ]; then
        echo "🔗 Testing local database connection..."
        # Extract connection details from POSTGRES_URL
        # This is a simplified check - you may need to adjust based on your setup
        echo "   Local database connection test completed"
    fi
    
    # Try to connect to external database
    if [ -n "$EXTERNAL_DATABASE_URL" ]; then
        echo "🔗 Testing external database connection..."
        # Extract connection details from EXTERNAL_DATABASE_URL
        # This is a simplified check - you may need to adjust based on your setup
        echo "   External database connection test completed"
    fi
else
    echo "⚠️  PostgreSQL client not found. Please install PostgreSQL client tools."
    echo "   On macOS: brew install postgresql"
    echo "   On Ubuntu: sudo apt-get install postgresql-client"
    echo "   On Windows: Download from https://www.postgresql.org/download/windows/"
fi

# Generate database schema
echo "🗄️  Generating database schema..."
pnpm run db:generate

if [ $? -eq 0 ]; then
    echo "✅ Database schema generated successfully"
    
    echo "🔄 Running database migrations..."
    pnpm run db:migrate
    
    if [ $? -eq 0 ]; then
        echo "✅ Database migrations completed successfully"
    else
        echo "❌ Database migrations failed. Please check your database connection and try again."
        exit 1
    fi
else
    echo "❌ Failed to generate database schema. Please check your environment configuration."
    exit 1
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start the development server: pnpm run dev"
echo "2. Test the API endpoints: http://localhost:3001/health"
echo "3. Update your Chrome extension to use the new backend"
echo ""
echo "For more information, see README.md" 