class CVRoutes {
  constructor(cvController, upload) {
    this.cvController = cvController;
    this.upload = upload;
  }

  setupRoutes(app) {
      app.post('/api/cv/n8n-webhook', upload.single('file'), (req, res) => this.cvController.receiveN8NWebhook(req, res));
      app.get('/api/health', (req, res) => console.log('Health check endpoint hit'));
    }
}

module.exports = CVRoutes;


