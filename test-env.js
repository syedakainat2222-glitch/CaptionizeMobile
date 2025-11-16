console.log('=== Testing Environment Variables ===');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `SET (length: ${process.env.GEMINI_API_KEY.length})` : 'NOT SET');
console.log('Current directory:', process.cwd());

// Test if we can require the file (CommonJS)
try {
  const path = require('path');
  const fs = require('fs');
  
  const translationPath = path.join(__dirname, 'src/ai/flows/translate-subtitles.ts');
  console.log('Translation file exists:', fs.existsSync(translationPath));
  
  // Read a snippet of the file to verify it's correct
  const content = fs.readFileSync(translationPath, 'utf8');
  console.log('File starts with:', content.substring(0, 100));
  
} catch (error) {
  console.log('CommonJS test error:', error.message);
}
