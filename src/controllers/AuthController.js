const dotenv = require('dotenv');
dotenv.config();

class AuthController {
  login(req, res) {
    try {
      const { email, password } = req.body;

      // Get admin credentials from environment variables
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      // Check if credentials are set in .env
      if (!adminEmail || !adminPassword) {
        return res.status(500).json({
          success: false,
          message: 'Admin credentials not configured'
        });
      }

      // Validate credentials
      if (email === adminEmail && password === adminPassword) {
        return res.status(200).json({
          success: true,
          message: 'Login successful',
          data: {
            email: email,
            authenticated: true
          }
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  logout(req, res) {
    try {
      return res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  verify(req, res) {
    try {
      // Simple verification - in a real app, you'd check a token
      // For now, we'll just return success if the endpoint is called
      return res.status(200).json({
        success: true,
        message: 'Authenticated',
        authenticated: true
      });
    } catch (error) {
      console.error('Verify error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = AuthController;

