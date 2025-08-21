# 🚀 Render Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. Environment Variables (.env file)
Create a `.env` file in your backend directory with these variables:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/donor-project

# Security
JWT_SECRET=your_very_long_random_secret_key_at_least_32_characters

# Email Service (Choose ONE option)

# Option 1: SendGrid (Recommended)
SENDGRID_API_KEY=your_sendgrid_api_key

# Option 2: Traditional SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_PORT=587

# Frontend URL
FRONTEND_URL=https://your-frontend-domain.com

# Environment
NODE_ENV=production
PORT=5000
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

## 📱 Frontend Integration

After backend deployment:

1. Update frontend API base URL to your Render backend URL
2. Test all API calls from frontend
3. Verify authentication flow works
4. Test file uploads and downloads

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
