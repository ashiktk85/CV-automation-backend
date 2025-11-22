class CVService {
  constructor(cvRepository, socketIO, fileUploadService) {
    this.cvRepository = cvRepository;
    this.socketIO = socketIO;
    this.fileUploadService = fileUploadService;
  }

 

  async createCVFromN8N(n8nData) {
    try {
      const cvData = this.parseN8NData(n8nData);
      this.validateCVData(cvData);

      const fileInfo = await this.processN8NFile(n8nData);

      const cvRecord = {
        timestamp: cvData.timestamp || new Date().toISOString(),
        fullName: cvData.fullName,
        email: cvData.email,
        jobTitle: cvData.jobTitle,
        file: fileInfo
      };

      const createdCV = await this.cvRepository.create(cvRecord);
      const count = await this.cvRepository.count();

      this.socketIO.emit('newCVUploaded', {
        success: true,
        data: createdCV,
        totalCount: count
      });

      return {
        success: true,
        message: 'CV received from n8n successfully',
        data: createdCV
      };
    } catch (error) {
      throw new Error(`Failed to create CV from n8n: ${error.message}`);
    }
  }

  parseN8NData(n8nData) {
    return {
      timestamp: n8nData.timestamp || n8nData.data?.timestamp,
      fullName: n8nData.fullName || n8nData.data?.fullName,
      email: n8nData.email || n8nData.data?.email,
      jobTitle: n8nData.jobTitle || n8nData.data?.jobTitle,
      file: n8nData.file || n8nData.data?.file
    };
  }

  async processN8NFile(n8nData) {
    const fileData = n8nData.file || n8nData.data?.file || n8nData.binary || n8nData.data?.binary;
    
    if (!fileData) {
      throw new Error('No file data provided in n8n payload');
    }

    const fileName = fileData.fileName || fileData['File Name'] || 'cv.pdf';
    const fileExtension = fileData.fileExtension || fileData['File Extension'] || 'pdf';
    const mimeType = fileData.mimeType || fileData['Mime Type'] || 'application/pdf';
    const fileSize = fileData.fileSize || fileData['File Size'] || '0 kB';
    const binaryData = fileData.data || fileData.binary || fileData.base64;

    if (!binaryData) {
      throw new Error('No binary data provided in n8n payload');
    }

    const savedFilePath = await this.fileUploadService.saveN8NFile(
      binaryData,
      fileName,
      fileExtension
    );

    return {
      fileName: fileName,
      fileExtension: fileExtension,
      mimeType: mimeType,
      fileSize: fileSize,
      filePath: savedFilePath
    };
  }

  validateCVData(cvData) {
    const { fullName, email, jobTitle } = cvData;
    if (!fullName || !email || !jobTitle) {
      throw new Error('Missing required fields: fullName, email, jobTitle');
    }
  }
}

module.exports = CVService;


