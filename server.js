const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory storage for CV data (since no DB)
const cvDataStore = [];

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Endpoint to receive CV data and file
app.post('/api/cv/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get JSON data from request body
    const { timestamp, fullName, email, jobTitle } = req.body;

    if (!fullName || !email || !jobTitle) {
      // Delete uploaded file if data is invalid
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Missing required fields: fullName, email, jobTitle' });
    }

    // Process file information
    const fileInfo = {
      fileName: req.file.originalname,
      fileExtension: path.extname(req.file.originalname).substring(1),
      mimeType: req.file.mimetype,
      fileSize: (req.file.size / 1024).toFixed(2) + ' kB',
      filePath: `/uploads/${req.file.filename}`
    };

    // Create CV record
    const cvRecord = {
      id: Date.now().toString(),
      timestamp: timestamp || new Date().toISOString(),
      fullName,
      email,
      jobTitle,
      file: fileInfo,
      createdAt: new Date().toISOString()
    };

    // Store in memory
    cvDataStore.push(cvRecord);

    res.json({
      success: true,
      message: 'CV uploaded successfully',
      data: cvRecord
    });
  } catch (error) {
    console.error('Error processing CV upload:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to process CV upload', details: error.message });
  }
});

// Endpoint to get all CV data
app.get('/api/cv/list', (req, res) => {
  try {
    res.json({
      success: true,
      count: cvDataStore.length,
      data: cvDataStore
    });
  } catch (error) {
    console.error('Error fetching CV list:', error);
    res.status(500).json({ error: 'Failed to fetch CV list', details: error.message });
  }
});

// Endpoint to get single CV by ID
app.get('/api/cv/:id', (req, res) => {
  try {
    const cv = cvDataStore.find(item => item.id === req.params.id);
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    res.json({ success: true, data: cv });
  } catch (error) {
    console.error('Error fetching CV:', error);
    res.status(500).json({ error: 'Failed to fetch CV', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

