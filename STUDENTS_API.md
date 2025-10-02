# Students API Documentation

## Overview
The Students API provides full CRUD operations for managing student records in the database.

## Database Schema

### Students Table
```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  zeta_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
- `idx_students_email` - For fast email lookups
- `idx_students_zeta_id` - For fast Zeta ID lookups
- `idx_students_phone` - For fast phone lookups

## API Endpoints

### 1. Get All Students
**GET** `/api/students`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "address": "123 Main St, City, State",
      "zeta_id": "ZETA001",
      "created_at": "2025-10-01T12:18:16.395Z",
      "updated_at": "2025-10-01T12:18:16.395Z"
    }
  ]
}
```

### 2. Get Student by ID
**GET** `/api/students/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "address": "123 Main St, City, State",
    "zeta_id": "ZETA001",
    "created_at": "2025-10-01T12:18:16.395Z",
    "updated_at": "2025-10-01T12:18:16.395Z"
  }
}
```

### 3. Create Student
**POST** `/api/students`

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "address": "123 Main St, City, State",
  "zeta_id": "ZETA001"
}
```

**Required Fields:**
- `first_name` (string)
- `last_name` (string)
- `email` (string, unique)
- `zeta_id` (string, unique)

**Optional Fields:**
- `phone` (string)
- `address` (string)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "address": "123 Main St, City, State",
    "zeta_id": "ZETA001",
    "created_at": "2025-10-01T12:18:16.395Z",
    "updated_at": "2025-10-01T12:18:16.395Z"
  }
}
```

### 4. Update Student
**PUT** `/api/students/:id`

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "phone": "+0987654321"
}
```

**Note:** Only provide fields you want to update. All fields are optional.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "john.doe@example.com",
    "phone": "+0987654321",
    "address": "123 Main St, City, State",
    "zeta_id": "ZETA001",
    "created_at": "2025-10-01T12:18:16.395Z",
    "updated_at": "2025-10-01T12:19:30.123Z"
  }
}
```

### 5. Delete Student
**DELETE** `/api/students/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "address": "123 Main St, City, State",
    "zeta_id": "ZETA001",
    "created_at": "2025-10-01T12:18:16.395Z",
    "updated_at": "2025-10-01T12:18:16.395Z"
  }
}
```

### 6. Search Students
**GET** `/api/students/search/:term`

Searches across first_name, last_name, email, zeta_id, and phone fields.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "address": "123 Main St, City, State",
      "zeta_id": "ZETA001",
      "created_at": "2025-10-01T12:18:16.395Z",
      "updated_at": "2025-10-01T12:18:16.395Z"
    }
  ]
}
```

### 7. Get Students Count
**GET** `/api/students-count`

**Response:**
```json
{
  "success": true,
  "count": 1
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required fields: first_name, last_name, email, and zeta_id are required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Student not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to fetch students"
}
```

## Example Usage

### Create a new student
```bash
curl -X POST https://bees-repo.onrender.com/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Alice",
    "last_name": "Johnson",
    "email": "alice.johnson@example.com",
    "phone": "+1555123456",
    "address": "456 Oak Ave, Town, State",
    "zeta_id": "ZETA002"
  }'
```

### Search for students
```bash
curl https://bees-repo.onrender.com/api/students/search/Alice
```

### Update a student
```bash
curl -X PUT https://bees-repo.onrender.com/api/students/1 \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1555987654",
    "address": "789 Pine St, New City, State"
  }'
```

### Delete a student
```bash
curl -X DELETE https://bees-repo.onrender.com/api/students/1
```
