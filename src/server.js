const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL // Your Vercel frontend URL
    : 'http://localhost:5173',
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Senyas Backend API is running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, type } = req.body;

    // Handle different message types
    switch (type) {
      case 'text':
        // Process text message with Gemini
        const textResponse = await processTextMessage(message);
        return res.json({
          response: textResponse,
          type: 'text'
        });

      case 'voice':
        // Process voice message
        const voiceResponse = await processVoiceMessage(message);
        return res.json({
          response: voiceResponse,
          type: 'text'
        });

      case 'video':
        // Process video message (for ASL)
        const videoResponse = await processVideoMessage(message);
        return res.json({
          response: videoResponse,
          type: 'text'
        });

      default:
        return res.status(400).json({
          error: 'Invalid message type'
        });
    }
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// File upload endpoint for voice/video
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      type: req.body.type
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      error: 'Error uploading file'
    });
  }
});

// Message processing functions
async function processTextMessage(message) {
  try {
    const result = await model.generateContent(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error with Gemini API:', error);
    return "I'm sorry, I'm having trouble processing your message right now.";
  }
}

async function processVoiceMessage(message) {
  try {
    // First convert voice to text (if needed)
    // Then process with Gemini
    const result = await model.generateContent(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error processing voice message:', error);
    return "I'm sorry, I'm having trouble processing your voice message.";
  }
}

async function processVideoMessage(message) {
  try {
    // Process video message (for ASL)
    const result = await model.generateContent(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error processing video message:', error);
    return "I'm sorry, I'm having trouble processing your video message.";
  }
}

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});