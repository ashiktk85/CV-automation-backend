const { PDFParse } = require('pdf-parse');

async function extractTextFromPdfBuffer(buffer) {
  let parser;

  try {
    parser = new PDFParse({ data: buffer });


    const result = await parser.getText();

    const text = (result.text || '')
      .replace(/\r/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  } catch (error) {
    console.error('❌ PDF parsing failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
}

module.exports = { extractTextFromPdfBuffer };
