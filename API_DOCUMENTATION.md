# 📋 **Nahdat Watan | نهضة وطن API Documentation**

## 🚀 **Overview**

This is the complete REST API for Nahdat Watan | نهضة وطن. The API provides endpoints for user authentication, case management, donation processing, and administrative functions.

**Base URL:** `http://localhost:5000/api`
**Version:** 1.0.0

---

## 🔐 **Authentication**

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### **Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "donor", // "donor", "family", or "checker"
  "phone": "+961-XX-XXXXXX",
  "address": "Optional address"
}

Response: 201 Created
{
  "message": "User created successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "donor",
    "userType": "donor",
    "registrationDate": "2025-01-01T00:00:00.000Z",
    "isActive": true
  }
}
```

### **Login User**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response: 200 OK
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "donor",
    "userType": "donor",
    "lastLoginDate": "2025-01-01T00:00:00.000Z"
  }
}
```

### **Get User Profile**
```http
GET /api/auth/profile
Authorization: Bearer <token>

Response: 200 OK
{
  "user": {
    "id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+961-XX-XXXXXX",
    "role": "donor",
    "userType": "donor"
  }
}
```

---

## 🏠 **Case Management**

### **Create/Submit Case (Family only)**
```http
POST /api/cases
Authorization: Bearer <token>
Content-Type: application/json

{
  "familyData": {
    "familyName": "Al-Ahmad Family",
    "headOfHousehold": "Ahmad Al-Ahmad",
    "phoneNumber": "+961-XX-XXXXXX",
    "numberOfMembers": 5,
    "village": "Tyre",
    "currentAddress": "Current address details",
    "originalAddress": "Original address details",
    "destructionDate": "2023-10-07",
    "destructionPercentage": 80,
    "damageDescription": "House completely destroyed by bombing",
    "propertyType": "house",
    "ownershipStatus": "owned",
    "previouslyReceivedAid": "no"
  },
  "uploadedFiles": [
    {
      "name": "damage_photo_1.jpg",
      "type": "image/jpeg",
      "size": 1024000,
      "category": "property_damage",
      "description": "Photo of damaged house",
      "base64": "base64_encoded_file_data"
    }
  ]
}

Response: 201 Created
{
  "message": "Case created successfully",
  "case": {
    "caseId": "SLA-2025-123456",
    "status": "draft",
    "familyData": {...},
    "formCompletion": 85
  }
}
```

### **Get My Cases (Family only)**
```http
GET /api/cases/my-cases
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Cases fetched successfully",
  "cases": [
    {
      "caseId": "SLA-2025-123456",
      "status": "submitted",
      "familyName": "Al-Ahmad Family",
      "village": "Tyre",
      "progress": 100,
      "submittedDate": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### **Submit Case for Review**
```http
POST /api/cases/{caseId}/submit
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Case submitted successfully",
  "case": {
    "caseId": "SLA-2025-123456",
    "status": "submitted",
    "submittedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### **Get Verified Cases (For Donors)**
```http
GET /api/cases/verified/list?village=Tyre&limit=10&offset=0
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Verified cases fetched successfully",
  "cases": [
    {
      "id": "SLA-2025-123456",
      "family": "Al-Ahmad Family",
      "location": "Tyre, South Lebanon",
      "familySize": "5 members",
      "needed": "$12,000",
      "raised": "$3,000",
      "progress": 25,
      "verified": "01/01/2025",
      "damagePercentage": 80,
      "estimatedCost": 12000
    }
  ],
  "total": 1,
  "stats": {
    "totalCases": 1,
    "needFunding": 1,
    "totalRaised": 3000
  }
}
```

---

## 💰 **Donations**

### **Make Donation (Donor only)**
```http
POST /api/donations
Authorization: Bearer <token>
Content-Type: application/json

{
  "caseId": "SLA-2025-123456",
  "amount": 500,
  "paymentMethod": "credit_card",
  "anonymous": false,
  "message": "Hope this helps the family rebuild"
}

Response: 201 Created
{
  "message": "Donation successful",
  "donation": {
    "id": "DON-1234567890-ABC123",
    "caseId": "SLA-2025-123456",
    "familyName": "Al-Ahmad Family",
    "amount": 500,
    "date": "2025-01-01T00:00:00.000Z",
    "status": "completed"
  },
  "updatedCase": {
    "raised": "$3,500",
    "progress": 29
  }
}
```

### **Get Donation History (Donor only)**
```http
GET /api/donations/history?limit=10&offset=0
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Donation history fetched successfully",
  "donations": [
    {
      "id": "DON-1234567890-ABC123",
      "caseId": "SLA-2025-123456",
      "familyName": "Al-Ahmad Family",
      "amount": 500,
      "date": "2025-01-01T00:00:00.000Z",
      "status": "completed"
    }
  ],
  "stats": {
    "totalDonated": 1500,
    "familiesHelped": 3,
    "thisMonth": 500
  }
}
```

### **Get Donor Statistics**
```http
GET /api/donations/stats
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Donor statistics fetched successfully",
  "stats": {
    "totalDonated": 1500,
    "familiesHelped": 3,
    "thisMonth": 500,
    "averageDonation": 250,
    "lastDonation": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## 🔍 **Admin/Checker Routes**

### **Get Pending Cases (Checker only)**
```http
GET /api/admin/cases/pending?village=Tyre&limit=10&offset=0
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Pending cases fetched successfully",
  "cases": [
    {
      "caseId": "SLA-2025-123456",
      "status": "submitted",
      "submittedDate": "01/01/2025",
      "familyData": {...},
      "formCompletion": 100
    }
  ],
  "total": 1
}
```

### **Submit Case Decision (Checker only)**
```http
POST /api/admin/cases/{caseId}/decision
Authorization: Bearer <token>
Content-Type: application/json

{
  "decision": "approved", // "approved" or "rejected"
  "comments": "Case verified and approved for funding",
  "finalDamagePercentage": 85, // Required for approved cases
  "estimatedCost": 12000 // Required for approved cases
}

Response: 200 OK
{
  "message": "Decision submitted successfully",
  "decision": {
    "caseId": "SLA-2025-123456",
    "decision": "approved",
    "comments": "Case verified and approved for funding",
    "finalDamagePercentage": 85,
    "estimatedCost": 12000,
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

### **Get System Statistics (Checker only)**
```http
GET /api/admin/stats/overview
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "System statistics fetched successfully",
  "stats": {
    "totalUsers": 150,
    "totalCases": 45,
    "approvedCases": 30,
    "pendingCases": 10,
    "totalDonations": 85,
    "totalAmountRaised": 125000,
    "familiesHelped": 25,
    "byVillage": [
      {
        "village": "Tyre",
        "cases": 15,
        "approved": 12,
        "funded": "80%"
      }
    ]
  }
}
```

---

## 📁 **File Management**

### **Upload File**
```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: (binary file)
- category: "property_damage" // or "identification", "ownership", "other"
- description: "Photo of damaged property"
- caseId: "SLA-2025-123456" (optional)

Response: 201 Created
{
  "message": "File uploaded successfully",
  "file": {
    "id": "file_checksum_hash",
    "name": "1234567890-damage_photo.jpg",
    "originalName": "damage_photo.jpg",
    "type": "image/jpeg",
    "size": 1024000,
    "category": "property_damage",
    "url": "/api/files/file_checksum_hash"
  }
}
```

### **Get File**
```http
GET /api/files/{fileId}

Response: 200 OK
Content-Type: image/jpeg (or appropriate file type)
[Binary file data]
```

---

## 🛠️ **Utility Endpoints**

### **Health Check**
```http
GET /api/health

Response: 200 OK
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "database": "connected",
  "uptime": 3600
}
```

### **Get Villages List**
```http
GET /api/admin/villages

Response: 200 OK
{
  "message": "Villages list fetched successfully",
  "villages": [
    "Ain Baal", "Abra", "Adchit", "Adloun", 
    "Aita al-Shaab", "Tyre", "Bint Jbeil", ...
  ]
}
```

### **API Information**
```http
GET /api

Response: 200 OK
{
  "message": "Nahdat Watan | نهضة وطن API v1.0.0",
  "endpoints": {
    "auth": "/api/auth",
    "cases": "/api/cases",
    "donations": "/api/donations",
    "admin": "/api/admin",
    "files": "/api/files",
    "health": "/api/health"
  }
}
```

---

## ❌ **Error Responses**

All endpoints return standardized error responses:

### **400 Bad Request**
```json
{
  "message": "Validation failed",
  "fields": {
    "email": ["Email is required"],
    "password": ["Password must be at least 6 characters"]
  }
}
```

### **401 Unauthorized**
```json
{
  "message": "No token, authorization denied"
}
```

### **403 Forbidden**
```json
{
  "message": "Access denied. Donor role required."
}
```

### **404 Not Found**
```json
{
  "message": "Case not found"
}
```

### **500 Internal Server Error**
```json
{
  "message": "Server error"
}
```

---

## 🔒 **Role-Based Access Control**

### **Family Role:**
- Create and manage their own cases
- Submit cases for review
- View their case status and updates

### **Donor Role:**
- View verified/approved cases
- Make donations
- View donation history and statistics

### **Checker Role:**
- Review submitted cases
- Approve or reject cases
- View system statistics
- Access admin functions

---

## 📊 **Data Models**

### **User Schema**
```javascript
{
  firstName: String (required),
  lastName: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  role: String (donor|family|checker),
  phone: String,
  address: String,
  isActive: Boolean (default: true),
  registrationDate: Date,
  lastLoginDate: Date
}
```

### **Case Schema**
```javascript
{
  caseId: String (unique, auto-generated),
  userId: ObjectId (ref: User),
  status: String (draft|submitted|approved|rejected),
  familyData: {
    familyName: String (required),
    headOfHousehold: String (required),
    phoneNumber: String (required),
    numberOfMembers: Number (required),
    village: String (required),
    currentAddress: String (required),
    originalAddress: String (required),
    destructionDate: Date (required),
    destructionPercentage: Number (1-100),
    damageDescription: String (required),
    propertyType: String,
    ownershipStatus: String,
    previouslyReceivedAid: String
  },
  uploadedFiles: [FileSchema],
  checkerDecision: {
    checkerId: ObjectId,
    decision: String,
    comments: String,
    finalDamagePercentage: Number,
    estimatedCost: Number,
    timestamp: Date
  },
  totalNeeded: Number,
  totalRaised: Number,
  donationProgress: Number (0-100),
  createdAt: Date,
  submittedAt: Date,
  approvedAt: Date
}
```

### **Donation Schema**
```javascript
{
  donationId: String (unique, auto-generated),
  caseId: String (required),
  donorId: ObjectId (ref: User),
  donorName: String,
  donorEmail: String,
  familyName: String,
  location: String,
  village: String,
  amount: Number (required),
  paymentMethod: String,
  paymentStatus: String,
  anonymous: Boolean,
  message: String,
  donationDate: Date
}
```

---

## 🚀 **Getting Started**

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Set Environment Variables:**
   Create `.env` file with:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   ```

3. **Start Server:**
   ```bash
   npm run dev  # Development mode
   npm start    # Production mode
   ```

4. **Create Admin User:**
   ```bash
   node create-checker.js
   ```
   Default checker credentials:
   - Email: `checker@nahdatwatan.com`
   - Password: `checker123`

5. **Test API:**
   Visit `http://localhost:5000/api/health` to verify the server is running.

---

## 📝 **Frontend Integration Notes**

The API is designed to work seamlessly with your existing React frontend. Key integration points:

1. **Authentication:** Replace localStorage-based auth with API calls
2. **Case Management:** Replace localStorage case storage with API endpoints
3. **Donations:** Replace localStorage donation tracking with API endpoints
4. **File Uploads:** Use the file upload endpoints for document management

Example frontend integration:
```javascript
// Replace localStorage authentication
const register = async (userData) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return response.json();
};

// Replace localStorage case management
const submitCase = async (caseData) => {
  const response = await fetch('/api/cases', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(caseData)
  });
  return response.json();
};
```

---

## 🎯 **Production Considerations**

1. **Security:**
   - Use HTTPS in production
   - Implement rate limiting
   - Add input sanitization
   - Use strong JWT secrets

2. **Database:**
   - Set up proper MongoDB indexes
   - Implement database backups
   - Monitor database performance

3. **File Storage:**
   - Move from base64 to proper file storage (AWS S3, etc.)
   - Implement file compression
   - Add virus scanning

4. **Monitoring:**
   - Add logging middleware
   - Implement error tracking
   - Set up performance monitoring

5. **Deployment:**
   - Use environment-specific configs
   - Implement CI/CD pipeline
   - Set up load balancing for high traffic

---

This API provides a complete backend solution for Nahdat Watan | نهضة وطن, supporting all the functionality required by your React frontend.