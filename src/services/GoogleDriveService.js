const { google } = require('googleapis');
const fs = require('fs');

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;
    this.initializeDrive();
  }

  initializeDrive() {
    try {
      if (!process.env.GOOGLE_DRIVE_CLIENT_EMAIL || !process.env.GOOGLE_DRIVE_PRIVATE_KEY) {
        console.warn('Google Drive credentials not configured. File uploads will fail.');
        return;
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          project_id: process.env.GOOGLE_DRIVE_PROJECT_ID
        },
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      this.drive = google.drive({ version: 'v3', auth });
      console.log('Google Drive initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error);
      throw error;
    }
  }

  async uploadFile(buffer, fileName, mimeType = 'application/pdf') {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized. Please check your credentials.');
      }

      const fileMetadata = {
        name: fileName,
        parents: this.folderId ? [this.folderId] : []
      };

      const media = {
        mimeType: mimeType,
        body: buffer
      };

      console.log(`Uploading file to Google Drive: ${fileName}`);
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink'
      });

      console.log(`File uploaded successfully. File ID: ${response.data.id}`);

      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      return {
        fileId: response.data.id,
        fileName: response.data.name,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        directLink: `https://drive.google.com/uc?export=view&id=${response.data.id}`
      };
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw new Error(`Failed to upload file to Google Drive: ${error.message}`);
    }
  }

  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({
        fileId: fileId
      });
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw new Error(`Failed to delete file from Google Drive: ${error.message}`);
    }
  }
}

module.exports = GoogleDriveService;

