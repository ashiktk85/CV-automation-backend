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
        // Get PDF buffer first
        pdfBuffer = await this.getPdfBuffer(n8nData);
        
        if (pdfBuffer && pdfBuffer.length > 0) {
          // Step 1: Extract text from PDF
          console.log('Extracting text from PDF...');
          let cvText = '';
          try {
            cvText = await extractTextFromPdfBuffer(pdfBuffer);
            console.log(`Extracted ${cvText.length} characters from PDF`);
          } catch (parseError) {
            console.warn('PDF parsing failed:', parseError.message);
            // Continue without text extraction
          }

          // Step 2: Score the CV if we have text
          if (cvText && cvText.length > 0) {
            console.log('Evaluating CV for Shopify position...');
            scoring = evaluateShopifyCV(cvText);
            console.log('CV Scoring result:', {
              decision: scoring.decision,
              score: scoring.score,
              rank: scoring.rank,
              hasLiquid: scoring.hasLiquid
            });
          }
        }

        // Step 3: Process file (upload to Supabase, save locally)
        fileInfo = await this.processN8NFile(n8nData);
        console.log('File processed successfully:', fileInfo.fileName);
      } catch (fileError) {
        console.warn('File processing failed, continuing without file:', fileError.message);
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
        jobTitle: cvData.jobTitle,
        file: fileInfo,
        // Include scoring data if available
        ...(scoring ? {
          score: scoring.score,
          rank: scoring.rank,
          decision: scoring.decision,
          hasLiquid: scoring.hasLiquid,
          shopifyExperienceMatches: scoring.shopifyExperienceMatches,
          technicalMatches: scoring.technicalMatches,
          matchedExperience: scoring.matchedExperience,
          matchedTechnicalSkills: scoring.matchedTechnicalSkills,
          reason: scoring.reason
        } : {})
      };

      console.log('Creating CV record with file info:', {
        fileName: fileInfo.fileName,
        localFilePath: fileInfo.localFilePath,
        supabaseUrl: fileInfo.supabaseUrl,
        score: scoring?.score,
        decision: scoring?.decision
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
        decision: scoring?.decision || null,
        score: scoring?.score || null,
        rank: scoring?.rank || null,
        hasLiquid: scoring?.hasLiquid || null,
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

  /**
   * Extracts PDF buffer from n8n data
   * @param {Object} n8nData - n8n webhook data
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async getPdfBuffer(n8nData) {
    // Check if file came from multer (req.file)
    if (n8nData.file && n8nData.file.buffer) {
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
      return null;
    }

    const binaryData = fileData.data || fileData.binary || fileData.base64;

    if (!binaryData) {
      return null;
    }

    // Convert binary data to buffer
    if (typeof binaryData === 'string') {
      if (binaryData.startsWith('data:')) {
        const base64Data = binaryData.split(',')[1] || binaryData;
        return Buffer.from(base64Data, 'base64');
      } else {
        return Buffer.from(binaryData, 'base64');
      }
    } else if (Buffer.isBuffer(binaryData)) {
      return binaryData;
    }

    return null;
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

  async processN8NFile(n8nData) {
    let buffer;
    let fileName;
    let fileExtension;
    let mimeType;
    let fileSize;

    // First, check if file came from multer (req.file)
    if (n8nData.file && n8nData.file.buffer) {
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

    // Save file to filtered-cvs folder first
    const localFileInfo = await this.fileUploadService.saveToFilteredCvs(buffer, fileName);
    console.log('File saved to filtered-cvs:', localFileInfo.filePath);

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
      console.warn('Supabase upload failed, continuing with local file only:', supabaseError.message);
    }

    return {
      fileName: fileName,
      fileExtension: fileExtension,
      mimeType: mimeType,
      fileSize: fileSize,
      localFilePath: localFileInfo.filePath,
      localFileName: localFileInfo.fileName,
      supabasePath: supabaseResult?.path || null,
      supabaseUrl: supabaseResult?.url || null,
      supabaseBucket: supabaseResult?.bucket || null
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
}

module.exports = CVService;


