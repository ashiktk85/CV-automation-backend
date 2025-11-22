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

      const parseTimestamp = (timestampStr) => {
        if (!timestampStr) return new Date();
        
        if (typeof timestampStr === 'string') {
          const parts = timestampStr.split(' ');
          if (parts.length === 2) {
            const [datePart, timePart] = parts;
            const [day, month, year] = datePart.split('/');
            const [hour, minute, second] = timePart.split(':');
            return new Date(year, month - 1, day, hour, minute, second);
          }
        }
        
        return new Date(timestampStr) || new Date();
      };

      const cvRecord = {
        timestamp: parseTimestamp(cvData.timestamp),
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
    let data = n8nData;

    if (Array.isArray(n8nData) && n8nData.length > 0) {
      data = n8nData[0];
    }

    if (data.data && typeof data.data === 'object') {
      data = data.data;
    }

    return {
      timestamp: data.timestamp,
      fullName: data.fullName,
      email: data.email,
      jobTitle: data.jobTitle,
      phoneNumber: data.phoneNumber,
      file: data.file || data.binary || data.data?.file || data.data?.binary
    };
  }

  async processN8NFile(n8nData) {
    let data = n8nData;
    
    if (Array.isArray(n8nData) && n8nData.length > 0) {
      data = n8nData[0];
    }

    if (data.data && typeof data.data === 'object') {
      data = data.data;
    }

    const fileData = data.file || data.binary || data.data?.file || data.data?.binary;
    
    if (!fileData) {
      throw new Error('No file data provided in n8n payload');
    }

    const fileName = fileData.fileName || fileData['File Name'] || `cv-${Date.now()}.pdf`;
    const fileExtension = fileData.fileExtension || fileData['File Extension'] || 'pdf';
    const mimeType = fileData.mimeType || fileData['Mime Type'] || 'application/pdf';
    const fileSize = fileData.fileSize || fileData['File Size'] || '0 kB';
    const binaryData = fileData.data || fileData.binary || fileData.base64;

    if (!binaryData) {
      throw new Error('No binary data provided in n8n payload');
    }

    const googleDriveResult = await this.fileUploadService.uploadToGoogleDrive(
      binaryData,
      fileName,
      mimeType
    );

    return {
      fileName: fileName,
      fileExtension: fileExtension,
      mimeType: mimeType,
      fileSize: fileSize,
      googleDriveFileId: googleDriveResult.fileId,
      googleDriveLink: googleDriveResult.directLink
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


