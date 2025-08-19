// Email Service Utility
// For production, integrate with services like SendGrid, AWS SES, or Nodemailer

const nodemailer = require('nodemailer');
const crypto = require('crypto');
const frontendConfig = require('../config/frontend');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // Try SendGrid first (recommended for production)
    if (process.env.SENDGRID_API_KEY) {
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    }

    // Fallback to Gmail SMTP
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }

    // Development fallback - log emails instead of sending
    console.log('⚠️ No email provider configured. Emails will be logged to console.');
    return {
      sendMail: (options) => {
        console.log('📧 EMAIL WOULD BE SENT:', {
          to: options.to,
          subject: options.subject,
          html: options.html
        });
        return Promise.resolve({ messageId: 'dev-mode-' + Date.now() });
      }
    };
  }

  generateVerificationEmail(user, token) {
    const verificationUrl = `${frontendConfig.FRONTEND_URL}/verify-email?token=${token}&email=${user.email}`;
    
    return {
      to: user.email,
      subject: 'Verify Your Email - South Lebanon Donor Project',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2d8959; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: #2d8959; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
            <h1>South Lebanon Donor Project</h1>
          </div>
            <div class="content">
              <h2>Welcome, ${user.firstName}!</h2>
              <p>Thank you for registering with the South Lebanon Donor Project. To complete your registration and access your account, please verify your email address.</p>
              
              <p>Click the button below to verify your email:</p>
              
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            
            <p>Or copy and paste this link into your browser:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              
              <p><strong>Important:</strong> This verification link will expire in 24 hours.</p>
              
              <p>If you didn't create this account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the South Lebanon Donor Project system.</p>
              <p>© ${new Date().getFullYear()} South Lebanon Donor Project. All rights reserved.</p>
          </div>
        </div>
        </body>
        </html>
      `
    };
  }

  generatePasswordResetEmail(user, token) {
    const resetUrl = `${frontendConfig.FRONTEND_URL}/reset-password?token=${token}&email=${user.email}`;
    
    return {
      to: user.email,
      subject: 'Reset Your Password - South Lebanon Donor Project',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
            <h1>Password Reset Request</h1>
          </div>
            <div class="content">
              <h2>Hello, ${user.firstName}!</h2>
              <p>We received a request to reset your password for your South Lebanon Donor Project account.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
            
            <p>Or copy and paste this link into your browser:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              
              <p><strong>Important:</strong> This reset link will expire in 1 hour.</p>
              
              <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the South Lebanon Donor Project system.</p>
              <p>© ${new Date().getFullYear()} South Lebanon Donor Project. All rights reserved.</p>
          </div>
        </div>
        </body>
        </html>
      `
    };
  }

  async sendEmail(emailData) {
    try {
      if (!emailData.to || !emailData.subject || !emailData.html) {
        throw new Error('Missing required email fields: to, subject, html');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@donorproject.com',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: this.htmlToText(emailData.html) // Fallback text version
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully:', {
          to: emailData.to,
          subject: emailData.subject,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  htmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  async sendVerificationEmail(user) {
    try {
      // Generate verification token
    const token = user.generateEmailVerificationToken();
      await user.save();

      // Create email content
    const emailData = this.generateVerificationEmail(user, token);
    
      // Send email
    const sent = await this.sendEmail(emailData);
      
    if (sent) {
        console.log(`📧 Verification email sent to ${user.email}`);
      return true;
      } else {
        console.error(`❌ Failed to send verification email to ${user.email}`);
        return false;
    }
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
    return false;
    }
  }

  async sendPasswordResetEmail(user) {
    try {
      // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();
    
      // Create email content
    const emailData = this.generatePasswordResetEmail(user, token);
    
      // Send email
      const sent = await this.sendEmail(emailData);
      
      if (sent) {
        console.log(`📧 Password reset email sent to ${user.email}`);
        return true;
      } else {
        console.error(`❌ Failed to send password reset email to ${user.email}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(user) {
    try {
      const emailData = {
        to: user.email,
        subject: 'Welcome to South Lebanon Donor Project!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome!</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to South Lebanon Donor Project!</h1>
              </div>
              <div class="content">
                <h2>Hello, ${user.firstName}!</h2>
                <p>Your account has been successfully verified and activated. Welcome to the South Lebanon Donor Project community!</p>
                
                <p>You can now:</p>
                <ul>
                  <li>Access your dashboard</li>
                  <li>Submit cases (if you're a family member)</li>
                  <li>Make donations (if you're a donor)</li>
                  <li>Review cases (if you're a checker)</li>
                </ul>
                
                <p>Thank you for joining us in helping families affected by the recent events in South Lebanon.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} South Lebanon Donor Project. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const sent = await this.sendEmail(emailData);
      
      if (sent) {
        console.log(`📧 Welcome email sent to ${user.email}`);
        return true;
      } else {
        console.error(`❌ Failed to send welcome email to ${user.email}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      return false;
    }
  }

  async sendCheckerWelcomeEmail(checker, temporaryPassword, createdByAdmin) {
    try {
      const loginUrl = `${frontendConfig.FRONTEND_URL}/login`;
      
      const emailData = {
        to: checker.email,
        subject: 'Your Checker Account - South Lebanon Donor Project',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Checker Account Created</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .credentials { background: #e5e7eb; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
              .warning { background: #fef3c7; color: #92400e; padding: 10px; border-radius: 5px; margin: 15px 0; }
              .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔍 Checker Account Created</h1>
                <p>South Lebanon Donor Project</p>
              </div>
              <div class="content">
                <h2>Hello, ${checker.firstName} ${checker.lastName}!</h2>
                <p>A Checker account has been created for you by <strong>${createdByAdmin.firstName} ${createdByAdmin.lastName}</strong> (${createdByAdmin.email}).</p>
                
                <p>As a Checker, you'll be responsible for:</p>
                <ul>
                  <li>Reviewing submitted family cases</li>
                  <li>Verifying damage assessments and documentation</li>
                  <li>Approving or rejecting cases based on guidelines</li>
                  <li>Providing cost estimates for approved cases</li>
                </ul>

                <div class="credentials">
                  <h3>🔑 Your Login Credentials:</h3>
                  <p><strong>Email:</strong> ${checker.email}</p>
                  ${checker.username ? `<p><strong>Username:</strong> ${checker.username}</p>` : ''}
                  <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
                </div>

                <div class="warning">
                  <p><strong>⚠️ Important Security Note:</strong><br>
                  Please change your password after your first login for security reasons.</p>
                </div>

                <p>You can access your Checker Dashboard using the link below:</p>
                <a href="${loginUrl}" class="btn">Login to Checker Dashboard</a>

                <p>If you have any questions about your role or the platform, please contact the admin who created your account.</p>
              </div>
              <div class="footer">
                <p>This account was created on ${new Date().toLocaleDateString()} by ${createdByAdmin.firstName} ${createdByAdmin.lastName}</p>
                <p>© ${new Date().getFullYear()} South Lebanon Donor Project. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const sent = await this.sendEmail(emailData);
      
      if (sent) {
        console.log(`📧 Checker welcome email sent to ${checker.email}`);
        return true;
      } else {
        console.error(`❌ Failed to send checker welcome email to ${checker.email}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending checker welcome email:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
