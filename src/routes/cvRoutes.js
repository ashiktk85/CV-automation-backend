class CVRoutes {
  constructor(cvController, upload) {
    this.cvController = cvController;
    this.upload = upload;
  }

  setupRoutes(app) {
      app.get('/api/cv/list', (req, res) => this.cvController.getAllCVs(req, res));
      app.post('/api/cv/n8n-webhook', this.upload.single('file'), (req, res) => this.cvController.receiveN8NWebhook(req, res));
      app.get('/api/health', (req, res) => this.cvController.getHealthCheck(req, res));
    }
}

module.exports = CVRoutes;


