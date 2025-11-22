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
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      if (!req.body || (Array.isArray(req.body) && req.body.length === 0)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: 'Request body is empty or invalid'
        });
      }

      const n8nData = req.body;
      const result = await this.cvService.createCVFromN8N(n8nData);
      
      console.log('Successfully processed n8n webhook');
      res.status(201).json(result);
    } catch (error) {
      console.error('Error processing n8n webhook:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        success: false,
        error: 'Failed to process n8n webhook', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

module.exports = CVController;


