class CVController {
  constructor(cvService, fileUploadService) {
    this.cvService = cvService;
    this.fileUploadService = fileUploadService;
  }

  getHealthCheck(req, res) {
    res.json({ status: 'ok', message: 'Server is running' });
  }

  async getAllCVs(req, res) {
    try {
      const result = await this.cvService.getAllCVs();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching CVs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch CVs',
        details: error.message,
      });
    }
  }

  async receiveN8NWebhook(req, res) {
    try {
      console.log('Received n8n webhook request');
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Request body keys:', Object.keys(req.body || {}));
      console.log('File info:', {
        file: req.file ? req.file.originalname : 'no file received via multer',
      });
  

      const raw = Array.isArray(req.body) ? req.body[0] : req.body || {};
  
      // Check if file came via multer (multipart/form-data)
      let fileData = undefined;
      if (req.file && req.file.buffer && req.file.buffer.length > 0) {
        console.log('File received via multer, buffer size:', req.file.buffer.length);
        
        // Validate PDF mimetype
        if (req.file.mimetype !== 'application/pdf') {
          return res.status(400).json({
            success: false,
            error: 'Invalid file type',
            details: 'File must be a PDF (application/pdf). Received: ' + req.file.mimetype
          });
        }
        
        fileData = {
          buffer: req.file.buffer,           
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        };
      } else {
        // File might be in request body (JSON with base64)
        console.log('Checking request body for file data...');
        const bodyFile = raw.file || raw.binary || raw.data?.file || raw.data?.binary;
        if (bodyFile) {
          console.log('File data found in request body');
          fileData = bodyFile;
        }
      }
  
      const n8nData = {
        timestamp: raw.timestamp || raw.timeStamp, 
        fullName: raw.fullName,
        email: raw.email,
        jobTitle: raw.jobTitle,
        phoneNumber: raw.phoneNumber,
        file: fileData,
      };
  

      if (!n8nData.fullName || !n8nData.email || !n8nData.jobTitle) {
        console.error('Missing required fields in n8nData:', n8nData);
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: 'Missing required fields: fullName, email, jobTitle',
        });
      }
  
      const result = await this.cvService.createCVFromN8N(n8nData);
  
      console.log('Successfully processed n8n webhook');
      return res.status(201).json(result);
    } catch (error) {
      console.error('Error processing n8n webhook:', error);
      console.error('Error stack:', error.stack);
      return res.status(500).json({
        success: false,
        error: 'Failed to process n8n webhook',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
  
}

module.exports = CVController;


