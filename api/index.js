const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { transcribeAudio } = require('./transcribe');
const { analyzeWithGPT, analyzeWithClaude } = require('./analyze');
const { extractEntities } = require('./extract');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/mp4'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(wav|mp3|webm|ogg|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload and transcribe audio
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const filePath = req.file.path;
    const transcript = await transcribeAudio(filePath);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      transcript,
      filename: req.file.originalname
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Transcription failed' });
  }
});

// Analyze text and extract entities
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, provider = 'openai', formType = 'patent' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided for analysis' });
    }

    let analysis;
    if (provider === 'claude') {
      analysis = await analyzeWithClaude(text, formType);
    } else {
      analysis = await analyzeWithGPT(text, formType);
    }

    const entities = extractEntities(analysis, formType);

    res.json({
      success: true,
      provider,
      formType,
      analysis,
      entities
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
});

// Get form template
app.get('/api/forms/:type', (req, res) => {
  const { type } = req.params;
  const templates = require('./formTemplates');

  if (templates[type]) {
    res.json({ success: true, template: templates[type] });
  } else {
    res.status(404).json({ error: 'Form template not found' });
  }
});

// Serve the main app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: error.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
