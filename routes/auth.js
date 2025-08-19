const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const emailService = require('../utils/emailService');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phone, address } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({
        message: 'Please fill in all required fields',
        fields: {
          firstName: !firstName ? ['First name is required'] : undefined,
          lastName: !lastName ? ['Last name is required'] : undefined,
          email: !email ? ['Email is required'] : undefined,
          password: !password ? ['Password is required'] : undefined,
          role: !role ? ['User role is required'] : undefined,
        },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
        fields: { password: ['Password must be at least 6 characters long'] },
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists',
        fields: { email: ['An account with this email already exists'] },
      });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role,
      userType: role, // For compatibility
      phone,
      address,
    });

    await user.save();

    // Send verification email for donor and family roles
    let verificationSent = false;
    if (role === 'donor' || role === 'family') {
      try {
        verificationSent = await emailService.sendVerificationEmail(user);
        console.log(`📧 Verification email ${verificationSent ? 'sent' : 'failed'} for ${email}`);
        
        if (!verificationSent) {
          console.log('⚠️ User created but verification email failed to send');
        }
      } catch (emailError) {
        console.error('❌ Email verification error:', emailError);
        verificationSent = false;
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role, 
        email: user.email,
        emailVerified: user.emailVerified || false
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '24h' },
    );

    res.status(201).json({
      message: role === 'donor' || role === 'family' 
        ? 'User created successfully. Please check your email to verify your account.'
        : 'User created successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        userType: user.userType,
        registrationDate: user.registrationDate,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
      requiresVerification: role === 'donor' || role === 'family',
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email already exists',
        fields: { email: ['An account with this email already exists'] },
      });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('🔍 LOGIN DEBUG - Login attempt started');
    console.log('🔍 LOGIN DEBUG - Request body:', req.body);

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log('❌ LOGIN ERROR - Missing email or password');
      return res.status(400).json({
        message: 'Please fill in all fields',
        fields: {
          email: !email ? ['Email is required'] : undefined,
          password: !password ? ['Password is required'] : undefined,
        },
      });
    }

    console.log('🔍 LOGIN DEBUG - Looking for user with email:', email);

    // Find user
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      console.log('❌ LOGIN ERROR - User not found or inactive');
      return res.status(400).json({ message: 'Invalid email or password. Please try again.' });
    }

    console.log('🔍 LOGIN DEBUG - User found:', { id: user._id, email: user.email, role: user.role });

    // Check password
    console.log('🔍 LOGIN DEBUG - Comparing passwords...');
    const isMatch = await user.comparePassword(password);
    console.log('🔍 LOGIN DEBUG - Password match result:', isMatch);

    if (!isMatch) {
      console.log('❌ LOGIN ERROR - Password does not match');
      return res.status(400).json({ message: 'Invalid email or password. Please try again.' });
    }

    // Check email verification for donor and family roles
    if ((user.role === 'donor' || user.role === 'family') && !user.emailVerified) {
      console.log('❌ LOGIN ERROR - Email not verified for user:', user.email);
      return res.status(403).json({
        message: 'Please verify your email address before logging in. Check your inbox for a verification link.',
        requiresVerification: true,
        email: user.email
      });
    }

    console.log('🔍 LOGIN DEBUG - Updating last login date...');
    // Update last login date
    user.lastLoginDate = new Date();
    await user.save();

    console.log('🔍 LOGIN DEBUG - Generating JWT token...');
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role, 
        email: user.email,
        emailVerified: user.emailVerified || false
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '24h' },
    );

    console.log('🔍 LOGIN DEBUG - Login successful, sending response');
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        userType: user.userType,
        lastLoginDate: user.lastLoginDate,
        registrationDate: user.registrationDate,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('❌ LOGIN ERROR - Full error:', error);
    console.error('❌ LOGIN ERROR - Error message:', error.message);
    console.error('❌ LOGIN ERROR - Error stack:', error.stack);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({ message: 'Token and email are required' });
    }

    const user = await User.findOne({ 
      email, 
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
      console.log(`📧 Welcome email sent to ${user.email}`);
    } catch (welcomeError) {
      console.error('❌ Failed to send welcome email:', welcomeError);
      // Don't fail the verification if welcome email fails
    }

    // Generate new JWT token
    const newToken = jwt.sign(
      { 
        userId: user._id, 
        role: user.role, 
        email: user.email,
        emailVerified: true
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '24h' },
    );

    res.json({
      message: 'Email verified successfully! You can now log in.',
      token: newToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        emailVerified: true,
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Email verification failed' });
  }
});

// Resend verification email (no auth required - for unverified users)
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Check rate limiting (5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (user.emailVerificationExpires && user.emailVerificationExpires > fiveMinutesAgo) {
      return res.status(429).json({ 
        message: 'Please wait 5 minutes before requesting another verification email' 
      });
    }

    // Send new verification email
    const sent = await emailService.sendVerificationEmail(user);
    
    if (sent) {
      res.json({ 
        message: 'Verification email sent successfully',
        email: user.email
      });
    } else {
      res.status(500).json({ message: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Failed to resend verification email' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email, isActive: true });
    
    // Don't reveal if user exists or not
    if (user) {
      try {
        await emailService.sendPasswordResetEmail(user);
        await user.save(); // Save the reset token
      } catch (emailError) {
        console.error('Password reset email error:', emailError);
      }
    }

    // Always return success to prevent email enumeration
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Password reset request failed' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({ message: 'Token, email, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({ 
      email, 
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Password reset failed' });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        userType: user.userType,
        lastLoginDate: user.lastLoginDate,
        registrationDate: user.registrationDate,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, phone, address } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// TEST ROUTES - For testing MongoDB operations
// Get all users (for testing)
router.get('/test/users', async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Exclude password field
    res.json({
      message: 'Users fetched successfully',
      count: users.length,
      users: users,
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a test user (for testing)
router.post('/test/create-user', async (req, res) => {
  try {
    const testUser = new User({
      name: 'Test User',
      email: `test${Date.now()}@example.com`, // Unique email
      password: 'password123',
      role: 'donor',
      phone: '1234567890',
      address: 'Test Address',
    });

    await testUser.save();

    res.status(201).json({
      message: 'Test user created successfully',
      user: {
        id: testUser._id,
        name: testUser.name,
        email: testUser.email,
        role: testUser.role,
        createdAt: testUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Create test user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete all test users (cleanup)
router.delete('/test/cleanup', async (req, res) => {
  try {
    const result = await User.deleteMany({ email: { $regex: /^test.*@example\.com$/ } });
    res.json({
      message: 'Test users cleaned up',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// TEMPORARY: Update existing users to be email verified
// This route should be removed after all users are updated
router.post('/admin/update-existing-users', async (req, res) => {
  try {
    // Simple admin check (you can enhance this later)
    const { adminKey } = req.body;
    if (adminKey !== 'temporary-admin-key-2024') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('🔍 Updating existing users to be email verified...');
    
    // Get all existing users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users in database`);
    
    let updatedCount = 0;
    
    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.email} (${user.role})`);
      
      // Check if user needs updating
      if (user.emailVerified === undefined || user.emailVerified === false) {
        console.log(`  ⚠️  User needs email verification update`);
        
        // For admin/checker users, mark as verified immediately
        if (user.role === 'checker' || user.role === 'admin') {
          user.emailVerified = true;
          console.log(`  ✅ Marking ${user.role} as email verified`);
        } else {
          // For donor/family users, mark as verified for now
          // (you can change this to false if you want them to verify)
          user.emailVerified = true;
          console.log(`  ✅ Marking ${user.role} as email verified (existing user)`);
        }
        
        // Clear any existing verification tokens
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        
        await user.save();
        updatedCount++;
        console.log(`  💾 User updated successfully`);
      } else {
        console.log(`  ✅ User already has emailVerified: ${user.emailVerified}`);
      }
    }
    
    console.log(`\n🎉 Update complete! Updated ${updatedCount} users`);
    
    res.json({
      message: 'Existing users updated successfully',
      updatedCount,
      totalUsers: users.length,
      summary: {
        'Existing admin/checker users': 'Now marked as verified',
        'Existing donor/family users': 'Now marked as verified',
        'New users': 'Will still need email verification'
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating users:', error);
    res.status(500).json({ message: 'Failed to update users', error: error.message });
  }
});

module.exports = router;
