# Collaborative Whiteboard Application

A real-time collaborative whiteboard application built with React.js, Node.js/Express, and MongoDB. This application allows multiple users to draw, write, and interact simultaneously on a shared canvas, replicating the experience of a physical whiteboard on the web.

## Features

### Core Features
- **Real-Time Collaboration**: Multiple users can draw simultaneously with instant synchronization
- **Drawing Tools**: Comprehensive set of drawing tools including pen, shapes, text, and eraser
- **Color Picker**: Full color palette for customizing drawing colors
- **Brush Size Control**: Adjustable brush sizes from 1px to 20px
- **Room Management**: Create public or private rooms with unique room IDs
- **User Presence**: See who's currently active in the room
- **Canvas Management**: Undo/Redo actions and clear canvas functionality
- **Export Functionality**: Save the whiteboard as PNG image
- **Responsive Design**: Works on both desktop and mobile devices

### Technical Features
- **WebSocket Communication**: Real-time updates using Socket.io
- **MongoDB Integration**: Persistent storage for rooms and drawings
- **RESTful API**: Clean API endpoints for room management
- **Modern UI**: Built with Tailwind CSS and shadcn/ui components
- **Cross-Origin Support**: CORS enabled for frontend-backend communication

## Tech Stack

### Frontend
- **React.js**: Modern JavaScript library for building user interfaces
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality React components
- **Socket.io Client**: Real-time bidirectional event-based communication
- **Lucide Icons**: Beautiful and consistent icon set

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Fast, unopinionated web framework
- **Socket.io**: Real-time communication library
- **MongoDB**: NoSQL database for data persistence
- **CORS**: Cross-Origin Resource Sharing middleware
- **UUID**: Unique identifier generation

## Project Structure

```
whiteboard-app/
├── backend/
│   ├── node_modules/
│   ├── .env
│   ├── package.json
│   └── server.js
├── frontend/
│   └── whiteboard-frontend/
│       ├── dist/
│       ├── node_modules/
│       ├── public/
│       ├── src/
│       │   ├── assets/
│       │   ├── components/
│       │   │   └── ui/
│       │   ├── App.css
│       │   ├── App.jsx
│       │   ├── index.css
│       │   └── main.jsx
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
└── README.md
```

## Installation and Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm
- MongoDB (local installation or MongoDB Atlas)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd whiteboard-app/backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file with the following variables:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/whiteboard
NODE_ENV=development
```

4. Start the backend server:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The backend server will start on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd whiteboard-app/frontend/whiteboard-frontend
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm run dev --host
```

The frontend application will be available at `http://localhost:5173`

### Production Build

To create a production build of the frontend:
```bash
cd whiteboard-app/frontend/whiteboard-frontend
pnpm run build
```

The built files will be in the `dist/` directory.

## Usage

### Creating a Room

1. Open the application in your web browser
2. Enter your name in the "Create New Room" section
3. Click "Create Room"
4. You'll be automatically joined to the new room
5. Share the Room ID with others to invite them

### Joining an Existing Room

1. Enter your name in the "Join Existing Room" section
2. Enter the Room ID provided by the room creator
3. Click "Join Room"
4. You'll be connected to the shared whiteboard

### Drawing Tools

- **Pen Tool**: Default drawing tool for freehand drawing
- **Rectangle Tool**: Draw rectangular shapes
- **Circle Tool**: Draw circular shapes
- **Text Tool**: Add text to the canvas
- **Eraser Tool**: Remove drawings from the canvas

### Canvas Controls

- **Color Picker**: Change the drawing color
- **Brush Size**: Adjust the thickness of your drawings
- **Undo**: Remove the last drawing action
- **Clear Canvas**: Remove all drawings from the canvas
- **Download**: Save the current canvas as a PNG image

## API Endpoints

### Health Check
```
GET /api/health
```
Returns the server status.

### Create Room
```
POST /api/rooms
Body: {
  "name": "Room Name",
  "isPrivate": false,
  "password": "optional"
}
```
Creates a new whiteboard room.

### Get Room Info
```
GET /api/rooms/:roomId
```
Retrieves information about a specific room.

### Get Room Drawings
```
GET /api/rooms/:roomId/drawings
```
Retrieves all drawings for a specific room.

## WebSocket Events

### Client to Server Events
- `join-room`: Join a whiteboard room
- `drawing`: Send drawing data to other users
- `clear-canvas`: Clear the entire canvas
- `undo`: Undo the last drawing action

### Server to Client Events
- `room-joined`: Confirmation of successful room join
- `user-joined`: Notification when a new user joins
- `user-left`: Notification when a user leaves
- `drawing`: Receive drawing data from other users
- `canvas-cleared`: Notification that canvas was cleared
- `undo`: Receive undo action from other users
- `error`: Error messages

## Database Schema

### Rooms Collection
```javascript
{
  id: String,           // Unique room identifier
  name: String,         // Room display name
  isPrivate: Boolean,   // Privacy setting
  password: String,     // Optional password
  createdAt: Date,      // Creation timestamp
  users: Array          // Currently connected users
}
```

### Drawings Collection
```javascript
{
  roomId: String,       // Associated room ID
  data: Array,          // Array of drawing objects
  createdAt: Date       // Creation timestamp
}
```

### Drawing Object Structure
```javascript
{
  id: String,           // Unique drawing ID
  type: String,         // Drawing type (draw, shape, text)
  x: Number,            // X coordinate
  y: Number,            // Y coordinate
  color: String,        // Drawing color
  size: Number,         // Brush size
  tool: String,         // Tool used
  userId: String,       // User who created the drawing
  userName: String,     // User's display name
  timestamp: Date       // Creation time
}
```

## Development

### Running in Development Mode

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend/whiteboard-frontend
pnpm run dev --host
```

### Environment Variables

#### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/whiteboard
NODE_ENV=development
```

### Code Structure

#### Backend (server.js)
- Express server setup with CORS
- Socket.io integration for real-time communication
- MongoDB connection and data models
- RESTful API endpoints
- WebSocket event handlers

#### Frontend (App.jsx)
- React component with state management
- Socket.io client integration
- Canvas drawing implementation
- UI components and styling
- Real-time event handling

## Deployment

### Backend Deployment
1. Set up a MongoDB database (MongoDB Atlas recommended)
2. Configure environment variables for production
3. Deploy to a cloud platform (Heroku, DigitalOcean, AWS, etc.)
4. Ensure the server listens on `0.0.0.0` for external access

### Frontend Deployment
1. Update the Socket.io connection URL to point to your deployed backend
2. Build the production version: `pnpm run build`
3. Deploy the `dist/` folder to a static hosting service (Netlify, Vercel, etc.)

## Troubleshooting

### Common Issues

1. **Connection Issues**
   - Ensure both backend and frontend servers are running
   - Check that the Socket.io connection URL is correct
   - Verify CORS settings allow your frontend domain

2. **Drawing Not Working**
   - Check browser console for JavaScript errors
   - Ensure canvas element is properly initialized
   - Verify WebSocket connection is established

3. **MongoDB Connection Issues**
   - Check MongoDB connection string
   - Ensure MongoDB service is running
   - Verify database permissions

### Browser Compatibility
- Modern browsers with WebSocket support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers on iOS and Android

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions, please create an issue in the project repository.

#   w h i t e b o a r d  
 