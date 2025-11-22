# Google Drive Setup Instructions

## 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

## 2. Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details
4. Click "Create and Continue"
5. Skip role assignment (optional)
6. Click "Done"

## 3. Create Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Download the JSON file

## 4. Get Credentials from JSON

Open the downloaded JSON file and extract:
- `client_email` → GOOGLE_DRIVE_CLIENT_EMAIL
- `private_key` → GOOGLE_DRIVE_PRIVATE_KEY
- `project_id` → GOOGLE_DRIVE_PROJECT_ID

## 5. Create Google Drive Folder (Optional)

1. Create a folder in Google Drive
2. Right-click the folder > "Share"
3. Add the service account email (from step 2)
4. Give "Editor" permission
5. Copy the folder ID from the URL:
   - URL format: `https://drive.google.com/drive/folders/FOLDER_ID`
   - Copy the FOLDER_ID part

## 6. Set Environment Variables

Add to your `.env` file:

```
GOOGLE_DRIVE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_PROJECT_ID=your-project-id
GOOGLE_DRIVE_FOLDER_ID=your-folder-id (optional)
```

Note: The private key should include the `\n` characters as shown in the JSON file.

