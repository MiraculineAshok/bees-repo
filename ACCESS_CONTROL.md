# Access Control System

## Overview
The Bees Application implements a whitelist-based access control system that restricts access to only pre-authorized Zoho Corp employees. Only users whose email addresses are explicitly added to the `authorized_users` table can access the application.

## Database Schema

### Authorized Users Table
```sql
CREATE TABLE authorized_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  is_superadmin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Default Authorized Users

The following users are pre-configured with access:

1. **miraculine.j@zohocorp.com**
   - Role: superadmin
   - Can manage other authorized users
   - Full access to all features

2. **rajendran@zohocorp.com**
   - Role: admin
   - Full access to application features
   - Cannot manage authorized users

## Access Control Flow

### 1. OAuth Authentication
- User clicks "Login with Zoho" button
- Redirected to Zoho OAuth consent screen
- User authorizes the application
- Zoho redirects back with authorization code

### 2. Authorization Check
- Server exchanges authorization code for access token
- Extracts user email from JWT token
- **Checks if email exists in `authorized_users` table**
- If authorized: Proceeds to application
- If unauthorized: Redirects to error page

### 3. Unauthorized Access
- Unauthorized users are redirected to `/unauthorized` page
- Error page displays user's email address
- Provides contact information for access requests
- Option to try logging in again

## API Endpoints

### Authorized Users Management

#### Get All Authorized Users
**GET** `/api/authorized-users`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "miraculine.j@zohocorp.com",
      "name": "Miraculine J",
      "role": "superadmin",
      "is_superadmin": true,
      "created_at": "2025-10-01T12:24:47.233Z",
      "updated_at": "2025-10-01T12:24:47.233Z"
    }
  ]
}
```

#### Add New Authorized User
**POST** `/api/authorized-users`

**Request Body:**
```json
{
  "email": "newuser@zohocorp.com",
  "name": "New User",
  "role": "user",
  "is_superadmin": false
}
```

**Required Fields:**
- `email` (string, unique)

**Optional Fields:**
- `name` (string)
- `role` (string, default: 'user')
- `is_superadmin` (boolean, default: false)

#### Update Authorized User
**PUT** `/api/authorized-users/:email`

**Request Body:**
```json
{
  "name": "Updated Name",
  "role": "admin",
  "is_superadmin": true
}
```

#### Remove Authorized User
**DELETE** `/api/authorized-users/:email`

## User Roles

### Superadmin
- Full access to all application features
- Can manage authorized users (add, update, remove)
- Can access all API endpoints
- Pre-configured: miraculine.j@zohocorp.com

### Admin
- Full access to application features
- Cannot manage authorized users
- Can access all application APIs
- Pre-configured: rajendran@zohocorp.com

### User
- Standard access to application features
- Cannot manage authorized users
- Can access application APIs

## Security Features

### 1. Email Whitelist
- Only pre-authorized email addresses can access the application
- Email addresses must be explicitly added to the database
- No wildcard or pattern matching

### 2. JWT Token Validation
- User email is extracted from Zoho's JWT token
- Email verification is checked from JWT payload
- No manual email input or bypassing

### 3. Database Verification
- Authorization check is performed against database
- Real-time verification on each login
- No caching of authorization status

### 4. Error Handling
- Graceful handling of authorization failures
- Clear error messages for unauthorized users
- Secure error page with no sensitive information

## Error Pages

### Unauthorized Access Page
- **URL:** `/unauthorized?email=user@example.com`
- **Purpose:** Inform users they don't have access
- **Features:**
  - Displays user's email address
  - Contact information for access requests
  - Option to try logging in again
  - Professional error page design

## Adding New Users

### Via API (Programmatic)
```bash
curl -X POST https://bees-repo.onrender.com/api/authorized-users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@zohocorp.com",
    "name": "New User",
    "role": "user"
  }'
```

### Via Database (Direct)
```sql
INSERT INTO authorized_users (email, name, role, is_superadmin) 
VALUES ('newuser@zohocorp.com', 'New User', 'user', FALSE);
```

## Monitoring and Logs

### Authorization Attempts
- All authorization attempts are logged
- Unauthorized access attempts are clearly marked
- User email addresses are logged for audit purposes

### Database Logs
- User creation/update operations are logged
- Authorization check results are logged
- Error conditions are logged with details

## Testing Access Control

### Test Authorized User
1. Use miraculine.j@zohocorp.com or rajendran@zohocorp.com
2. Login through Zoho OAuth
3. Should be granted access to application

### Test Unauthorized User
1. Use any other Zoho email address
2. Login through Zoho OAuth
3. Should be redirected to unauthorized page

### Test API Endpoints
```bash
# Get authorized users
curl https://bees-repo.onrender.com/api/authorized-users

# Add new user
curl -X POST https://bees-repo.onrender.com/api/authorized-users \
  -H "Content-Type: application/json" \
  -d '{"email": "test@zohocorp.com", "name": "Test User"}'

# Remove user
curl -X DELETE https://bees-repo.onrender.com/api/authorized-users/test@zohocorp.com
```

## Troubleshooting

### Common Issues

1. **User can't access despite being in database**
   - Check email address matches exactly (case-sensitive)
   - Verify database connection is working
   - Check server logs for authorization errors

2. **Database connection issues**
   - Verify DATABASE_URL environment variable
   - Check Neon database connectivity
   - Review connection pool settings

3. **OAuth flow not working**
   - Verify Zoho OAuth configuration
   - Check redirect URI matches exactly
   - Ensure client ID and secret are correct

### Debug Commands

```bash
# Check server health
curl https://bees-repo.onrender.com/health

# Check authorized users
curl https://bees-repo.onrender.com/api/authorized-users

# Test unauthorized page
curl https://bees-repo.onrender.com/unauthorized?email=test@example.com
```

## Security Considerations

1. **Email Verification**: Only verified Zoho email addresses should be added
2. **Regular Audits**: Periodically review authorized users list
3. **Role Management**: Use appropriate roles for different access levels
4. **Database Security**: Ensure database access is properly secured
5. **Log Monitoring**: Monitor logs for unauthorized access attempts

## Future Enhancements

1. **Group-based Access**: Support for user groups/teams
2. **Time-based Access**: Temporary access with expiration
3. **IP Restrictions**: Additional IP-based access control
4. **Audit Trail**: Detailed logging of all access attempts
5. **Admin Dashboard**: Web interface for managing authorized users
