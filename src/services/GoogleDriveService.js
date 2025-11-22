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
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          project_id: process.env.GOOGLE_DRIVE_PROJECT_ID
        },
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      this.drive = google.drive({ version: 'v3', auth });
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error);
      throw error;
    }
  }

  async uploadFile(buffer, fileName, mimeType = 'application/pdf') {
    try {
      const fileMetadata = {
        name: fileName,
        parents: this.folderId ? [this.folderId] : []
      };

      const media = {
        mimeType: mimeType,
        body: buffer
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink'
      });

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

