const multer = require('multer');
const path = require('path');
const fs = require('fs');

class FileUploadService {
  constructor(uploadsDir, filteredCvsDir, supabaseService) {
    this.uploadsDir = uploadsDir;
    this.filteredCvsDir = filteredCvsDir;
    this.supabaseService = supabaseService;
    this.initializeDirectory();
    this.upload = this.configureMulter();
  }

  initializeDirectory() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(this.filteredCvsDir)) {
      fs.mkdirSync(this.filteredCvsDir, { recursive: true });
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

  async uploadToSupabase(binaryData, fileName, mimeType) {
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

      // File will be compressed inside SupabaseService before uploading
      const result = await this.supabaseService.uploadFile(buffer, fileName, mimeType);
      return result;
    } catch (error) {
      throw new Error(`Failed to upload file to Supabase: ${error.message}`);
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

  async saveToFilteredCvs(buffer, fileName) {
    try {
      if (!Buffer.isBuffer(buffer)) {
        throw new Error('Invalid buffer provided');
      }

      // Ensure filtered-cvs directory exists
      if (!fs.existsSync(this.filteredCvsDir)) {
        fs.mkdirSync(this.filteredCvsDir, { recursive: true });
      }

      // Sanitize filename
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `${uniqueSuffix}-${sanitizedFileName}`;
      const filePath = path.join(this.filteredCvsDir, filename);

      fs.writeFileSync(filePath, buffer);

      return {
        filePath: `/filtered-cvs/${filename}`,
        localPath: filePath,
        fileName: filename
      };
    } catch (error) {
      throw new Error(`Failed to save file to filtered-cvs: ${error.message}`);
    }
  }
}

module.exports = FileUploadService;


