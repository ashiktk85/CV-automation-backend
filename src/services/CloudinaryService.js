const cloudinary = require('cloudinary').v2;
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

class CloudinaryService {
  constructor() {
    this.initializeCloudinary();
  }

  initializeCloudinary() {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.warn('Cloudinary credentials not configured. File uploads will fail.');
        return;
      }

      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });

      console.log('Cloudinary initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Cloudinary:', error);
      throw error;
    }
  }

  async compressPDF(buffer) {
    try {
      console.log('Compressing PDF, original size:', buffer.length, 'bytes');
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(buffer);
      
      // Get all pages
      const pages = pdfDoc.getPages();
      console.log('PDF has', pages.length, 'pages');

      // For compression, we can:
      // 1. Remove unnecessary metadata
      // 2. Optimize images (if any)
      // 3. Flatten annotations
      
      // Save the optimized PDF
      const compressedPdfBytes = await pdfDoc.save({
        useObjectStreams: false, // Disable object streams for better compression
        addDefaultPage: false
      });

      const compressionRatio = ((1 - compressedPdfBytes.length / buffer.length) * 100).toFixed(2);
      console.log('PDF compressed, new size:', compressedPdfBytes.length, 'bytes');
      console.log('Compression ratio:', compressionRatio + '%');

      return Buffer.from(compressedPdfBytes);
    } catch (error) {
      console.warn('PDF compression failed, using original file:', error.message);
      return buffer; // Return original if compression fails
    }
  }

  async uploadFile(buffer, fileName, mimeType = 'application/pdf', options = {}) {
    try {
      if (!cloudinary.config().cloud_name) {
        throw new Error('Cloudinary not initialized. Please check your credentials.');
      }

      // Compress PDF before uploading
      let fileBuffer = buffer;
      if (mimeType === 'application/pdf') {
        fileBuffer = await this.compressPDF(buffer);
      }

      console.log(`Uploading file to Cloudinary: ${fileName}`);

      // Convert buffer to base64 for Cloudinary
      const base64String = fileBuffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64String}`;

      // Upload to Cloudinary
      const uploadOptions = {
        resource_type: 'auto', // Automatically detect resource type
        folder: process.env.CLOUDINARY_FOLDER || 'cv-automation',
        public_id: path.parse(fileName).name, // Use filename without extension as public_id
        format: path.extname(fileName).substring(1) || 'pdf',
        overwrite: false,
        ...options
      };

      const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

      console.log(`File uploaded successfully to Cloudinary. Public ID: ${result.public_id}`);
      console.log('File URL:', result.secure_url);

      return {
        publicId: result.public_id,
        fileName: result.original_filename || fileName,
        url: result.secure_url,
        publicUrl: result.url,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        resourceType: result.resource_type
      };
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      console.error('Error details:', error.message);
      throw new Error(`Failed to upload file to Cloudinary: ${error.message}`);
    }
  }

  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      throw new Error(`Failed to delete file from Cloudinary: ${error.message}`);
    }
  }

  async getFileUrl(publicId, options = {}) {
    try {
      const defaultOptions = {
        secure: true,
        ...options
      };
      return cloudinary.url(publicId, defaultOptions);
    } catch (error) {
      console.error('Error generating Cloudinary URL:', error);
      throw new Error(`Failed to generate Cloudinary URL: ${error.message}`);
    }
  }
}

module.exports = CloudinaryService;

