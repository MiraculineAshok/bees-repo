# Bees Express Server

A simple Node.js Express server with essential middleware and basic routes.

## Features

- Express.js framework
- Security middleware (Helmet)
- CORS support
- Request logging (Morgan)
- JSON body parsing
- Health check endpoint
- Error handling
- 404 handling

## Installation

1. Install dependencies:
```bash
npm install
```

## Usage

### Development
Start the server with auto-reload:
```bash
npm run dev
```

### Production
Start the server:
```bash
npm start
```

The server will start on port 3000 by default (or the PORT environment variable).

## API Endpoints

- `GET /` - Welcome message and server status
- `GET /health` - Health check endpoint
- `GET /api/hello` - Sample API endpoint

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Example Requests

```bash
# Welcome endpoint
curl http://localhost:3000/

# Health check
curl http://localhost:3000/health

# API endpoint
curl http://localhost:3000/api/hello
```

## Project Structure

```
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
└── README.md         # This file
```
