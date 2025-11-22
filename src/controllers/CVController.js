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
      const n8nData = req.body;
      
      const result = await this.cvService.createCVFromN8N(n8nData);
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error processing n8n webhook:', error);
      res.status(500).json({ 
        error: 'Failed to process n8n webhook', 
        details: error.message 
      });
    }
  }
}

module.exports = CVController;


