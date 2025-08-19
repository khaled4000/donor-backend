const express = require('express');
const Case = require('../models/Case');
const User = require('../models/User');
const { adminAuth } = require('../middleware/adminAuth');
const { body, validationResult, param } = require('express-validator');
const router = express.Router();

// Input validation for case decisions
const validateCaseDecision = [
  param('caseId').trim().isLength({ min: 1 }).withMessage('Case ID is required'),
  body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected'),
  body('comments').trim().isLength({ min: 10 }).withMessage('Comments must be at least 10 characters'),
  body('finalDamagePercentage').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0, max: 100 }).withMessage('Damage percentage must be between 0 and 100'),
  body('estimatedCost').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 1 }).withMessage('Estimated cost must be greater than 0'),
];

// Get pending cases - GET /api/admin/cases/pending
router.get('/cases/pending', adminAuth, async (req, res) => {
  try {
    console.log('🔍 ADMIN DASHBOARD - Getting pending cases');

    const { village, limit = 20, offset = 0 } = req.query;

    // Sanitize and validate query parameters
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const sanitizedOffset = Math.max(parseInt(offset) || 0, 0);

    const query = { status: 'submitted' };

    if (village && village.trim() !== '' && village !== 'all') {
      query['familyData.village'] = village.trim();
    }

    console.log('🔍 ADMIN DASHBOARD - Query:', query);

    const cases = await Case.find(query)
      .sort({ submittedAt: 1 }) // Oldest first
      .limit(sanitizedLimit)
      .skip(sanitizedOffset)
      .populate('userId', 'firstName lastName email phone registrationDate');

    const total = await Case.countDocuments(query);

    const formattedCases = cases.map(caseItem => ({
      caseId: caseItem.caseId,
      status: caseItem.status,
      submittedDate: caseItem.submittedAt ? caseItem.submittedAt.toISOString() : null,
      familyData: {
        familyName: caseItem.familyData.familyName,
        headOfHousehold: caseItem.familyData.headOfHousehold,
        phoneNumber: caseItem.familyData.phoneNumber,
        email: caseItem.familyData.email,
        numberOfMembers: caseItem.familyData.numberOfMembers,
        village: caseItem.familyData.village,
        currentAddress: caseItem.familyData.currentAddress,
        originalAddress: caseItem.familyData.originalAddress,
        destructionDate: caseItem.familyData.destructionDate,
        destructionCause: caseItem.familyData.destructionCause,
        destructionPercentage: caseItem.familyData.destructionPercentage,
        damageDescription: caseItem.familyData.damageDescription,
        previouslyReceivedAid: caseItem.familyData.previouslyReceivedAid,
        propertyType: caseItem.familyData.propertyType,
        ownershipStatus: caseItem.familyData.ownershipStatus,
      },
      uploadedFiles: caseItem.uploadedFiles.map(file => ({
        name: file.name,
        originalName: file.originalName,
        type: file.type,
        size: file.size,
        category: file.category,
        description: file.description,
        uploadDate: file.uploadDate,
        // Note: base64 data excluded for performance
      })),
      submitterInfo: caseItem.userId ? {
        name: `${caseItem.userId.firstName} ${caseItem.userId.lastName}`,
        email: caseItem.userId.email,
        phone: caseItem.userId.phone,
        registrationDate: caseItem.userId.registrationDate,
      } : null,
      formCompletion: caseItem.formCompletion,
    }));

    console.log('🔍 ADMIN DASHBOARD - Found', formattedCases.length, 'pending cases');

    res.json({
      message: 'Pending cases retrieved successfully',
      cases: formattedCases,
      total,
      pagination: {
        limit: sanitizedLimit,
        offset: sanitizedOffset,
        hasMore: (sanitizedOffset + formattedCases.length) < total,
      },
    });

  } catch (error) {
    console.error('❌ ADMIN DASHBOARD ERROR - Get pending cases:', error);
    res.status(500).json({ message: 'Error retrieving pending cases' });
  }
});

// Get case details for review - GET /api/admin/cases/:caseId/review
router.get('/cases/:caseId/review', adminAuth, async (req, res) => {
  try {
    const { caseId } = req.params;

    console.log('🔍 ADMIN DASHBOARD - Getting case details for:', caseId);

    const caseItem = await Case.findOne({ caseId: caseId.trim() })
      .populate('userId', 'firstName lastName email phone registrationDate');

    if (!caseItem) {
      console.log('❌ ADMIN DASHBOARD - Case not found:', caseId);
      return res.status(404).json({ message: 'Case not found' });
    }

    const caseDetails = {
      caseId: caseItem.caseId,
      status: caseItem.status,
      familyData: caseItem.familyData,
      uploadedFiles: caseItem.uploadedFiles, // Include base64 for detailed review
      submittedDate: caseItem.submittedAt,
      createdDate: caseItem.createdAt,
      lastModified: caseItem.lastModified,
      formCompletion: caseItem.formCompletion,
      submitterInfo: caseItem.userId ? {
        name: `${caseItem.userId.firstName} ${caseItem.userId.lastName}`,
        email: caseItem.userId.email,
        phone: caseItem.userId.phone,
        registrationDate: caseItem.userId.registrationDate,
      } : null,
      checkerDecision: caseItem.checkerDecision,
    };

    console.log('🔍 ADMIN DASHBOARD - Case details retrieved for:', caseId);

    res.json({
      message: 'Case details retrieved successfully',
      case: caseDetails,
    });

  } catch (error) {
    console.error('❌ ADMIN DASHBOARD ERROR - Get case details:', error);
    res.status(500).json({ message: 'Error retrieving case details' });
  }
});

// Submit case decision - POST /api/admin/cases/:caseId/decision
router.post('/cases/:caseId/decision', adminAuth, validateCaseDecision, async (req, res) => {
  try {
    console.log('🔍 ADMIN DASHBOARD - Submitting case decision');
    console.log('🔍 ADMIN DASHBOARD - Request params:', req.params);
    console.log('🔍 ADMIN DASHBOARD - Request body:', req.body);
    console.log('🔍 ADMIN DASHBOARD - Admin user:', req.admin ? { id: req.admin._id, email: req.admin.email } : 'No admin');

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ ADMIN DASHBOARD - Validation errors:', errors.array());
      return res.status(400).json({
        message: 'Invalid input data',
        errors: errors.array(),
      });
    }

    const { caseId } = req.params;
    const { decision, comments, finalDamagePercentage, estimatedCost } = req.body;

    // Additional validation for approved cases
    if (decision === 'approved') {
      const damagePercentage = parseFloat(finalDamagePercentage);
      const cost = parseFloat(estimatedCost);

      console.log('🔍 ADMIN DASHBOARD - Approval validation:', {
        originalDamage: finalDamagePercentage,
        parsedDamage: damagePercentage,
        originalCost: estimatedCost,
        parsedCost: cost,
      });

      if (isNaN(damagePercentage) || damagePercentage < 0 || damagePercentage > 100) {
        return res.status(400).json({
          message: 'Invalid final damage percentage',
          errors: [
            { field: 'finalDamagePercentage', message: 'Must be a number between 0 and 100' },
          ],
        });
      }

      if (isNaN(cost) || cost <= 0) {
        return res.status(400).json({
          message: 'Invalid estimated cost',
          errors: [
            { field: 'estimatedCost', message: 'Must be a number greater than 0' },
          ],
        });
      }
    }

    console.log('🔍 ADMIN DASHBOARD - Processing decision for case:', caseId);

    // Find the case
    const caseItem = await Case.findOne({ caseId: caseId.trim() });

    if (!caseItem) {
      console.log('❌ ADMIN DASHBOARD - Case not found:', caseId);
      return res.status(404).json({ message: 'Case not found' });
    }

    if (caseItem.status !== 'submitted') {
      console.log('❌ ADMIN DASHBOARD - Case not in submitted status:', caseItem.status);
      return res.status(400).json({
        message: 'Case is not in submitted status and cannot be reviewed',
      });
    }

    // Create sanitized decision data
    const decisionData = {
      checkerId: req.admin._id,
      decision: decision.trim(),
      comments: comments.trim(),
      finalDamagePercentage: decision === 'approved' ? parseFloat(finalDamagePercentage) : undefined,
      estimatedCost: decision === 'approved' ? parseFloat(estimatedCost) : undefined,
      timestamp: new Date(),
    };

    // Update case with decision
    caseItem.status = decision.trim();
    caseItem.checkerDecision = decisionData;

    if (decision === 'approved') {
      caseItem.totalNeeded = parseFloat(estimatedCost);
      caseItem.approvedAt = new Date();
    }

    await caseItem.save();

    console.log('🔍 ADMIN DASHBOARD - Decision saved for case:', caseId, 'Decision:', decision);

    res.json({
      message: `Case ${decision} successfully`,
      decision: {
        caseId: caseItem.caseId,
        decision: decision.trim(),
        comments: comments.trim(),
        finalDamagePercentage: decisionData.finalDamagePercentage,
        estimatedCost: decisionData.estimatedCost,
        timestamp: decisionData.timestamp,
        checkerName: `${req.admin.firstName} ${req.admin.lastName}`,
      },
      case: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        totalNeeded: caseItem.totalNeeded,
        approvedAt: caseItem.approvedAt,
      },
    });

  } catch (error) {
    console.error('❌ ADMIN DASHBOARD ERROR - Submit decision:', error);
    res.status(500).json({ message: 'Error submitting decision' });
  }
});

// Get admin dashboard statistics - GET /api/admin/stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    console.log('🔍 ADMIN DASHBOARD - Getting statistics');

    // Get case statistics
    const caseStats = await Case.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const caseStatusCounts = {};
    caseStats.forEach(stat => {
      caseStatusCounts[stat._id] = stat.count;
    });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCases = await Case.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const recentSubmissions = await Case.countDocuments({
      submittedAt: { $gte: thirtyDaysAgo },
    });

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const userCounts = {};
    userStats.forEach(stat => {
      userCounts[stat._id] = stat.count;
    });

    const stats = {
      cases: {
        total: Object.values(caseStatusCounts).reduce((sum, count) => sum + count, 0),
        pending: caseStatusCounts.submitted || 0,
        approved: caseStatusCounts.approved || 0,
        rejected: caseStatusCounts.rejected || 0,
        draft: caseStatusCounts.draft || 0,
      },
      users: {
        total: Object.values(userCounts).reduce((sum, count) => sum + count, 0),
        families: userCounts.family || 0,
        donors: userCounts.donor || 0,
        checkers: userCounts.checker || 0,
      },
      activity: {
        recentCases,
        recentSubmissions,
      },
    };

    console.log('🔍 ADMIN DASHBOARD - Statistics retrieved');

    res.json({
      message: 'Admin statistics retrieved successfully',
      stats,
    });

  } catch (error) {
    console.error('❌ ADMIN DASHBOARD ERROR - Get statistics:', error);
    res.status(500).json({ message: 'Error retrieving statistics' });
  }
});

module.exports = router;
