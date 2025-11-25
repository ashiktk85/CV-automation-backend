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

  async getStarredCVs(req, res) {
    try {
      const { search, minScore, sortBy, sortOrder, page, limit } = req.query;
      const options = {
        search: search || null,
        minScore: minScore ? parseInt(minScore) : null,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc',
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 12
      };
      const result = await this.cvService.getStarredCVs(options);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching starred CVs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch starred CVs',
        details: error.message,
      });
    }
  }

  async updateStarredStatus(req, res) {
    try {
      const { id } = req.params;
      const { starred } = req.body;

      if (typeof starred !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: 'starred must be a boolean value',
        });
      }

      const result = await this.cvService.updateStarredStatus(id, starred);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error updating starred status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update starred status',
        details: error.message,
      });
    }
  }

  async deleteCV(req, res) {
    try {
      const { id } = req.params;
      const result = await this.cvService.deleteCV(id);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error deleting CV:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete CV',
        details: error.message,
      });
    }
  }

  async deleteBulkCVs(req, res) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: 'ids array is required'
        });
      }

      const result = await this.cvService.deleteBulk(ids);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error bulk deleting CVs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to bulk delete CVs',
        details: error.message,
      });
    }
  }

  async deleteAllRejected(req, res) {
    try {
      const result = await this.cvService.deleteAllRejected();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error deleting all rejected CVs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete rejected CVs',
        details: error.message,
      });
    }
  }

  async getAcceptedCVs(req, res) {
    try {
      const { search, minScore, sortBy, sortOrder, page, limit } = req.query;
      const options = {
        search: search || null,
        minScore: minScore ? parseInt(minScore) : 50,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc',
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 12
      };
      const result = await this.cvService.getAcceptedCVs(options);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching accepted CVs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch accepted CVs',
        details: error.message,
      });
    }
  }

  async getShopifyApplicants(req, res) {
    try {
      const { search, minScore, sortBy, sortOrder, page, limit } = req.query;
      const options = {
        search: search || null,
        minScore: minScore ? parseInt(minScore) : null,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc',
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 12
      };
      const result = await this.cvService.getShopifyApplicants(options);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching Shopify applicants:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch Shopify applicants',
        details: error.message,
      });
    }
  }

  async getGcmsApplicants(req, res) {
    try {
      const { search, minScore, sortBy, sortOrder, page, limit } = req.query;
      const options = {
        search: search || null,
        minScore: minScore ? parseInt(minScore) : null,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc',
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 12
      };
      const result = await this.cvService.getGcmsApplicants(options);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching GCMS applicants:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch GCMS applicants',
        details: error.message,
      });
    }
  }

  async getRejectedCVs(req, res) {
    try {
      const { search, minScore, sortBy, sortOrder, page, limit } = req.query;
      const options = {
        search: search || null,
        minScore: minScore ? parseInt(minScore) : null,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc',
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 12
      };
      const result = await this.cvService.getRejectedCVs(options);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching rejected CVs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch rejected CVs',
        details: error.message,
      });
    }
  }

  async getAcceptedAnalytics(req, res) {
    try {
      const result = await this.cvService.getAcceptedAnalytics();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching accepted analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch accepted analytics',
        details: error.message,
      });
    }
  }

  async getShopifyAnalytics(req, res) {
    try {
      const result = await this.cvService.getShopifyAnalytics();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching Shopify analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch Shopify analytics',
        details: error.message,
      });
    }
  }

  async getGcmsAnalytics(req, res) {
    try {
      const result = await this.cvService.getGcmsAnalytics();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching GCMS analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch GCMS analytics',
        details: error.message,
      });
    }
  }

  async getRejectedAnalytics(req, res) {
    try {
      const result = await this.cvService.getRejectedAnalytics();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching rejected analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch rejected analytics',
        details: error.message,
      });
    }
  }

  async getStarredAnalytics(req, res) {
    try {
      const result = await this.cvService.getStarredAnalytics();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching starred analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch starred analytics',
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
        file: req.file ? "File received via multer" : 'no file received via multer',
      });
  

      const raw = Array.isArray(req.body) ? req.body[0] : req.body || {};
  
      // Check if file came via multer (multipart/form-data)
      let fileData = undefined;
      if (req.file && req.file.buffer && req.file.buffer.length > 0) {
      

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


