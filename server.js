// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const multer = require('multer');         
require('dotenv').config();

const Database = require('./src/config/database');
const CVModel = require('./src/models/CVModel');
const CVRepository = require('./src/repositories/CVRepository');
const CloudinaryService = require('./src/services/CloudinaryService');
const CVService = require('./src/services/CVService');
const FileUploadService = require('./src/services/FileUploadService');
const CVController = require('./src/controllers/CVController');
const CVRoutes = require('./src/routes/cvRoutes');
const SocketConfig = require('./src/config/socketConfig');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;


app.use(morgan('dev'));
app.use(cors());


app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


const upload = multer({
  storage: multer.memoryStorage(), 
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
});

const uploadsDir = path.join(__dirname, 'uploads');
const filteredCvsDir = path.join(__dirname, 'filtered-cvs');

// Ensure directories exist
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(filteredCvsDir)) {
  fs.mkdirSync(filteredCvsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));
app.use('/filtered-cvs', express.static(filteredCvsDir));

const database = new Database();
const cvModel = CVModel;
const cvRepository = new CVRepository(cvModel);
const cloudinaryService = new CloudinaryService();
const fileUploadService = new FileUploadService(uploadsDir, filteredCvsDir, cloudinaryService);
const cvService = new CVService(cvRepository, io, fileUploadService);
const cvController = new CVController(cvService, fileUploadService);

const cvRoutes = new CVRoutes(cvController, upload);

new SocketConfig(io);

cvRoutes.setupRoutes(app);

async function startServer() {
  try {
    await database.connect();

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('Socket.io server is ready');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();


process.on('SIGINT', async () => {
  await database.disconnect();
  process.exit(0);
});
