class CVRoutes {
  constructor(cvController, upload) {
    this.cvController = cvController;
    this.upload = upload;
  }

  setupRoutes(app) {
      app.get('/api/cv/list', (req, res) => this.cvController.getAllCVs(req, res));
      app.get('/api/cv/accepted', (req, res) => this.cvController.getAcceptedCVs(req, res));
      app.get('/api/cv/shopify', (req, res) => this.cvController.getShopifyApplicants(req, res));
      app.get('/api/cv/rejected', (req, res) => this.cvController.getRejectedCVs(req, res));
      app.get('/api/cv/starred', (req, res) => this.cvController.getStarredCVs(req, res));
      app.get('/api/cv/analytics/accepted', (req, res) => this.cvController.getAcceptedAnalytics(req, res));
      app.get('/api/cv/analytics/shopify', (req, res) => this.cvController.getShopifyAnalytics(req, res));
      app.get('/api/cv/analytics/rejected', (req, res) => this.cvController.getRejectedAnalytics(req, res));
      app.get('/api/cv/analytics/starred', (req, res) => this.cvController.getStarredAnalytics(req, res));
      app.patch('/api/cv/:id/starred', (req, res) => this.cvController.updateStarredStatus(req, res));
      app.delete('/api/cv/:id', (req, res) => this.cvController.deleteCV(req, res));
      app.post('/api/cv/n8n-webhook', this.upload.single('file'), (req, res) => this.cvController.receiveN8NWebhook(req, res));
      app.get('/api/health', (req, res) => this.cvController.getHealthCheck(req, res));
    }
}

module.exports = CVRoutes;


