# 🚀 Render Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. Environment Variables (.env file)
Create a `.env` file in your backend directory with these variables:

```bash
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@donor-frontend1.onrender.com

# Frontend URL
FRONTEND_URL=https://donor-frontend1.onrender.com

# Environment
NODE_ENV=production
```

### 2. Database Setup
- [ ] Set up MongoDB Atlas account
- [ ] Create a new cluster
- [ ] Create database user with read/write permissions
- [ ] Get connection string
- [ ] Whitelist IP addresses (or use 0.0.0.0/0 for Render)

### 3. Email Service Setup
- [ ] Set up SendGrid account (recommended)
- [ ] Get API key
- [ ] Verify sender email address
- [ ] Test email sending

## 🚀 Render Deployment Steps

### 1. Connect Repository
- [ ] Push your code to GitHub/GitLab
- [ ] Connect your repository to Render
- [ ] Select the backend directory as root

### 2. Configure Service
- [ ] Service Type: Web Service
- [ ] Name: donor-project-backend
- [ ] Environment: Node
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Health Check Path: `/api/health`

### 3. Set Environment Variables
In Render dashboard, set these environment variables:

#### Required Variables:
- [ ] `MONGODB_URI` - Your MongoDB Atlas connection string
- [ ] `JWT_SECRET` - Your JWT secret key
- [ ] `FRONTEND_URL` - Your production frontend URL

#### Email Service Variables (Choose ONE):
**Option 1: SendGrid**
- [ ] `SENDGRID_API_KEY` - Your SendGrid API key

**Option 2: Traditional SMTP**
- [ ] `EMAIL_HOST` - SMTP server hostname
- [ ] `EMAIL_USER` - SMTP username
- [ ] `EMAIL_PASS` - SMTP password
- [ ] `EMAIL_FROM` - Sender email address

#### Optional Variables:
- [ ] `NODE_ENV` - Set to "production"
- [ ] `PORT` - Render sets this automatically

### 4. Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for build to complete
- [ ] Check health endpoint: `https://your-service.onrender.com/api/health`
- [ ] Test API endpoints

## 🔍 Post-Deployment Testing

### 1. Health Check
- [ ] Visit `/api/health` endpoint
- [ ] Verify database connection status
- [ ] Check uptime and status

### 2. API Testing
- [ ] Test user registration: `POST /api/auth/register`
- [ ] Test user login: `POST /api/auth/login`
- [ ] Test case creation: `POST /api/cases`
- [ ] Test file upload: `POST /api/files/upload`

### 3. Email Testing
- [ ] Test email verification
- [ ] Test password reset emails
- [ ] Verify email templates

## 🚨 Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check package.json dependencies
   - Verify Node.js version compatibility
   - Check build logs in Render dashboard

2. **Database Connection Fails**
   - Verify MONGODB_URI is correct
   - Check IP whitelist in MongoDB Atlas
   - Verify database user permissions

3. **Email Service Fails**
   - Check API keys are correct
   - Verify sender email is verified
   - Check email service logs

4. **CORS Issues**
   - Verify FRONTEND_URL is set correctly
   - Check CORS configuration in server.js

### 3. CORS Configuration
Ensure your backend accepts requests from your frontend domain:

```javascript
// In server.js or your CORS configuration
const allowedOrigins = [
  'http://localhost:5173', // Development
  'http://localhost:3000', // Alternative development
  'https://donor-frontend1.onrender.com', // Production frontend
  process.env.FRONTEND_URL // Environment variable fallback
];
```

**Verify these settings:**
- [ ] `FRONTEND_URL` - Your production frontend URL
- [ ] CORS origins include your frontend domain
- [ ] Credentials are enabled for authentication

## 📱 Frontend Integration

### 1. Frontend Configuration
Update your frontend environment variables:

```bash
# Production environment
VITE_API_BASE_URL=https://donor-backend-dxxd.onrender.com/api
VITE_FRONTEND_URL=https://donor-frontend1.onrender.com
```

### 2. Backend CORS
Ensure your backend accepts requests from:
- `https://donor-frontend1.onrender.com` (production)
- `http://localhost:5173` (development)

### 3. Email Verification Links
Email verification and password reset links will now point to:
- **Production**: `https://donor-frontend1.onrender.com/verify-email`
- **Development**: `http://localhost:5173/verify-email`

## 🔒 Security Checklist

- [ ] JWT_SECRET is at least 32 characters long
- [ ] MONGODB_URI uses authentication
- [ ] Email service credentials are secure
- [ ] CORS is properly configured
- [ ] Environment variables are not exposed in code

## 📊 Monitoring

- [ ] Set up Render monitoring
- [ ] Check application logs regularly
- [ ] Monitor database performance
- [ ] Set up error alerts

---

**Need Help?** Check Render documentation or your application logs for specific error messages.

## ✅ Verification

### 1. Backend Health
- [ ] Backend responds at `https://donor-backend-dxxd.onrender.com/api/health`
- [ ] Database connection is active
- [ ] All routes are accessible

### 2. Frontend Integration
- [ ] Frontend connects to backend API
- [ ] Authentication flow works
- [ ] Email verification links work
- [ ] CORS issues resolved

### 3. Email Service
- [ ] Verification emails sent with correct frontend URL
- [ ] Password reset emails work
- [ ] Welcome emails sent to new users

### 4. Final Checks
- [ ] Verify FRONTEND_URL is set correctly
- [ ] Test complete user registration flow
- [ ] Test admin and checker functionality
- [ ] Monitor backend logs for errors
