const express = require('express');
const Case = require('../models/Case');
const { auth, isFamily } = require('../middleware/auth');
const { requireFamilyEmailVerification } = require('../middleware/emailVerification');
const router = express.Router();

// Get all cases for the authenticated user (family)
router.get('/my-cases', auth, isFamily, requireFamilyEmailVerification, async (req, res) => {
  try {
    const cases = await Case.find({ userId: req.user._id })
      .sort({ lastModified: -1 })
      .select('-uploadedFiles.base64'); // Exclude base64 data for performance

    const formattedCases = cases.map(caseItem => ({
      caseId: caseItem.caseId,
      status: caseItem.status,
      submittedDate: caseItem.submittedAt ? caseItem.submittedAt.toISOString() : null,
      lastModified: caseItem.lastModified.toISOString(),
      familyName: caseItem.familyData.familyName,
      village: caseItem.familyData.village,
      progress: caseItem.formCompletion,
      checkerComments: caseItem.checkerDecision?.comments,
      finalDamagePercentage: caseItem.checkerDecision?.finalDamagePercentage,
      estimatedCost: caseItem.checkerDecision?.estimatedCost,
      totalRaised: caseItem.totalRaised,
      donationProgress: caseItem.donationProgress,
    }));

    res.json({
      message: 'Cases fetched successfully',
      cases: formattedCases,
    });
  } catch (error) {
    console.error('Get my cases error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all approved cases for donors (public endpoint - no auth required)
router.get('/approved', async (req, res) => {
  try {
    console.log('🔍 BACKEND DEBUG - GET /api/cases/approved called');

    // Get all approved cases with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find only active approved cases (not fully funded) and sort by approval date (newest first)
    const approvedCases = await Case.find({
      status: 'approved',
      'checkerDecision.decision': 'approved',
    })
      .sort({ approvedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-uploadedFiles.base64 -uploadedFiles.checksum') // Exclude sensitive data
      .populate('userId', 'email'); // Get user email for reference

    // Get total count for pagination
    const total = await Case.countDocuments({
      status: 'approved',
      'checkerDecision.decision': 'approved',
    });

    // Format cases for donor display
    const formattedCases = approvedCases.map(caseItem => ({
      caseId: caseItem.caseId,
      familyName: caseItem.familyData.familyName,
      village: caseItem.familyData.village,
      currentAddress: caseItem.familyData.currentAddress,
      numberOfMembers: caseItem.familyData.numberOfMembers,
      childrenCount: caseItem.familyData.childrenCount,
      elderlyCount: caseItem.familyData.elderlyCount,
      specialNeedsCount: caseItem.familyData.specialNeedsCount,
      destructionDate: caseItem.familyData.destructionDate,
      destructionPercentage: caseItem.familyData.destructionPercentage,
      damageDescription: caseItem.familyData.damageDescription,
      checkerComments: caseItem.checkerDecision?.comments,
      finalDamagePercentage: caseItem.checkerDecision?.finalDamagePercentage,
      estimatedCost: caseItem.checkerDecision?.estimatedCost,
      totalNeeded: caseItem.totalNeeded,
      totalRaised: caseItem.totalRaised,
      donationProgress: caseItem.donationProgress,
      approvedAt: caseItem.approvedAt,
      lastModified: caseItem.lastModified,
      // Include some file info but not the actual files
      hasDocuments: caseItem.uploadedFiles.length > 0,
      documentCount: caseItem.uploadedFiles.length,
    }));

    // Calculate summary statistics
    const totalFamilies = total;
    const totalPeopleAffected = approvedCases.reduce((sum, c) => sum + c.familyData.numberOfMembers, 0);
    const totalFundingNeeded = approvedCases.reduce((sum, c) => sum + (c.totalNeeded || 0), 0);
    const totalFundingRaised = approvedCases.reduce((sum, c) => sum + (c.totalRaised || 0), 0);
    const overallProgress = totalFundingNeeded > 0 ? Math.round((totalFundingRaised / totalFundingNeeded) * 100) : 0;

    res.json({
      success: true,
      message: 'Approved cases fetched successfully',
      data: {
        cases: formattedCases,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: {
          totalFamilies,
          totalPeopleAffected,
          totalFundingNeeded,
          totalFundingRaised,
          overallProgress,
        },
      },
    });

  } catch (error) {
    console.error('Get approved cases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approved cases',
      error: error.message,
    });
  }
});

// Get fully funded cases (public endpoint - no auth required)
router.get('/fully-funded', async (req, res) => {
  try {
    console.log('🔍 BACKEND DEBUG - GET /api/cases/fully-funded called');

    // Get all fully funded cases with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find fully funded cases and sort by funding completion date (newest first)
    const fullyFundedCases = await Case.find({
      status: 'fully_funded',
    })
      .sort({ fullyFundedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-uploadedFiles.base64 -uploadedFiles.checksum') // Exclude sensitive data
      .populate('userId', 'email'); // Get user email for reference

    // Get total count for pagination
    const total = await Case.countDocuments({
      status: 'fully_funded',
    });

    // Format cases for display
    const formattedCases = fullyFundedCases.map(caseItem => ({
      caseId: caseItem.caseId,
      familyName: caseItem.familyData.familyName,
      village: caseItem.familyData.village,
      currentAddress: caseItem.familyData.currentAddress,
      numberOfMembers: caseItem.familyData.numberOfMembers,
      childrenCount: caseItem.familyData.childrenCount,
      elderlyCount: caseItem.familyData.elderlyCount,
      specialNeedsCount: caseItem.familyData.specialNeedsCount,
      destructionDate: caseItem.familyData.destructionDate,
      destructionPercentage: caseItem.familyData.destructionPercentage,
      damageDescription: caseItem.familyData.damageDescription,
      checkerComments: caseItem.checkerDecision?.comments,
      finalDamagePercentage: caseItem.checkerDecision?.finalDamagePercentage,
      estimatedCost: caseItem.checkerDecision?.estimatedCost,
      totalNeeded: caseItem.totalNeeded,
      totalRaised: caseItem.totalRaised,
      donationProgress: caseItem.donationProgress,
      approvedAt: caseItem.approvedAt,
      fullyFundedAt: caseItem.fullyFundedAt,
      lastModified: caseItem.lastModified,
      // Include some file info but not the actual files
      hasDocuments: caseItem.uploadedFiles.length > 0,
      documentCount: caseItem.uploadedFiles.length,
    }));

    // Calculate summary statistics
    const totalFamilies = total;
    const totalPeopleAffected = fullyFundedCases.reduce((sum, c) => sum + c.familyData.numberOfMembers, 0);
    const totalFundingNeeded = fullyFundedCases.reduce((sum, c) => sum + (c.totalNeeded || 0), 0);
    const totalFundingRaised = fullyFundedCases.reduce((sum, c) => sum + (c.totalRaised || 0), 0);

    res.json({
      success: true,
      message: 'Fully funded cases fetched successfully',
      data: {
        cases: formattedCases,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: {
          totalFamilies,
          totalPeopleAffected,
          totalFundingNeeded,
          totalFundingRaised,
          averageFundingTime: 'Calculated based on approved to fully funded duration',
        },
      },
    });

  } catch (error) {
    console.error('Get fully funded cases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fully funded cases',
      error: error.message,
    });
  }
});

// Get a specific case by ID
router.get('/:caseId', auth, async (req, res) => {
  try {
    const caseItem = await Case.findOne({ caseId: req.params.caseId });

    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Check if user owns the case or is an admin
    if (caseItem.userId.toString() !== req.user._id.toString() && req.user.role !== 'checker') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      message: 'Case fetched successfully',
      case: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        familyData: caseItem.familyData,
        uploadedFiles: caseItem.uploadedFiles.map(file => ({
          ...file.toObject(),
          base64: undefined, // Don't send base64 in GET requests
        })),
        timestamps: {
          created: caseItem.createdAt,
          lastModified: caseItem.lastModified,
          submitted: caseItem.submittedAt,
          approved: caseItem.approvedAt,
        },
        checkerDecision: caseItem.checkerDecision,
        totalNeeded: caseItem.totalNeeded,
        totalRaised: caseItem.totalRaised,
        donationProgress: caseItem.donationProgress,
        formCompletion: caseItem.formCompletion,
      },
    });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update a case (draft)
router.post('/', auth, isFamily, requireFamilyEmailVerification, async (req, res) => {
  try {
    console.log('🔍 BACKEND DEBUG - POST /api/cases called');
    console.log('🔍 BACKEND DEBUG - User:', req.user ? { id: req.user._id, email: req.user.email, role: req.user.role } : 'No user');
    console.log('🔍 BACKEND DEBUG - Request body keys:', Object.keys(req.body));
    console.log('🔍 BACKEND DEBUG - Full request body:', JSON.stringify(req.body, null, 2));

    const { familyData, uploadedFiles, caseId } = req.body;

    console.log('🔍 BACKEND DEBUG - Extracted familyData:', familyData);
    console.log('🔍 BACKEND DEBUG - Extracted uploadedFiles:', uploadedFiles);
    console.log('🔍 BACKEND DEBUG - Extracted caseId:', caseId);

    // Validation
    if (!familyData) {
      console.log('❌ BACKEND ERROR - No family data provided');
      return res.status(400).json({ message: 'Family data is required' });
    }
    
    // Validate required fields for familyData
    const requiredFields = [
      'familyName', 'headOfHousehold', 'phoneNumber', 'numberOfMembers',
      'village', 'currentAddress', 'originalAddress', 'propertyType', 
      'ownershipStatus', 'destructionDate', 'destructionCause', 
      'destructionPercentage', 'damageDescription', 'previouslyReceivedAid'
    ];
    
    const missingFields = [];
    for (const field of requiredFields) {
      if (!familyData[field] || 
          (typeof familyData[field] === 'string' && familyData[field].trim() === '') ||
          familyData[field] === null || 
          familyData[field] === undefined) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      console.log('❌ BACKEND ERROR - Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields: missingFields
      });
    }

    let caseItem;

    if (caseId) {
      // Update existing case
      caseItem = await Case.findOne({ caseId, userId: req.user._id });
      if (!caseItem) {
        return res.status(404).json({ message: 'Case not found' });
      }

      // Only allow updates if case is in draft status
      if (caseItem.status !== 'draft') {
        return res.status(400).json({ message: 'Cannot update submitted case' });
      }

      caseItem.familyData = familyData;
      if (uploadedFiles) {
        caseItem.uploadedFiles = uploadedFiles;
      }
    } else {
      // Create new case
      console.log('🔍 BACKEND DEBUG - Creating new case');
      caseItem = new Case({
        userId: req.user._id,
        userEmail: req.user.email,
        familyData,
        uploadedFiles: uploadedFiles || [],
        status: 'draft',
      });
      console.log('🔍 BACKEND DEBUG - Case object created:', caseItem.toObject());
    }

    // Calculate form completion
    console.log('🔍 BACKEND DEBUG - Calculating form completion');
    caseItem.calculateFormCompletion();
    console.log('🔍 BACKEND DEBUG - Form completion calculated:', caseItem.formCompletion);

    console.log('🔍 BACKEND DEBUG - About to save case to database');
    await caseItem.save();
    console.log('🔍 BACKEND DEBUG - Case saved successfully');

    res.status(caseId ? 200 : 201).json({
      message: caseId ? 'Case updated successfully' : 'Case created successfully',
      case: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        familyData: caseItem.familyData,
        uploadedFiles: caseItem.uploadedFiles.length,
        timestamps: {
          created: caseItem.createdAt,
          lastModified: caseItem.lastModified,
        },
        formCompletion: caseItem.formCompletion,
        userId: caseItem.userId,
      },
    });
      } catch (error) {
      console.error('❌ BACKEND ERROR - Create/Update case error:', error);
      console.error('❌ BACKEND ERROR - Error message:', error.message);
      console.error('❌ BACKEND ERROR - Error stack:', error.stack);

      // Check if it's a validation error
      if (error.name === 'ValidationError') {
        console.error('❌ BACKEND ERROR - Validation errors:', error.errors);
        const validationErrors = Object.keys(error.errors).map(key => ({
          field: key.replace('familyData.', ''), // Remove nested path prefix
          message: error.errors[key].message,
        }));
        return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors,
        details: error.message,
      });
    }

    // Check if it's a MongoDB duplicate key error
    if (error.code === 11000) {
      console.error('❌ BACKEND ERROR - Duplicate key error:', error);
      return res.status(400).json({
        message: 'Duplicate entry found',
        details: error.message,
      });
    }

    res.status(500).json({
      message: 'Server error',
      details: error.message,
      type: error.name,
    });
  }
});

// Save case draft
router.post('/:caseId/draft', auth, isFamily, requireFamilyEmailVerification, async (req, res) => {
  try {
    const { familyData, uploadedFiles } = req.body;

    const caseItem = await Case.findOne({
      caseId: req.params.caseId,
      userId: req.user._id,
    });

    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Only allow draft saves for draft cases
    if (caseItem.status !== 'draft') {
      return res.status(400).json({ message: 'Cannot save draft for submitted case' });
    }

    if (familyData) {
      caseItem.familyData = { ...caseItem.familyData, ...familyData };
    }

    if (uploadedFiles) {
      caseItem.uploadedFiles = uploadedFiles;
    }

    caseItem.calculateFormCompletion();
    await caseItem.save();

    res.json({
      message: 'Draft saved successfully',
      case: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        lastModified: caseItem.lastModified,
        formCompletion: caseItem.formCompletion,
      },
    });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit case for review
router.post('/:caseId/submit', auth, isFamily, requireFamilyEmailVerification, async (req, res) => {
  try {
    const caseItem = await Case.findOne({
      caseId: req.params.caseId,
      userId: req.user._id,
    });

    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    if (caseItem.status !== 'draft') {
      return res.status(400).json({ message: 'Case already submitted' });
    }

    // Validate required fields
    const requiredFields = [
      'familyData.familyName',
      'familyData.headOfHousehold',
      'familyData.phoneNumber',
      'familyData.numberOfMembers',
      'familyData.village',
      'familyData.currentAddress',
      'familyData.originalAddress',
      'familyData.destructionDate',
      'familyData.destructionPercentage',
      'familyData.damageDescription',
    ];

    const missingFields = [];
    requiredFields.forEach(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], caseItem);
      if (!value || value.toString().trim() === '') {
        missingFields.push(field.replace('familyData.', ''));
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Please complete all required fields before submitting',
        missingFields,
      });
    }

    // Update case status
    caseItem.status = 'submitted';
    caseItem.submittedAt = new Date();
    caseItem.calculateFormCompletion();

    await caseItem.save();

    res.json({
      message: 'Case submitted successfully',
      case: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        submittedAt: caseItem.submittedAt,
        formCompletion: caseItem.formCompletion,
      },
    });
  } catch (error) {
    console.error('Submit case error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get verified cases (for donors)
router.get('/verified/list', auth, async (req, res) => {
  try {
    const { village, limit = 20, offset = 0 } = req.query;

    const query = { status: 'approved' };
    if (village && village !== 'all') {
      query['familyData.village'] = village;
    }

    const cases = await Case.find(query)
      .sort({ approvedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select('-uploadedFiles.base64'); // Exclude base64 for performance

    const total = await Case.countDocuments(query);

    const formattedCases = cases.map(caseItem => ({
      id: caseItem.caseId,
      caseId: caseItem.caseId,
      family: caseItem.familyData.familyName,
      location: `${caseItem.familyData.village}, South Lebanon`,
      familySize: `${caseItem.familyData.numberOfMembers} members`,
      needed: `$${caseItem.totalNeeded.toLocaleString()}`,
      raised: `$${caseItem.totalRaised.toLocaleString()}`,
      progress: caseItem.donationProgress,
      verified: caseItem.approvedAt ? caseItem.approvedAt.toLocaleDateString() : 'N/A',
      damagePercentage: caseItem.checkerDecision?.finalDamagePercentage,
      estimatedCost: caseItem.checkerDecision?.estimatedCost,
      familyData: {
        familyName: caseItem.familyData.familyName,
        village: caseItem.familyData.village,
        numberOfMembers: caseItem.familyData.numberOfMembers,
        destructionPercentage: caseItem.familyData.destructionPercentage,
        damageDescription: caseItem.familyData.damageDescription,
      },
      checkerComments: caseItem.checkerDecision?.comments,
      approvedDate: caseItem.approvedAt,
      status: caseItem.status,
    }));

    // Calculate stats
    const totalCases = formattedCases.length;
    const needFunding = formattedCases.filter(c => c.progress < 100).length;
    const totalRaisedAmount = cases.reduce((sum, c) => sum + c.totalRaised, 0);

    res.json({
      message: 'Verified cases fetched successfully',
      cases: formattedCases,
      total,
      stats: {
        totalCases,
        needFunding,
        totalRaised: totalRaisedAmount,
      },
    });
  } catch (error) {
    console.error('Get verified cases error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update case (for families to edit their own cases)
router.put('/:caseId', auth, isFamily, async (req, res) => {
  try {
    const { familyData, uploadedFiles } = req.body;

    const caseItem = await Case.findOne({
      caseId: req.params.caseId,
      userId: req.user._id,
    });

    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Only allow updates for draft cases
    if (caseItem.status !== 'draft') {
      return res.status(400).json({ message: 'Cannot update submitted case' });
    }

    if (familyData) {
      caseItem.familyData = familyData;
    }

    if (uploadedFiles) {
      caseItem.uploadedFiles = uploadedFiles;
    }

    caseItem.calculateFormCompletion();
    await caseItem.save();

    res.json({
      message: 'Case updated successfully',
      case: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        familyData: caseItem.familyData,
        uploadedFiles: caseItem.uploadedFiles.length,
        lastModified: caseItem.lastModified,
        formCompletion: caseItem.formCompletion,
      },
    });
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete case (only draft cases)
router.delete('/:caseId', auth, isFamily, async (req, res) => {
  try {
    const caseItem = await Case.findOne({
      caseId: req.params.caseId,
      userId: req.user._id,
    });

    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Only allow deletion of draft cases
    if (caseItem.status !== 'draft') {
      return res.status(400).json({ message: 'Cannot delete submitted case' });
    }

    await Case.deleteOne({ _id: caseItem._id });

    res.json({
      message: 'Case deleted successfully',
      caseId: req.params.caseId,
    });
  } catch (error) {
    console.error('Delete case error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
