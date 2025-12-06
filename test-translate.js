// test-translate.js
const testTranslation = async () => {
    const testData = {
      subtitles: "1\n00:00:01,000 --> 00:00:04,000\nHello world\n\n2\n00:00:05,000 --> 00:00:08,000\nThis is a test",
      targetLanguage: "Spanish"
    };
  
    try {
      const response = await fetch('http://localhost:3000/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
  
      const text = await response.text();
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers));
      console.log('Response body:', text.substring(0, 500)); // First 500 chars
      
      try {
        const json = JSON.parse(text);
        console.log('Parsed JSON:', json);
      } catch (e) {
        console.log('Response is NOT JSON - it\'s HTML/Text');
      }
    } catch (error) {
      console.error('Request failed:', error);
    }
  };
  
  testTranslation();