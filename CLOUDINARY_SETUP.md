# Cloudinary Integration Setup

This document explains how to set up Cloudinary for image storage in the Bees Interview Platform.

## What is Cloudinary?

Cloudinary is a cloud-based image and video management service that provides:
- Automatic image optimization
- Multiple format delivery (WebP, AVIF, etc.)
- Responsive image generation
- Secure image storage
- CDN delivery for fast loading

## Setup Steps

### 1. Get Cloudinary Credentials

1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Sign up or log in to your account
3. In the Dashboard, you'll find:
   - **Cloud Name**: Your unique cloud identifier
   - **API Key**: Your API key
   - **API Secret**: Your secret key (you already provided: `yULPJ1BHaKp12dofum6cXmKaqpM`)

### 2. Configure the Application

Run the setup script:

```bash
node setup-cloudinary.js
```

This will prompt you for:
- Cloud Name
- API Key
- API Secret (defaults to the one you provided)

### 3. Verify Configuration

The script will update `config/cloudinary.js` with your credentials.

## Features

### Image Upload
- Images are automatically uploaded to Cloudinary when captured
- Stored in the `interview-photos` folder
- Automatically optimized and resized (max 800x600)
- Quality is automatically adjusted for optimal file size

### Image Management
- Images are automatically deleted from Cloudinary when removed from the database
- Secure URLs are generated for image access
- Images are served via Cloudinary's CDN for fast loading

### Database Storage
- Only the Cloudinary URL is stored in the database
- No local file storage (except temporary during upload)
- Automatic cleanup of local files after upload

## Benefits

1. **Performance**: Images are served via CDN for fast loading
2. **Optimization**: Automatic image compression and format conversion
3. **Scalability**: No local storage limitations
4. **Security**: Secure URLs and access control
5. **Reliability**: Cloud-based storage with high availability

## Troubleshooting

### Common Issues

1. **Invalid Credentials**: Double-check your Cloud Name, API Key, and API Secret
2. **Upload Failures**: Check your internet connection and Cloudinary account limits
3. **Image Not Displaying**: Verify the URL is accessible and not expired

### Testing

To test the integration:
1. Start the server: `npm start`
2. Go to the interview session
3. Add a question and capture a photo
4. Check that the image appears in the answer area
5. Verify the image URL in the database contains `cloudinary.com`

## Support

For Cloudinary-specific issues, refer to:
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Support](https://support.cloudinary.com/)

For application-specific issues, check the server logs for error messages.
