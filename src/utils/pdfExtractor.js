const pdfParse = require('pdf-parse');

/**
 * Extracts plain text from a PDF buffer
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} - Normalized text content
 */
async function extractTextFromPdfBuffer(buffer) {
  try {
    const data = await pdfParse(buffer);
    
    // Normalize whitespace: remove weird line breaks / multiple spaces
    const text = (data.text || '')
      .replace(/\r/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

module.exports = { extractTextFromPdfBuffer };

