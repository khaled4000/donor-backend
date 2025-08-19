const express = require('express');
const Case = require('../models/Case');
const User = require('../models/User');
const { auth, isChecker } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Lebanon villages coordinates for map visualization
const LEBANON_VILLAGES_COORDINATES = {
  'Tyre': { lat: 33.2703, lng: 35.2039 },
  'Bint Jbeil': { lat: 33.1215, lng: 35.4267 },
  'Nabatiye': { lat: 33.3708, lng: 35.4836 },
  'Marjayoun': { lat: 33.3608, lng: 35.5919 },
  'Saida': { lat: 33.5614, lng: 35.3714 },
  'Jezzine': { lat: 33.5475, lng: 35.5897 },
  'Ain Baal': { lat: 33.2889, lng: 35.2047 },
  'Abra': { lat: 33.5281, lng: 35.3558 },
  'Adchit': { lat: 33.6147, lng: 35.3978 },
  'Adloun': { lat: 33.4003, lng: 35.2839 },
  'Aita al-Shaab': { lat: 33.1044, lng: 35.4039 },
  'Al-Khiyam': { lat: 33.2972, lng: 35.6444 },
  'Alma ash-Shaab': { lat: 33.0644, lng: 35.3928 },
  'Ansar': { lat: 33.4983, lng: 35.4397 },
  'Arnoun': { lat: 33.3467, lng: 35.4761 },
  'Bafliyeh': { lat: 33.2342, lng: 35.1942 },
  'Blida': { lat: 33.1889, lng: 35.2081 },
  'Borj ash-Shamali': { lat: 33.2728, lng: 35.1628 },
  'Chamaa': { lat: 33.2728, lng: 35.1306 },
  'Deir Mimas': { lat: 33.4589, lng: 35.5406 },
  'Hanaway': { lat: 33.2042, lng: 35.1753 },
  'Houla': { lat: 33.1011, lng: 35.4631 },
  'Kafra': { lat: 33.1328, lng: 35.6481 },
  'Kfar Kila': { lat: 33.1056, lng: 35.5614 },
  'Khiam': { lat: 33.2972, lng: 35.6444 },
  'Majdal Zoun': { lat: 33.2339, lng: 35.6119 },
  'Mays al-Jabal': { lat: 33.0633, lng: 35.4628 },
  'Qana': { lat: 33.2069, lng: 35.3056 },
  'Rmeish': { lat: 33.0881, lng: 35.3339 },
  'Yaroun': { lat: 33.0528, lng: 35.4472 },
  'Tebnine': { lat: 33.2489, lng: 35.2628 },
  // Add more villages as needed
};

// Validation middleware for case decisions
const validateCaseDecision = [
  body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected'),
  body('comments').trim().isLength({ min: 10, max: 1000 }).withMessage('Comments must be between 10 and 1000 characters'),
  body('finalDamagePercentage')
    .if(body('decision').equals('approved'))
    .isFloat({ min: 0, max: 100 })
    .withMessage('Final damage percentage is required for approval and must be between 0 and 100'),
  body('estimatedCost')
    .if(body('decision').equals('approved'))
    .isFloat({ min: 100 })
    .withMessage('Estimated cost is required for approval and must be at least $100'),
];

// Get all cases assigned to checker for review
router.get('/cases', auth, isChecker, async (req, res) => {
  try {
    console.log('🔍 CHECKER - Getting cases for review');
    console.log('🔍 CHECKER - Checker ID:', req.user._id);

    const { status, village, limit = 50, offset = 0 } = req.query;

    // Build query for cases assigned to this checker or available for assignment
    const query = {
      $or: [
        { 'checkerAssignment.checkerId': req.user._id }, // Cases assigned to this checker
        { status: 'submitted', checkerAssignment: { $exists: false } }, // Unassigned submitted cases
      ],
    };

    // Add status filter if provided
    if (status && status !== 'all') {
      if (status === 'pending') {
        query.status = { $in: ['submitted', 'under_review'] };
      } else {
        query.status = status;
      }
    }

    // Add village filter if provided
    if (village && village !== 'all') {
      query['familyData.village'] = village;
    }

    console.log('🔍 CHECKER - Query:', JSON.stringify(query, null, 2));

    const cases = await Case.find(query)
      .sort({ submittedAt: 1, lastModified: -1 }) // Oldest submissions first
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('userId', 'firstName lastName email phone registrationDate')
      .populate('checkerAssignment.checkerId', 'firstName lastName email')
      .populate('checkerDecision.checkerId', 'firstName lastName email')
      .populate('auditLog.performedBy', 'firstName lastName role');

    const total = await Case.countDocuments(query);

    // Format cases with location coordinates and audit history
    const formattedCases = cases.map(caseItem => {
      const village = caseItem.familyData.village;
      const coordinates = LEBANON_VILLAGES_COORDINATES[village] || { lat: 33.8547, lng: 35.8623 }; // Default to Beirut

      return {
        caseId: caseItem.caseId,
        status: caseItem.status,
        priority: calculatePriority(caseItem), // Helper function to calculate priority
        
        // Family and case details
        familyData: {
          familyName: caseItem.familyData.familyName,
          headOfHousehold: caseItem.familyData.headOfHousehold,
          phoneNumber: caseItem.familyData.phoneNumber,
          email: caseItem.familyData.email,
          numberOfMembers: caseItem.familyData.numberOfMembers,
          childrenCount: caseItem.familyData.childrenCount || 0,
          elderlyCount: caseItem.familyData.elderlyCount || 0,
          specialNeedsCount: caseItem.familyData.specialNeedsCount || 0,
          village: caseItem.familyData.village,
          currentAddress: caseItem.familyData.currentAddress,
          originalAddress: caseItem.familyData.originalAddress,
          destructionDate: caseItem.familyData.destructionDate,
          destructionCause: caseItem.familyData.destructionCause,
          destructionPercentage: caseItem.familyData.destructionPercentage,
          damageDescription: caseItem.familyData.damageDescription,
          previouslyReceivedAid: caseItem.familyData.previouslyReceivedAid,
          aidDetails: caseItem.familyData.aidDetails,
          propertyType: caseItem.familyData.propertyType,
          ownershipStatus: caseItem.familyData.ownershipStatus,
          propertyValue: caseItem.familyData.propertyValue,
        },

        // Location data for map
        location: {
          village: village,
          coordinates: coordinates,
          address: caseItem.familyData.originalAddress,
        },

        // Documents and evidence
        uploadedFiles: caseItem.uploadedFiles.map(file => ({
          name: file.name,
          originalName: file.originalName,
          type: file.type,
          size: file.size,
          category: file.category,
          description: file.description,
          uploadDate: file.uploadDate,
          url: `/api/files/${file.checksum}`,
        })),

        // Submitter information
        submitterInfo: caseItem.userId ? {
          name: `${caseItem.userId.firstName} ${caseItem.userId.lastName}`,
          email: caseItem.userId.email,
          phone: caseItem.userId.phone,
          registrationDate: caseItem.userId.registrationDate,
        } : null,

        // Assignment and decision info
        assignment: caseItem.checkerAssignment ? {
          assignedAt: caseItem.checkerAssignment.assignedAt,
          assignedBy: caseItem.checkerAssignment.assignedBy,
          notes: caseItem.checkerAssignment.notes,
          checker: caseItem.checkerAssignment.checkerId ? {
            name: `${caseItem.checkerAssignment.checkerId.firstName} ${caseItem.checkerAssignment.checkerId.lastName}`,
            email: caseItem.checkerAssignment.checkerId.email,
          } : null,
        } : null,

        checkerDecision: caseItem.checkerDecision ? {
          decision: caseItem.checkerDecision.decision,
          comments: caseItem.checkerDecision.comments,
          finalDamagePercentage: caseItem.checkerDecision.finalDamagePercentage,
          estimatedCost: caseItem.checkerDecision.estimatedCost,
          timestamp: caseItem.checkerDecision.timestamp,
          checker: caseItem.checkerDecision.checkerId ? {
            name: `${caseItem.checkerDecision.checkerId.firstName} ${caseItem.checkerDecision.checkerId.lastName}`,
            email: caseItem.checkerDecision.checkerId.email,
          } : null,
        } : null,

        // Timestamps
        timestamps: {
          created: caseItem.createdAt,
          submitted: caseItem.submittedAt,
          lastModified: caseItem.lastModified,
          reviewStarted: caseItem.reviewStartedAt,
          approved: caseItem.approvedAt,
        },

        // Form completion and financial info
        formCompletion: caseItem.formCompletion,
        totalNeeded: caseItem.totalNeeded,
        totalRaised: caseItem.totalRaised,
        donationProgress: caseItem.donationProgress,

        // Audit trail (last 5 entries)
        recentAuditLog: caseItem.auditLog.slice(-5).map(log => ({
          action: log.action,
          timestamp: log.timestamp,
          performedByRole: log.performedByRole,
          performedBy: log.performedBy ? {
            name: `${log.performedBy.firstName} ${log.performedBy.lastName}`,
            role: log.performedBy.role,
          } : null,
          details: log.details,
          notes: log.notes,
        })),
      };
    });

    console.log('🔍 CHECKER - Found', formattedCases.length, 'cases');

    res.json({
      message: 'Cases retrieved successfully',
      cases: formattedCases,
      total,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + formattedCases.length) < total,
      },
      summary: {
        totalCases: total,
        pendingReview: formattedCases.filter(c => ['submitted', 'under_review'].includes(c.status)).length,
        approved: formattedCases.filter(c => c.status === 'approved').length,
        rejected: formattedCases.filter(c => c.status === 'rejected').length,
      },
    });

  } catch (error) {
    console.error('❌ CHECKER ERROR - Get cases:', error);
    res.status(500).json({ message: 'Error retrieving cases for review' });
  }
});

// Get specific case details for review
router.get('/cases/:caseId', auth, isChecker, async (req, res) => {
  try {
    const { caseId } = req.params;
    console.log('🔍 CHECKER - Getting case details for:', caseId);

    const caseItem = await Case.findOne({ caseId: caseId.trim() })
      .populate('userId', 'firstName lastName email phone registrationDate')
      .populate('checkerAssignment.checkerId', 'firstName lastName email')
      .populate('checkerDecision.checkerId', 'firstName lastName email')
      .populate('auditLog.performedBy', 'firstName lastName role email');

    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Check if checker has access to this case
    const hasAccess = 
      !caseItem.checkerAssignment || // Unassigned case
      caseItem.checkerAssignment.checkerId.toString() === req.user._id.toString(); // Assigned to this checker

    if (!hasAccess) {
      return res.status(403).json({ message: 'This case is assigned to another checker' });
    }

    const village = caseItem.familyData.village;
    const coordinates = LEBANON_VILLAGES_COORDINATES[village] || { lat: 33.8547, lng: 35.8623 };

    const caseDetails = {
      caseId: caseItem.caseId,
      status: caseItem.status,
      priority: calculatePriority(caseItem),
      
      familyData: caseItem.familyData,
      
      location: {
        village: village,
        coordinates: coordinates,
        address: caseItem.familyData.originalAddress,
        currentAddress: caseItem.familyData.currentAddress,
      },

      uploadedFiles: caseItem.uploadedFiles, // Include full base64 data for detailed review

      submitterInfo: caseItem.userId ? {
        name: `${caseItem.userId.firstName} ${caseItem.userId.lastName}`,
        email: caseItem.userId.email,
        phone: caseItem.userId.phone,
        registrationDate: caseItem.userId.registrationDate,
      } : null,

      assignment: caseItem.checkerAssignment,
      checkerDecision: caseItem.checkerDecision,

      timestamps: {
        created: caseItem.createdAt,
        submitted: caseItem.submittedAt,
        lastModified: caseItem.lastModified,
        reviewStarted: caseItem.reviewStartedAt,
        approved: caseItem.approvedAt,
      },

      formCompletion: caseItem.formCompletion,
      totalNeeded: caseItem.totalNeeded,
      totalRaised: caseItem.totalRaised,
      donationProgress: caseItem.donationProgress,

      // Complete audit trail
      auditLog: caseItem.auditLog.map(log => ({
        action: log.action,
        timestamp: log.timestamp,
        performedByRole: log.performedByRole,
        performedBy: log.performedBy ? {
          name: `${log.performedBy.firstName} ${log.performedBy.lastName}`,
          email: log.performedBy.email,
          role: log.performedBy.role,
        } : null,
        details: log.details,
        notes: log.notes,
        ipAddress: log.ipAddress,
      })),
    };

    res.json({
      message: 'Case details retrieved successfully',
      case: caseDetails,
    });

  } catch (error) {
    console.error('❌ CHECKER ERROR - Get case details:', error);
    res.status(500).json({ message: 'Error retrieving case details' });
  }
});

// Submit case decision (approve/reject)
router.post('/cases/:caseId/decision', auth, isChecker, validateCaseDecision, async (req, res) => {
  try {
    console.log('🔍 CHECKER - Submitting case decision');
    console.log('🔍 CHECKER - Case ID:', req.params.caseId);
    console.log('🔍 CHECKER - Decision:', req.body.decision);

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ CHECKER - Validation errors:', errors.array());
      return res.status(400).json({
        message: 'Invalid input data',
        errors: errors.array(),
      });
    }

    const { caseId } = req.params;
    const { decision, comments, finalDamagePercentage, estimatedCost, fieldNotes } = req.body;

    // Find the case
    const caseItem = await Case.findOne({ caseId: caseId.trim() });
    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Check if case can be reviewed
    if (!['submitted', 'under_review'].includes(caseItem.status)) {
      return res.status(400).json({ 
        message: 'Case cannot be reviewed in its current status',
        currentStatus: caseItem.status 
      });
    }

    // Check if checker has access to this case
    const hasAccess = 
      !caseItem.checkerAssignment || // Unassigned case
      caseItem.checkerAssignment.checkerId.toString() === req.user._id.toString(); // Assigned to this checker

    if (!hasAccess) {
      return res.status(403).json({ message: 'This case is assigned to another checker' });
    }

    // If case is not assigned yet, assign it to this checker
    if (!caseItem.checkerAssignment) {
      caseItem.checkerAssignment = {
        checkerId: req.user._id,
        assignedAt: new Date(),
        assignedBy: req.user._id, // Self-assigned
        notes: 'Self-assigned during review',
      };
      caseItem.status = 'under_review';
      
      // Add audit log for assignment
      caseItem.addAuditLog(
        'assigned',
        req.user._id,
        'checker',
        { assignedTo: req.user._id, selfAssigned: true },
        'Self-assigned during review',
        req.ip
      );
    }

    // Create decision data
    const decisionData = {
      checkerId: req.user._id,
      decision: decision.trim(),
      comments: comments.trim(),
      finalDamagePercentage: decision === 'approved' ? parseFloat(finalDamagePercentage) : undefined,
      estimatedCost: decision === 'approved' ? parseFloat(estimatedCost) : undefined,
      timestamp: new Date(),
    };

    // Update case with decision
    caseItem.checkerDecision = decisionData;
    caseItem.status = decision.trim();

    if (decision === 'approved') {
      caseItem.totalNeeded = parseFloat(estimatedCost);
      caseItem.approvedAt = new Date();
    }

    // Add audit log for decision
    caseItem.addAuditLog(
      decision.trim(),
      req.user._id,
      'checker',
      {
        finalDamagePercentage: decisionData.finalDamagePercentage,
        estimatedCost: decisionData.estimatedCost,
        fieldNotes: fieldNotes || '',
      },
      decisionData.comments,
      req.ip
    );

    await caseItem.save();

    console.log('🔍 CHECKER - Decision saved for case:', caseId, 'Decision:', decision);

    // If rejected, we could optionally delete the case here
    // But for audit purposes, we'll keep it with status 'rejected'

    res.json({
      message: `Case ${decision} successfully`,
      decision: {
        caseId: caseItem.caseId,
        decision: decision.trim(),
        comments: comments.trim(),
        finalDamagePercentage: decisionData.finalDamagePercentage,
        estimatedCost: decisionData.estimatedCost,
        timestamp: decisionData.timestamp,
        checkerName: `${req.user.firstName} ${req.user.lastName}`,
      },
      case: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        totalNeeded: caseItem.totalNeeded,
        approvedAt: caseItem.approvedAt,
      },
    });

  } catch (error) {
    console.error('❌ CHECKER ERROR - Submit decision:', error);
    res.status(500).json({ message: 'Error submitting decision' });
  }
});

// Assign case to self (for unassigned cases)
router.post('/cases/:caseId/assign-to-me', auth, isChecker, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { notes } = req.body;

    const caseItem = await Case.findOne({ caseId: caseId.trim() });
    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    if (caseItem.status !== 'submitted') {
      return res.status(400).json({ message: 'Only submitted cases can be assigned' });
    }

    if (caseItem.checkerAssignment) {
      return res.status(400).json({ message: 'Case is already assigned to another checker' });
    }

    // Assign case to this checker
    caseItem.checkerAssignment = {
      checkerId: req.user._id,
      assignedAt: new Date(),
      assignedBy: req.user._id, // Self-assigned
      notes: notes || 'Self-assigned for review',
    };
    caseItem.status = 'under_review';

    // Add audit log
    caseItem.addAuditLog(
      'assigned',
      req.user._id,
      'checker',
      { assignedTo: req.user._id, selfAssigned: true },
      notes || 'Self-assigned for review',
      req.ip
    );

    await caseItem.save();

    res.json({
      message: 'Case assigned to you successfully',
      case: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        assignedAt: caseItem.checkerAssignment.assignedAt,
      },
    });

  } catch (error) {
    console.error('❌ CHECKER ERROR - Assign case:', error);
    res.status(500).json({ message: 'Error assigning case' });
  }
});

// Get checker statistics
router.get('/stats', auth, isChecker, async (req, res) => {
  try {
    const checkerId = req.user._id;

    // Get cases assigned to this checker
    const assignedCases = await Case.find({ 'checkerAssignment.checkerId': checkerId });
    
    const stats = {
      totalAssigned: assignedCases.length,
      pending: assignedCases.filter(c => c.status === 'under_review').length,
      approved: assignedCases.filter(c => c.status === 'approved').length,
      rejected: assignedCases.filter(c => c.status === 'rejected').length,
      avgReviewTime: calculateAverageReviewTime(assignedCases),
      recentActivity: assignedCases.slice(-5).map(c => ({
        caseId: c.caseId,
        familyName: c.familyData.familyName,
        status: c.status,
        assignedAt: c.checkerAssignment?.assignedAt,
        decidedAt: c.checkerDecision?.timestamp,
      })),
    };

    // Get unassigned cases available for pickup
    const availableCases = await Case.countDocuments({
      status: 'submitted',
      checkerAssignment: { $exists: false },
    });

    res.json({
      message: 'Checker statistics retrieved successfully',
      stats: {
        ...stats,
        availableCases,
      },
    });

  } catch (error) {
    console.error('❌ CHECKER ERROR - Get stats:', error);
    res.status(500).json({ message: 'Error retrieving statistics' });
  }
});

// Get available villages with case counts
router.get('/villages', auth, isChecker, async (req, res) => {
  try {
    const villageStats = await Case.aggregate([
      {
        $match: { 
          status: { $in: ['submitted', 'under_review', 'approved', 'rejected'] }
        },
      },
      {
        $group: {
          _id: '$familyData.village',
          totalCases: { $sum: 1 },
          pendingCases: {
            $sum: { $cond: [{ $in: ['$status', ['submitted', 'under_review']] }, 1, 0] }
          },
          approvedCases: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejectedCases: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
        },
      },
      {
        $project: {
          village: '$_id',
          totalCases: 1,
          pendingCases: 1,
          approvedCases: 1,
          rejectedCases: 1,
          coordinates: 1,
        },
      },
      { $sort: { totalCases: -1 } },
    ]);

    // Add coordinates to village data
    const villagesWithCoordinates = villageStats.map(village => ({
      ...village,
      coordinates: LEBANON_VILLAGES_COORDINATES[village.village] || { lat: 33.8547, lng: 35.8623 },
    }));

    res.json({
      message: 'Villages data retrieved successfully',
      villages: villagesWithCoordinates,
    });

  } catch (error) {
    console.error('❌ CHECKER ERROR - Get villages:', error);
    res.status(500).json({ message: 'Error retrieving villages data' });
  }
});

// Helper functions
function calculatePriority(caseItem) {
  // Priority calculation based on:
  // - Destruction percentage (higher = higher priority)
  // - Number of family members (more = higher priority)
  // - Time since submission (older = higher priority)
  // - Special needs count (more = higher priority)
  
  const destructionWeight = (caseItem.familyData.destructionPercentage || 0) * 0.4;
  const familySizeWeight = Math.min((caseItem.familyData.numberOfMembers || 1) * 5, 25);
  const timeWeight = Math.min(
    (Date.now() - new Date(caseItem.submittedAt || caseItem.createdAt).getTime()) / (1000 * 60 * 60 * 24) * 2, 
    20
  ); // Days since submission * 2, max 20
  const specialNeedsWeight = (caseItem.familyData.specialNeedsCount || 0) * 10;

  const priority = destructionWeight + familySizeWeight + timeWeight + specialNeedsWeight;
  
  if (priority >= 80) return 'high';
  if (priority >= 50) return 'medium';
  return 'low';
}

function calculateAverageReviewTime(cases) {
  const reviewedCases = cases.filter(c => 
    c.checkerDecision && 
    c.checkerAssignment &&
    c.checkerDecision.timestamp &&
    c.checkerAssignment.assignedAt
  );

  if (reviewedCases.length === 0) return 0;

  const totalReviewTime = reviewedCases.reduce((sum, c) => {
    const reviewTime = new Date(c.checkerDecision.timestamp) - new Date(c.checkerAssignment.assignedAt);
    return sum + reviewTime;
  }, 0);

  return Math.round(totalReviewTime / reviewedCases.length / (1000 * 60 * 60)); // Average in hours
}

module.exports = router;
