class AuthRoutes {
  constructor(authController) {
    this.authController = authController;
  }

  setupRoutes(app) {
    // Login endpoint
    app.post('/api/auth/login', (req, res) => {
      this.authController.login(req, res);
    });

    // Logout endpoint
    app.post('/api/auth/logout', (req, res) => {
      this.authController.logout(req, res);
    });

    // Verify authentication endpoint
    app.get('/api/auth/verify', (req, res) => {
      this.authController.verify(req, res);
    });
  }
}

module.exports = AuthRoutes;

