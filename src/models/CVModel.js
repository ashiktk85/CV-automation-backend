const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileExtension: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: String, required: true },
  localFilePath: { type: String, required: false },
  localFileName: { type: String, required: false },
  supabasePath: { type: String, required: false },
  supabaseUrl: { type: String, required: false },
  supabaseBucket: { type: String, required: false }
}, { _id: false });

const cvSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  jobTitle: { type: String, required: true },
  file: { type: fileSchema, required: true },
  starred: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const CVModel = mongoose.model('CV', cvSchema);

module.exports = CVModel;

