class CVController {
  constructor(cvService, fileUploadService) {
    this.cvService = cvService;
    this.fileUploadService = fileUploadService;
  }

  getHealthCheck(req, res) {
    res.json({ status: 'ok', message: 'Server is running' });
  }

  async receiveN8NWebhook(req, res) {
    try {
      console.log('Received n8n webhook request');
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Request body (raw):', req.body);
      console.log(
        'File info:',
        req.file
          ? {
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size,
            }
          : 'no file received'
      );
  

      const raw = Array.isArray(req.body) ? req.body[0] : req.body || {};
  
      const n8nData = {
        timestamp: raw.timestamp || raw.timeStamp, 
        fullName: raw.fullName,
        email: raw.email,
        jobTitle: raw.jobTitle,
        phoneNumber: raw.phoneNumber,
        file: req.file
          ? {
              buffer: req.file.buffer,           
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size,
            }
          : undefined,
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


