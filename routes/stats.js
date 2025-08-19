const express = require('express');
const router = express.Router();
const Case = require('../models/Case');

// GET /api/stats - Get dynamic statistics for the charity project
router.get('/', async (req, res) => {
  try {
    // Get total families helped (approved cases)
    const familiesHelped = await Case.countDocuments({ status: 'approved' });

    // Get unique villages covered from approved cases
    const villagesCovered = await Case.distinct('familyData.village', { status: 'approved' });

    // Get total cases and verified cases
    const totalCases = await Case.countDocuments();
    const verifiedCases = await Case.countDocuments({
      status: { $in: ['approved', 'rejected'] },
    });

    // Calculate verification percentage
    const casesVerified = totalCases > 0 ? Math.round((verifiedCases / totalCases) * 100) : 0;

    // Return statistics in JSON format
    res.json({
      success: true,
      data: {
        familiesHelped,
        villagesCovered: villagesCovered.length,
        casesVerified,
        totalCases,
        verifiedCases,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
});

// GET /api/stats/impact - Get impact statistics for the charity project
router.get('/impact', async (req, res) => {
  try {
    // Get total cases with destruction percentage > 50%
    const homesDestroyed = await Case.countDocuments({
      'familyData.destructionPercentage': { $gte: 50 },
    });

    // Get total people affected (sum of family members from all cases)
    const peopleAffected = await Case.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$familyData.numberOfMembers' },
        },
      },
    ]);

    // Get total verified cases
    const casesVerifiedCount = await Case.countDocuments({
      status: { $in: ['approved', 'rejected'] },
    });

    // Get total funds raised (sum of totalRaised from approved cases)
    const fundsRaised = await Case.aggregate([
      {
        $match: { status: 'approved' },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalRaised' },
        },
      },
    ]);

    // Return impact statistics in JSON format
    res.json({
      success: true,
      data: {
        homesDestroyed,
        peopleAffected: peopleAffected.length > 0 ? peopleAffected[0].total : 0,
        casesVerifiedCount,
        fundsRaised: fundsRaised.length > 0 ? fundsRaised[0].total : 0,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
});

module.exports = router;
