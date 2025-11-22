const multer = require('multer');
const path = require('path');
const fs = require('fs');

class FileUploadService {
  constructor(uploadsDir) {
    this.uploadsDir = uploadsDir;
    this.initializeDirectory();
    this.upload = this.configureMulter();
  }

  initializeDirectory() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  configureMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    return multer({
      storage: storage,
      limits: {
        fileSize: 10 * 1024 * 1024
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF files are allowed'), false);
        }
      }
    });
  }

  getMiddleware() {
    return this.upload.single('file');
  }

  processFileInfo(file) {
    return {
      fileName: file.originalname,
      fileExtension: path.extname(file.originalname).substring(1),
      mimeType: file.mimetype,
      fileSize: (file.size / 1024).toFixed(2) + ' kB',
      filePath: `/uploads/${file.filename}`
    };
  }

  deleteFile(filePath) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async saveN8NFile(binaryData, fileName, fileExtension) {
    try {
      let buffer;
      
      if (typeof binaryData === 'string') {
        if (binaryData.startsWith('data:')) {
          const base64Data = binaryData.split(',')[1] || binaryData;
          buffer = Buffer.from(base64Data, 'base64');
        } else {
          buffer = Buffer.from(binaryData, 'base64');
        }
      } else if (Buffer.isBuffer(binaryData)) {
        buffer = binaryData;
      } else {
        throw new Error('Invalid binary data format');
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `file-${uniqueSuffix}.${fileExtension}`;
      const filePath = path.join(this.uploadsDir, filename);

      fs.writeFileSync(filePath, buffer);

      return `/uploads/${filename}`;
    } catch (error) {
      throw new Error(`Failed to save n8n file: ${error.message}`);
    }
  }
}

module.exports = FileUploadService;


