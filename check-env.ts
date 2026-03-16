console.log('Environment Variables:');
Object.keys(process.env).forEach(key => {
  if (key.includes('SASCAR') || key.includes('KEY') || key.includes('API')) {
    console.log(`${key}: ${process.env[key] ? 'PRESENT' : 'EMPTY'}`);
  }
});
