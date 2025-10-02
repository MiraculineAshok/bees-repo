const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dokomrjyc',
  api_key: '847732284957539',
  api_secret: 'yULPJ1BHaKp12dofum6cXmKaqpM'
});

module.exports = cloudinary;
