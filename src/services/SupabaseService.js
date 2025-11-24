const { createClient } = require('@supabase/supabase-js');
const { PDFDocument } = require('pdf-lib');

class SupabaseService {
  constructor() {
    this.supabase = null;
    this.bucket = process.env.SUPABASE_BUCKET || 'cv-automation';
    this.folder = process.env.SUPABASE_FOLDER || 'filtered-cvs';
    this.initializeSupabase();
  }

  initializeSupabase() {
    try {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;

      if (!url || !key) {
        console.warn('Supabase credentials not configured. File uploads will fail.');
        return;
      }

      this.supabase = createClient(url, key);
      console.log('Supabase client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      throw error;
    }
  }

  async compressPDF(buffer) {
    try {
      console.log('Compressing PDF, original size:', buffer.length, 'bytes');
      const pdfDoc = await PDFDocument.load(buffer);

      const compressedPdfBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
      });

      const compressionRatio = ((1 - compressedPdfBytes.length / buffer.length) * 100).toFixed(2);
      console.log('PDF compressed, new size:', compressedPdfBytes.length, 'bytes');
      console.log('Compression ratio:', compressionRatio + '%');

      return Buffer.from(compressedPdfBytes);
    } catch (error) {
      console.warn('PDF compression failed, using original file:', error.message);
      return buffer;
    }
  }

  ensureSupabaseClient() {
    if (!this.supabase) {
      throw new Error('Supabase not initialized. Please check your credentials.');
    }
  }

  buildStoragePath(fileName = 'cv-file.pdf') {
    const trimmedName = fileName?.trim() || 'cv-file.pdf';
    if (!this.folder) {
      return trimmedName;
    }
    const normalizedFolder = this.folder.replace(/^\/+|\/+$/g, '');
    return `${normalizedFolder}/${trimmedName}`;
  }

  async uploadFile(buffer, fileName, mimeType = 'application/pdf', options = {}) {
    this.ensureSupabaseClient();

    // Compress PDF before uploading
    let fileBuffer = buffer;
    if (mimeType === 'application/pdf') {
      fileBuffer = await this.compressPDF(buffer);
    }

    const filePath = this.buildStoragePath(fileName);

    console.log(`Uploading file to Supabase storage: ${filePath}`);

    const uploadOptions = {
      contentType: mimeType,
      upsert: true,
      cacheControl: '3600',
      ...options,
    };

    const { error } = await this.supabase.storage.from(this.bucket).upload(filePath, fileBuffer, uploadOptions);

    if (error) {
      console.error('Error uploading to Supabase:', error);
      throw new Error(`Failed to upload file to Supabase: ${error.message}`);
    }

    const { data: publicData } = this.supabase.storage.from(this.bucket).getPublicUrl(filePath);
    const publicUrl = publicData?.publicUrl || null;

    return {
      path: filePath,
      url: publicUrl,
      bucket: this.bucket,
    };
  }

  async deleteFile(filePath) {
    this.ensureSupabaseClient();

    if (!filePath) {
      return;
    }

    const { error } = await this.supabase.storage.from(this.bucket).remove([filePath]);
    if (error) {
      console.error('Error deleting file from Supabase:', error);
      throw new Error(`Failed to delete file from Supabase: ${error.message}`);
    }
  }

  getPublicUrl(filePath) {
    this.ensureSupabaseClient();

    if (!filePath) {
      return null;
    }

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(filePath);
    return data?.publicUrl || null;
  }
}

module.exports = SupabaseService;


