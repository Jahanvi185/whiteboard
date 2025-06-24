#!/bin/bash

echo "🎨 Collaborative Whiteboard Setup Script"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Setup backend
echo ""
echo "📦 Setting up backend..."
cd backend
npm install
echo "✅ Backend dependencies installed"

# Setup frontend
echo ""
echo "🎨 Setting up frontend..."
cd ../frontend/whiteboard-frontend
npm install
echo "✅ Frontend dependencies installed"

# Create .env file if it doesn't exist
cd ../../backend
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cat > .env << EOL
PORT=5000
MONGODB_URI=mongodb://localhost:27017/whiteboard
NODE_ENV=development
EOL
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "1. Start the backend: cd backend && npm run dev"
echo "2. Start the frontend: cd frontend/whiteboard-frontend && npm run dev"
echo ""
echo "The application will be available at:"
echo "- Frontend: http://localhost:5173"
echo "- Backend: http://localhost:5000"
echo ""
echo "Make sure MongoDB is running before starting the backend!"

