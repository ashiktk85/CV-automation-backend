const path = require('path');
const { extractTextFromPdfBuffer } = require('../utils/pdfExtractor');
const { evaluateShopifyCV } = require('./shopifyEvaluator');

class CVService {
  constructor(cvRepository, socketIO, fileUploadService) {
    this.cvRepository = cvRepository;
    this.socketIO = socketIO;
    this.fileUploadService = fileUploadService;
  }

 

  async createCVFromN8N(n8nData) {
    try {
      console.log('Parsing n8n data:', JSON.stringify(n8nData, null, 2));
      
      const cvData = this.parseN8NData(n8nData);
      console.log('Parsed CV data:', cvData);
      
      this.validateCVData(cvData);

      // Extract PDF buffer for parsing and file processing
      let pdfBuffer = null;
      let fileInfo;
      let scoring = null;

      try {
        // Step 1: Extract PDF buffer - try getPdfBuffer first, then fallback to processN8NFile logic
        pdfBuffer = await this.getPdfBuffer(n8nData);
        
        // If getPdfBuffer failed, try extracting from processN8NFile logic
        if (!pdfBuffer || pdfBuffer.length === 0) {
          console.log('getPdfBuffer returned null, trying alternative extraction method...');
          // Try extracting buffer using the same logic as processN8NFile
          if (n8nData.file && n8nData.file.buffer && Buffer.isBuffer(n8nData.file.buffer)) {
            pdfBuffer = n8nData.file.buffer;
            console.log('Found buffer in n8nData.file.buffer');
          }
        }
        
        if (!pdfBuffer || pdfBuffer.length === 0) {
          console.warn('⚠️ No PDF buffer found, cannot extract text or score CV');
          console.warn('n8nData structure:', {
            hasFile: !!n8nData.file,
            fileHasBuffer: !!(n8nData.file && n8nData.file.buffer),
            fileBufferLength: n8nData.file?.buffer?.length || 0
          });
        } else {
          console.log(`✅ PDF buffer extracted: ${pdfBuffer.length} bytes`);
          
          // Step 2: Extract text from PDF
          console.log('📄 Extracting text from PDF...');
          let cvText = '';
          try {
            cvText = await extractTextFromPdfBuffer(pdfBuffer);
            console.log(`✅ Extracted ${cvText.length} characters from PDF`);
            
            if (cvText && cvText.length > 50) {
              // Only log first 200 chars to avoid spam
              console.log(`📝 PDF text preview: ${cvText.substring(0, 200)}...`);
            } else if (cvText.length === 0) {
              console.warn('⚠️ PDF text extraction returned empty string - PDF might be image-based or corrupted');
            }
          } catch (parseError) {
            console.error('❌ PDF parsing failed:', parseError.message);
            console.error('PDF parsing error stack:', parseError.stack);
            // Continue without text extraction
          }

          // Step 3: Score the CV if we have text
          if (cvText && cvText.length > 0) {
            console.log('🎯 Evaluating CV for Shopify position...');
            try {
              scoring = evaluateShopifyCV(cvText);
              console.log(`✅ [Shopify Evaluation] Candidate: ${cvData.fullName || 'N/A'} | Score: ${scoring.score} | Rank: ${scoring.rank} | Experience matches: ${scoring.shopifyExperienceMatches} | Technical matches: ${scoring.technicalMatches}`);
            } catch (scoreError) {
              console.error('❌ CV scoring failed:', scoreError.message);
              console.error('Scoring error stack:', scoreError.stack);
            }
          } else {
            console.warn('⚠️ PDF text extraction returned empty result, skipping scoring');
          }
        }

        // Step 4: Process file (upload to Supabase, save locally)
        // Pass the already-extracted buffer to avoid re-extraction
        fileInfo = await this.processN8NFile(n8nData, pdfBuffer);
        console.log('✅ File processed successfully:', fileInfo.fileName);
      } catch (fileError) {
        console.error('❌ File processing failed:', fileError.message);
        console.error('File error stack:', fileError.stack);
        fileInfo = {
          fileName: 'no-file.pdf',
          fileExtension: 'pdf',
          mimeType: 'application/pdf',
          fileSize: '0 kB',
          supabasePath: null,
          supabaseUrl: null,
          supabaseBucket: null
        };
      }

      const parseTimestamp = (timestampStr) => {
        if (!timestampStr) return new Date();
        
        if (typeof timestampStr === 'string') {
          const parts = timestampStr.split(' ');
          if (parts.length === 2) {
            const [datePart, timePart] = parts;
            const [day, month, year] = datePart.split('/');
            const [hour, minute, second] = timePart.split(':');
            return new Date(year, month - 1, day, hour, minute, second);
          }
        }
        
        return new Date(timestampStr) || new Date();
      };

      // Build CV record with scoring data
      const cvRecord = {
        timestamp: parseTimestamp(cvData.timestamp),
        fullName: cvData.fullName,
        email: cvData.email,
        phoneNumber: cvData.phoneNumber || null,
        jobTitle: cvData.jobTitle,
        file: fileInfo,
        // Include scoring data if available
        ...(scoring ? {
          score: scoring.score,
          rank: scoring.rank,
          shopifyExperienceMatches: scoring.shopifyExperienceMatches,
          technicalMatches: scoring.technicalMatches,
          matchedExperience: scoring.matchedExperience,
          matchedTechnicalSkills: scoring.matchedTechnicalSkills,
          reason: scoring.reason
        } : {})
      };

      console.log('Creating CV record with file info:', {
        fileName: fileInfo.fileName,
        supabaseUrl: fileInfo.supabaseUrl,
        supabasePath: fileInfo.supabasePath,
        score: scoring?.score,
        rank: scoring?.rank
      });

      const createdCV = await this.cvRepository.create(cvRecord);
      const count = await this.cvRepository.count();

      this.socketIO.emit('newCVUploaded', {
        success: true,
        data: createdCV,
        totalCount: count
      });

      // Return response with scoring data for n8n
      return {
        success: true,
        message: 'CV received from n8n successfully',
        score: scoring?.score || null,
        rank: scoring?.rank || null,
        shopifyExperienceMatches: scoring?.shopifyExperienceMatches || null,
        technicalMatches: scoring?.technicalMatches || null,
        matchedExperience: scoring?.matchedExperience || [],
        matchedTechnicalSkills: scoring?.matchedTechnicalSkills || [],
        reason: scoring?.reason || null,
        supabaseUrl: fileInfo.supabaseUrl,
        data: createdCV
      };
    } catch (error) {
      throw new Error(`Failed to create CV from n8n: ${error.message}`);
    }
  }



  async getPdfBuffer(n8nData) {
    try {
      // Check if file came from multer (req.file)
      if (n8nData.file && n8nData.file.buffer && Buffer.isBuffer(n8nData.file.buffer)) {
        console.log('Extracting buffer from multer file, size:', n8nData.file.buffer.length);
        return n8nData.file.buffer;
      }

      // Fall back to parsing n8n data structure
      let data = n8nData;
      
      if (Array.isArray(n8nData) && n8nData.length > 0) {
        data = n8nData[0];
      }

      if (data && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        data = data.data;
      }

      if (data && data.json && typeof data.json === 'object') {
        data = data.json;
      }

      const fileData = data?.file || data?.binary || data?.data?.file || data?.data?.binary || data?.binary?.data;
      
      if (!fileData) {
        console.warn('No file data found in n8n payload');
        return null;
      }

      const binaryData = fileData.data || fileData.binary || fileData.base64;

      if (!binaryData) {
        console.warn('No binary data found in file data');
        return null;
      }

      // Convert binary data to buffer
      let buffer = null;
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
        console.warn('Invalid binary data format:', typeof binaryData);
        return null;
      }

      if (buffer && buffer.length > 0) {
        console.log('Extracted buffer from n8n data structure, size:', buffer.length);
        return buffer;
      }

      return null;
    } catch (error) {
      console.error('Error extracting PDF buffer:', error.message);
      return null;
    }
  }

  parseN8NData(n8nData) {
    let data = n8nData;

    if (Array.isArray(n8nData) && n8nData.length > 0) {
      data = n8nData[0];
    }

    if (data && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      data = data.data;
    }

    if (data && data.json && typeof data.json === 'object') {
      data = data.json;
    }

    return {
      timestamp: data?.timestamp,
      fullName: data?.fullName,
      email: data?.email,
      jobTitle: data?.jobTitle,
      phoneNumber: data?.phoneNumber,
      file: data?.file || data?.binary || data?.data?.file || data?.data?.binary
    };
  }

  async processN8NFile(n8nData, providedBuffer = null) {
    let buffer = providedBuffer; // Use provided buffer if available
    let fileName;
    let fileExtension;
    let mimeType;
    let fileSize;

    // If buffer was already provided, extract metadata from n8nData
    if (buffer && Buffer.isBuffer(buffer)) {
      console.log('Using provided buffer for file processing');
      // First, check if file came from multer (req.file)
      if (n8nData.file && n8nData.file.originalname) {
        fileName = n8nData.file.originalname || `cv-${Date.now()}.pdf`;
        fileExtension = path.extname(fileName).substring(1) || 'pdf';
        mimeType = n8nData.file.mimetype || 'application/pdf';
        fileSize = (n8nData.file.size / 1024).toFixed(2) + ' kB';
      } else {
        // Extract from n8n data structure
        let data = n8nData;
        if (Array.isArray(n8nData) && n8nData.length > 0) {
          data = n8nData[0];
        }
        if (data && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
          data = data.data;
        }
        if (data && data.json && typeof data.json === 'object') {
          data = data.json;
        }
        const fileData = data?.file || data?.binary || data?.data?.file || data?.data?.binary || data?.binary?.data;
        fileName = fileData?.fileName || fileData?.['File Name'] || `cv-${Date.now()}.pdf`;
        fileExtension = fileData?.fileExtension || fileData?.['File Extension'] || 'pdf';
        mimeType = fileData?.mimeType || fileData?.['Mime Type'] || 'application/pdf';
        fileSize = fileData?.fileSize || fileData?.['File Size'] || (buffer.length / 1024).toFixed(2) + ' kB';
      }
    } else if (n8nData.file && n8nData.file.buffer) {
      // First, check if file came from multer (req.file)
      console.log('Processing file from multer (req.file)');
      buffer = n8nData.file.buffer;
      fileName = n8nData.file.originalname || `cv-${Date.now()}.pdf`;
      fileExtension = path.extname(fileName).substring(1) || 'pdf';
      mimeType = n8nData.file.mimetype || 'application/pdf';
      fileSize = (n8nData.file.size / 1024).toFixed(2) + ' kB';
      
      // Verify it's a PDF
      if (mimeType !== 'application/pdf') {
        throw new Error('File must be a PDF (application/pdf)');
      }
    } else {
      // Fall back to parsing n8n data structure
      console.log('Processing file from n8n data structure');
      let data = n8nData;
      
      if (Array.isArray(n8nData) && n8nData.length > 0) {
        data = n8nData[0];
      }

      if (data && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        data = data.data;
      }

      if (data && data.json && typeof data.json === 'object') {
        data = data.json;
      }

      const fileData = data?.file || data?.binary || data?.data?.file || data?.data?.binary || data?.binary?.data;
      
      if (!fileData) {
        throw new Error('No file data provided in n8n payload. Expected file, binary, or data.file in the payload.');
      }

      fileName = fileData.fileName || fileData['File Name'] || `cv-${Date.now()}.pdf`;
      fileExtension = fileData.fileExtension || fileData['File Extension'] || 'pdf';
      mimeType = fileData.mimeType || fileData['Mime Type'] || 'application/pdf';
      fileSize = fileData.fileSize || fileData['File Size'] || '0 kB';
      const binaryData = fileData.data || fileData.binary || fileData.base64;

      if (!binaryData) {
        throw new Error('No binary data provided in n8n payload');
      }

      // Convert binary data to buffer
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
    }

    if (!buffer || buffer.length === 0) {
      throw new Error('File buffer is empty or invalid');
    }

    console.log(`Processing file: ${fileName}, size: ${buffer.length} bytes`);

    // Upload to Supabase (file will be compressed before upload)
    let supabaseResult = null;
    try {
      supabaseResult = await this.fileUploadService.uploadToSupabase(
        buffer,
        fileName,
        mimeType
      );
      console.log('File uploaded to Supabase:', supabaseResult.path);
      console.log('Supabase URL:', supabaseResult.url);
    } catch (supabaseError) {
      console.error('Supabase upload failed:', supabaseError.message);
      throw new Error(`Failed to upload file to Supabase: ${supabaseError.message}`);
    }

    if (!supabaseResult) {
      throw new Error('Failed to upload file to Supabase');
    }

    return {
      fileName: fileName,
      fileExtension: fileExtension,
      mimeType: mimeType,
      fileSize: fileSize,
      supabasePath: supabaseResult.path,
      supabaseUrl: supabaseResult.url,
      supabaseBucket: supabaseResult.bucket || 'cvs'
    };
  }

  validateCVData(cvData) {
    const { fullName, email, jobTitle } = cvData;
    if (!fullName || !email || !jobTitle) {
      throw new Error('Missing required fields: fullName, email, jobTitle');
    }
  }

  async getAllCVs() {
    try {
      const cvs = await this.cvRepository.findAll();
      return {
        success: true,
        data: cvs
      };
    } catch (error) {
      throw new Error(`Failed to get all CVs: ${error.message}`);
    }
  }

  /**
   * Get accepted CVs (score >= 50) - filtered at database level with search, sort, filter, and pagination
   */
  async getAcceptedCVs(options = {}) {
    try {
      const baseQuery = { score: { $gte: 50, $ne: null } };
      const result = await this.cvRepository.findWithOptions(baseQuery, {
        ...options,
        minScore: options.minScore || 50,
        page: options.page || 1,
        limit: options.limit || 12
      });
      return {
        success: true,
        data: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      throw new Error(`Failed to get accepted CVs: ${error.message}`);
    }
  }

  /**
   * Get Shopify applicants (CVs with scoring data) - filtered at database level with search, sort, filter, and pagination
   */
  async getShopifyApplicants(options = {}) {
    try {
      const baseQuery = {
        score: { $ne: null },
        jobTitle: { $eq: "Shopify" }
      };
      const result = await this.cvRepository.findWithOptions(baseQuery, {
        ...options,
        page: options.page || 1,
        limit: options.limit || 12
      });
      return {
        success: true,
        data: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      throw new Error(`Failed to get Shopify applicants: ${error.message}`);
    }
  }

  /**
   * Get rejected CVs (score < 50 OR no score) - filtered at database level with search, sort, filter, and pagination
   */
  async getRejectedCVs(options = {}) {
    try {
      const baseQuery = {
        $or: [
          { score: { $lt: 50, $ne: null } },
          { score: null },
          { score: { $exists: false } }
        ]
      };
      const result = await this.cvRepository.findWithOptions(baseQuery, {
        ...options,
        page: options.page || 1,
        limit: options.limit || 12
      });
      return {
        success: true,
        data: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      throw new Error(`Failed to get rejected CVs: ${error.message}`);
    }
  }

  /**
   * Get starred CVs with search, sort, filter, and pagination
   */
  async getStarredCVs(options = {}) {
    try {
      const baseQuery = { starred: true };
      const result = await this.cvRepository.findWithOptions(baseQuery, {
        ...options,
        page: options.page || 1,
        limit: options.limit || 12
      });
      return {
        success: true,
        data: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      throw new Error(`Failed to get starred CVs: ${error.message}`);
    }
  }

  /**
   * Get analytics for accepted CVs
   */
  async getAcceptedAnalytics() {
    try {
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));

      const baseQuery = { score: { $gte: 50, $ne: null } };

      const [total, todayCount, weekCount, monthCount] = await Promise.all([
        this.cvRepository.countWithQuery(baseQuery),
        this.cvRepository.countWithQuery(baseQuery, today, new Date()),
        this.cvRepository.countWithQuery(baseQuery, weekAgo, new Date()),
        this.cvRepository.countWithQuery(baseQuery, monthAgo, new Date())
      ]);

      return {
        success: true,
        data: {
          total,
          today: todayCount,
          week: weekCount,
          month: monthCount
        }
      };
    } catch (error) {
      throw new Error(`Failed to get accepted analytics: ${error.message}`);
    }
  }

  /**
   * Get analytics for Shopify applicants
   */
  async getShopifyAnalytics() {
    try {
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));

      const baseQuery = {
        score: { $ne: null },
        jobTitle: { $eq: "Shopify" }
      };

      const [total, todayCount, weekCount, monthCount] = await Promise.all([
        this.cvRepository.countWithQuery(baseQuery),
        this.cvRepository.countWithQuery(baseQuery, today, new Date()),
        this.cvRepository.countWithQuery(baseQuery, weekAgo, new Date()),
        this.cvRepository.countWithQuery(baseQuery, monthAgo, new Date())
      ]);

      return {
        success: true,
        data: {
          total,
          today: todayCount,
          week: weekCount,
          month: monthCount
        }
      };
    } catch (error) {
      throw new Error(`Failed to get Shopify analytics: ${error.message}`);
    }
  }

  /**
   * Get analytics for rejected CVs
   */
  async getRejectedAnalytics() {
    try {
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));

      const baseQuery = {
        $or: [
          { score: { $lt: 50, $ne: null } },
          { score: null },
          { score: { $exists: false } }
        ]
      };

      const [total, todayCount, weekCount, monthCount] = await Promise.all([
        this.cvRepository.countWithQuery(baseQuery),
        this.cvRepository.countWithQuery(baseQuery, today, new Date()),
        this.cvRepository.countWithQuery(baseQuery, weekAgo, new Date()),
        this.cvRepository.countWithQuery(baseQuery, monthAgo, new Date())
      ]);

      return {
        success: true,
        data: {
          total,
          today: todayCount,
          week: weekCount,
          month: monthCount
        }
      };
    } catch (error) {
      throw new Error(`Failed to get rejected analytics: ${error.message}`);
    }
  }

  /**
   * Get analytics for starred CVs
   */
  async getStarredAnalytics() {
    try {
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));

      const baseQuery = { starred: true };

      const [total, todayCount, weekCount, monthCount] = await Promise.all([
        this.cvRepository.countWithQuery(baseQuery),
        this.cvRepository.countWithQuery(baseQuery, today, new Date()),
        this.cvRepository.countWithQuery(baseQuery, weekAgo, new Date()),
        this.cvRepository.countWithQuery(baseQuery, monthAgo, new Date())
      ]);

      return {
        success: true,
        data: {
          total,
          today: todayCount,
          week: weekCount,
          month: monthCount
        }
      };
    } catch (error) {
      throw new Error(`Failed to get starred analytics: ${error.message}`);
    }
  }

  /**
   * Update starred status for a CV
   */
  async updateStarredStatus(id, starred) {
    try {
      const updated = await this.cvRepository.updateStarred(id, starred);
      if (!updated) {
        throw new Error('CV not found');
      }
      return {
        success: true,
        data: updated,
        message: `CV ${starred ? 'starred' : 'unstarred'} successfully`
      };
    } catch (error) {
      throw new Error(`Failed to update starred status: ${error.message}`);
    }
  }

  /**
   * Delete a CV and its associated files from Supabase and local storage
   */
  async deleteCV(id) {
    try {
      // First, get the CV to retrieve file paths
      const cv = await this.cvRepository.findById(id);
      if (!cv) {
        throw new Error('CV not found');
      }

      // Delete from Supabase if file exists
      if (cv.file && cv.file.supabasePath) {
        try {
          await this.fileUploadService.supabaseService.deleteFile(cv.file.supabasePath);
          console.log(`Deleted file from Supabase: ${cv.file.supabasePath}`);
        } catch (supabaseError) {
          console.warn(`Failed to delete file from Supabase: ${supabaseError.message}`);
          // Continue with deletion even if Supabase deletion fails
        }
      }

      // Delete from MongoDB
      const deleted = await this.cvRepository.deleteById(id);
      if (!deleted) {
        throw new Error('Failed to delete CV from database');
      }

      return {
        success: true,
        message: 'CV and associated files deleted successfully'
      };
    } catch (error) {
      throw new Error(`Failed to delete CV: ${error.message}`);
    }
  }
}

module.exports = CVService;


