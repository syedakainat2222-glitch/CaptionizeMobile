import('@genkit-ai/core').then(module => {
  console.log('Available exports:');
  Object.keys(module).forEach(key => {
    console.log(`- ${key}: ${typeof module[key]}`);
  });
}).catch(err => {
  console.error('Error:', err);
});
