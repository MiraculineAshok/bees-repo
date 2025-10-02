#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 Cloudinary Setup for Bees Interview Platform');
console.log('===============================================\n');

console.log('Please provide your Cloudinary credentials:');
console.log('(You can find these in your Cloudinary Dashboard)\n');

rl.question('Cloud Name: ', (cloudName) => {
  rl.question('API Key: ', (apiKey) => {
    rl.question('API Secret (you provided: yULPJ1BHaKp12dofum6cXmKaqpM): ', (apiSecret) => {
      // Use the provided secret if user just presses enter
      const finalApiSecret = apiSecret.trim() || 'yULPJ1BHaKp12dofum6cXmKaqpM';
      
      // Update the cloudinary config file
      const configContent = `const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: '${cloudName}',
  api_key: '${apiKey}',
  api_secret: '${finalApiSecret}'
});

module.exports = cloudinary;`;

      const configPath = path.join(__dirname, 'config', 'cloudinary.js');
      fs.writeFileSync(configPath, configContent);
      
      console.log('\n✅ Cloudinary configuration updated successfully!');
      console.log(`📁 Config saved to: ${configPath}`);
      console.log('\n🚀 You can now start the server with: npm start');
      console.log('📸 Images will be automatically uploaded to Cloudinary!');
      
      rl.close();
    });
  });
});
