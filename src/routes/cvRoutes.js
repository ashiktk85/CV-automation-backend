class CVRoutes {
  constructor(cvController) {
    this.cvController = cvController;
  }

  setupRoutes(app) {
    app.post('/api/cv/n8n-webhook', (req, res) => this.cvController.receiveN8NWebhook(req, res));
    app.get('/api/health', (req, res) => console.log('Health check endpoint hit'));
  }
}

module.exports = CVRoutes;


