const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const morgan = require('morgan');

const Database = require('./src/config/database');
const CVModel = require('./src/models/CVModel');
const CVRepository = require('./src/repositories/CVRepository');
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
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

const database = new Database();
const cvModel = CVModel;
const cvRepository = new CVRepository(cvModel);
const fileUploadService = new FileUploadService(uploadsDir);
const cvService = new CVService(cvRepository, io, fileUploadService);
const cvController = new CVController(cvService, fileUploadService);
const cvRoutes = new CVRoutes(cvController);

new SocketConfig(io);

cvRoutes.setupRoutes(app);

async function startServer() {
  try {
    await database.connect();
    
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Socket.io server is ready`);
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
