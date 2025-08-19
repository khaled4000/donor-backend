const express = require("express");
const Case = require("../models/Case");
const Donation = require("../models/Donation");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const { adminAuth } = require("../middleware/adminAuth");
const router = express.Router();

// Get pending cases for review
router.get("/cases/pending", adminAuth, async (req, res) => {
  try {
    const { village, limit = 20, offset = 0 } = req.query;

    const query = { status: "submitted" };
    if (village && village !== "") {
      query["familyData.village"] = village;
    }

    const cases = await Case.find(query)
      .sort({ submittedAt: 1 }) // Oldest first
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate("userId", "firstName lastName email phone");

    const total = await Case.countDocuments(query);

    const formattedCases = cases.map((caseItem) => ({
      caseId: caseItem.caseId,
      status: "submitted",
      submittedDate: caseItem.submittedAt.toLocaleDateString(),
      familyData: caseItem.familyData,
      uploadedFiles: caseItem.uploadedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        category: file.category,
        description: file.description,
        uploadDate: file.uploadDate,
      })),
      submitterInfo: {
        name: `${caseItem.userId.firstName} ${caseItem.userId.lastName}`,
        email: caseItem.userId.email,
        phone: caseItem.userId.phone,
      },
      formCompletion: caseItem.formCompletion,
      originalStorageKey: `familyCase_${caseItem.userId._id}`, // For compatibility
    }));

    res.json({
      message: "Pending cases fetched successfully",
      cases: formattedCases,
      total,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + formattedCases.length < total,
      },
    });
  } catch (error) {
    console.error("Get pending cases error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get case for detailed review
router.get("/cases/:caseId/review", adminAuth, async (req, res) => {
  try {
    const caseItem = await Case.findOne({ caseId: req.params.caseId }).populate(
      "userId",
      "firstName lastName email phone registrationDate"
    );

    if (!caseItem) {
      return res.status(404).json({ message: "Case not found" });
    }

    res.json({
      message: "Case details fetched successfully",
      case: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        familyData: caseItem.familyData,
        uploadedFiles: caseItem.uploadedFiles,
        submittedDate: caseItem.submittedAt,
        createdDate: caseItem.createdAt,
        formCompletion: caseItem.formCompletion,
        submitterInfo: {
          name: `${caseItem.userId.firstName} ${caseItem.userId.lastName}`,
          email: caseItem.userId.email,
          phone: caseItem.userId.phone,
          registrationDate: caseItem.userId.registrationDate,
        },
        checkerDecision: caseItem.checkerDecision,
      },
    });
  } catch (error) {
    console.error("Get case for review error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Submit case decision (approve/reject)
router.post("/cases/:caseId/decision", adminAuth, async (req, res) => {
  try {
    const { decision, comments, finalDamagePercentage, estimatedCost } =
      req.body;

    // Validation
    if (!decision || !comments || !comments.trim()) {
      return res.status(400).json({
        message: "Please select a decision and provide comments",
        fields: {
          decision: !decision ? ["Decision is required"] : undefined,
          comments:
            !comments || !comments.trim()
              ? ["Comments are required"]
              : undefined,
        },
      });
    }

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({
        message: "Invalid decision. Must be approved or rejected",
        fields: { decision: ["Invalid decision value"] },
      });
    }

    if (decision === "approved") {
      if (!finalDamagePercentage || !estimatedCost) {
        return res.status(400).json({
          message:
            "For approved cases, please provide final damage percentage and estimated cost to rebuild",
          fields: {
            finalDamagePercentage: !finalDamagePercentage
              ? ["Final damage percentage is required for approval"]
              : undefined,
            estimatedCost: !estimatedCost
              ? ["Estimated cost is required for approval"]
              : undefined,
          },
        });
      }

      if (finalDamagePercentage < 0 || finalDamagePercentage > 100) {
        return res.status(400).json({
          message: "Damage percentage must be between 0 and 100",
          fields: {
            finalDamagePercentage: [
              "Damage percentage must be between 0 and 100",
            ],
          },
        });
      }

      if (estimatedCost <= 0) {
        return res.status(400).json({
          message: "Estimated cost must be greater than 0",
          fields: { estimatedCost: ["Estimated cost must be greater than 0"] },
        });
      }
    }

    // Find the case
    const caseItem = await Case.findOne({ caseId: req.params.caseId });
    if (!caseItem) {
      return res.status(404).json({ message: "Case not found" });
    }

    if (caseItem.status !== "submitted") {
      return res
        .status(400)
        .json({ message: "Case is not in submitted status" });
    }

    // Create decision data
    const decisionData = {
      checkerId: req.user._id,
      decision,
      comments: comments.trim(),
      finalDamagePercentage:
        decision === "approved" ? parseFloat(finalDamagePercentage) : undefined,
      estimatedCost:
        decision === "approved" ? parseFloat(estimatedCost) : undefined,
      timestamp: new Date(),
    };

    // Update case
    caseItem.status = decision;
    caseItem.checkerDecision = decisionData;

    if (decision === "approved") {
      caseItem.totalNeeded = parseFloat(estimatedCost);
      caseItem.approvedAt = new Date();
    }

    await caseItem.save();

    res.json({
      message: "Decision submitted successfully",
      decision: {
        caseId: caseItem.caseId,
        decision,
        comments: comments.trim(),
        finalDamagePercentage:
          decision === "approved"
            ? parseFloat(finalDamagePercentage)
            : undefined,
        estimatedCost:
          decision === "approved" ? parseFloat(estimatedCost) : undefined,
        timestamp: decisionData.timestamp,
        checkerId: req.user._id,
        checkerName: req.user.name,
      },
      case: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        totalNeeded: caseItem.totalNeeded,
        approvedAt: caseItem.approvedAt,
      },
    });
  } catch (error) {
    console.error("Submit decision error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all cases with their status (for admin dashboard)
router.get("/cases/all", adminAuth, async (req, res) => {
  try {
    const { status, village, limit = 50, offset = 0 } = req.query;

    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }
    if (village && village !== "all") {
      query["familyData.village"] = village;
    }

    const cases = await Case.find(query)
      .sort({ lastModified: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate("userId", "firstName lastName email")
      .populate("checkerDecision.checkerId", "firstName lastName")
      .populate("checkerAssignment.checkerId", "firstName lastName");

    const total = await Case.countDocuments(query);

    const formattedCases = cases.map((caseItem) => ({
      caseId: caseItem.caseId,
      status: caseItem.status,
      familyName: caseItem.familyData.familyName,
      village: caseItem.familyData.village,
      submittedDate: caseItem.submittedAt
        ? caseItem.submittedAt.toLocaleDateString()
        : null,
      approvedDate: caseItem.approvedAt
        ? caseItem.approvedAt.toLocaleDateString()
        : null,
      reviewStartedDate: caseItem.reviewStartedAt
        ? caseItem.reviewStartedAt.toLocaleDateString()
        : null,
      totalNeeded: caseItem.totalNeeded,
      totalRaised: caseItem.totalRaised,
      donationProgress: caseItem.donationProgress,
      submitter: caseItem.userId
        ? `${caseItem.userId.firstName} ${caseItem.userId.lastName}`
        : "Unknown",
      checker: caseItem.checkerDecision?.checkerId
        ? `${caseItem.checkerDecision.checkerId.firstName} ${caseItem.checkerDecision.checkerId.lastName}`
        : null,
      assignedChecker: caseItem.checkerAssignment?.checkerId
        ? `${caseItem.checkerAssignment.checkerId.firstName} ${caseItem.checkerAssignment.checkerId.lastName}`
        : null,
      checkerComments: caseItem.checkerDecision?.comments,
      destructionPercentage: caseItem.familyData.destructionPercentage,
      finalDamagePercentage: caseItem.checkerDecision?.finalDamagePercentage,
    }));

    res.json({
      message: "All cases fetched successfully",
      cases: formattedCases,
      total,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + formattedCases.length < total,
      },
    });
  } catch (error) {
    console.error("Get all cases error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get cases by status for Kanban board
router.get("/cases/kanban", adminAuth, async (req, res) => {
  try {
    const cases = await Case.find({
      status: { $in: ["submitted", "under_review", "approved"] },
    })
      .populate("userId", "firstName lastName email")
      .populate("checkerAssignment.checkerId", "firstName lastName")
      .populate("checkerDecision.checkerId", "firstName lastName")
      .sort({ lastModified: -1 });

    const kanbanData = {
      submitted: cases
        .filter((c) => c.status === "submitted")
        .map(formatCaseForKanban),
      under_review: cases
        .filter((c) => c.status === "under_review")
        .map(formatCaseForKanban),
      approved: cases
        .filter((c) => c.status === "approved")
        .map(formatCaseForKanban),
    };

    res.json({
      message: "Kanban data fetched successfully",
      data: kanbanData,
    });
  } catch (error) {
    console.error("Get kanban data error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Helper function to format case for Kanban
function formatCaseForKanban(caseItem) {
  return {
    id: caseItem._id,
    caseId: caseItem.caseId,
    status: caseItem.status,
    familyName: caseItem.familyData.familyName,
    village: caseItem.familyData.village,
    numberOfMembers: caseItem.familyData.numberOfMembers,
    destructionPercentage: caseItem.familyData.destructionPercentage,
    submittedDate: caseItem.submittedAt,
    reviewStartedDate: caseItem.reviewStartedAt,
    approvedDate: caseItem.approvedAt,
    assignedChecker: caseItem.checkerAssignment?.checkerId
      ? {
          id: caseItem.checkerAssignment.checkerId._id,
          name: `${caseItem.checkerAssignment.checkerId.firstName} ${caseItem.checkerAssignment.checkerId.lastName}`,
          email: caseItem.checkerAssignment.checkerId.email,
        }
      : null,
    finalChecker: caseItem.checkerDecision?.checkerId
      ? {
          id: caseItem.checkerDecision.checkerId._id,
          name: `${caseItem.checkerDecision.checkerId.firstName} ${caseItem.checkerDecision.checkerId.lastName}`,
          email: caseItem.checkerDecision.checkerId.email,
        }
      : null,
    totalNeeded: caseItem.totalNeeded,
    totalRaised: caseItem.totalRaised,
    donationProgress: caseItem.donationProgress,
  };
}

// Assign checker to case
router.post("/cases/:caseId/assign", adminAuth, async (req, res) => {
  try {
    const { checkerId, notes } = req.body;
    const { caseId } = req.params;

    if (!checkerId) {
      return res.status(400).json({ message: "Checker ID is required" });
    }

    // Verify the checker exists and is active
    const checker = await User.findOne({
      _id: checkerId,
      role: "checker",
      isActive: true,
    });
    if (!checker) {
      return res
        .status(400)
        .json({ message: "Invalid checker ID or checker not active" });
    }

    const caseItem = await Case.findOne({ caseId });
    if (!caseItem) {
      return res.status(404).json({ message: "Case not found" });
    }

    if (caseItem.status !== "submitted") {
      return res
        .status(400)
        .json({ message: "Can only assign checkers to submitted cases" });
    }

    // Update case with checker assignment and change status
    caseItem.checkerAssignment = {
      checkerId,
      assignedAt: new Date(),
      assignedBy: req.user._id,
      notes: notes || "",
    };
    caseItem.status = "under_review";

    await caseItem.save();

    res.json({
      message: "Checker assigned successfully",
      case: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        assignedChecker: {
          id: checker._id,
          name: `${checker.firstName} ${checker.lastName}`,
          email: checker.email,
        },
        assignedAt: caseItem.checkerAssignment.assignedAt,
      },
    });
  } catch (error) {
    console.error("Assign checker error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update case status (for drag and drop)
router.patch("/cases/:caseId/status", adminAuth, async (req, res) => {
  try {
    const { status, targetCheckerId } = req.body;
    const { caseId } = req.params;

    if (!["submitted", "under_review", "approved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const caseItem = await Case.findOne({ caseId });
    if (!caseItem) {
      return res.status(404).json({ message: "Case not found" });
    }

    // Handle status transitions
    if (status === "under_review" && targetCheckerId) {
      const checker = await User.findOne({
        _id: targetCheckerId,
        role: "checker",
        isActive: true,
      });
      if (!checker) {
        return res.status(400).json({ message: "Invalid checker ID" });
      }

      caseItem.checkerAssignment = {
        checkerId: targetCheckerId,
        assignedAt: new Date(),
        assignedBy: req.user._id,
        notes: "Reassigned via Kanban board",
      };
    }

    caseItem.status = status;
    await caseItem.save();

    res.json({
      message: "Case status updated successfully",
      case: {
        caseId: caseItem.caseId,
        status: caseItem.status,
        assignedChecker: caseItem.checkerAssignment?.checkerId
          ? {
              id: caseItem.checkerAssignment.checkerId,
              name: caseItem.checkerAssignment.checkerId,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Update case status error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get system statistics (admin dashboard)
router.get("/stats/overview", adminAuth, async (req, res) => {
  try {
    // Get case statistics
    const caseStats = await Case.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const caseStatusCounts = {};
    caseStats.forEach((stat) => {
      caseStatusCounts[stat._id] = stat.count;
    });

    // Get donation statistics
    const donationStats = await Donation.aggregate([
      {
        $match: { paymentStatus: "completed" },
      },
      {
        $group: {
          _id: null,
          totalDonations: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          uniqueDonors: { $addToSet: "$donorId" },
          uniqueCases: { $addToSet: "$caseObjectId" },
        },
      },
    ]);

    const donationData = donationStats[0] || {
      totalDonations: 0,
      totalAmount: 0,
      uniqueDonors: [],
      uniqueCases: [],
    };

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    const userCounts = {};
    userStats.forEach((stat) => {
      userCounts[stat._id] = stat.count;
    });

    // Get village statistics
    const villageStats = await Case.aggregate([
      {
        $match: { status: { $in: ["approved", "submitted"] } },
      },
      {
        $group: {
          _id: "$familyData.village",
          totalCases: { $sum: 1 },
          approvedCases: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
          totalNeeded: {
            $sum: {
              $cond: [{ $eq: ["$status", "approved"] }, "$totalNeeded", 0],
            },
          },
          totalRaised: {
            $sum: {
              $cond: [{ $eq: ["$status", "approved"] }, "$totalRaised", 0],
            },
          },
        },
      },
      {
        $project: {
          village: "$_id",
          totalCases: 1,
          approvedCases: 1,
          totalNeeded: 1,
          totalRaised: 1,
          percentageFunded: {
            $cond: [
              { $gt: ["$totalNeeded", 0] },
              {
                $multiply: [{ $divide: ["$totalRaised", "$totalNeeded"] }, 100],
              },
              0,
            ],
          },
        },
      },
      {
        $sort: { totalCases: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    const averageCaseValue =
      donationData.uniqueCases.length > 0
        ? donationData.totalAmount / donationData.uniqueCases.length
        : 0;

    res.json({
      message: "System statistics fetched successfully",
      stats: {
        totalUsers: Object.values(userCounts).reduce(
          (sum, count) => sum + count,
          0
        ),
        totalCases: Object.values(caseStatusCounts).reduce(
          (sum, count) => sum + count,
          0
        ),
        approvedCases: caseStatusCounts.approved || 0,
        pendingCases: caseStatusCounts.submitted || 0,
        rejectedCases: caseStatusCounts.rejected || 0,
        draftCases: caseStatusCounts.draft || 0,
        totalDonations: donationData.totalDonations,
        totalAmountRaised: donationData.totalAmount,
        familiesHelped: donationData.uniqueCases.length,
        uniqueDonors: donationData.uniqueDonors.length,
        averageCaseValue: Math.round(averageCaseValue * 100) / 100,
        userBreakdown: {
          families: userCounts.family || 0,
          donors: userCounts.donor || 0,
          checkers: userCounts.checker || 0,
        },
        byVillage: villageStats.map((village) => ({
          village: village.village,
          cases: village.totalCases,
          approved: village.approvedCases,
          totalNeeded: village.totalNeeded,
          totalRaised: village.totalRaised,
          funded: `${Math.round(village.percentageFunded)}%`,
        })),
      },
    });
  } catch (error) {
    console.error("Get overview stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get villages list
router.get("/villages", async (req, res) => {
  try {
    // Get villages from cases
    const villages = await Case.distinct("familyData.village");

    // South Lebanon villages list (from frontend)
    const allVillages = [
      "Ain Baal",
      "Abra",
      "Adchit",
      "Adloun",
      "Aita al-Shaab",
      "Aita az-Zut",
      "Al-Bazouriye",
      "Al-Khiyam",
      "Al-Mansouri",
      "Al-Taybe",
      "Alma ash-Shaab",
      "Ansar",
      "Arabsalim",
      "Arnoun",
      "Bafliyeh",
      "Bani Hayyan",
      "Barish",
      "Bayt Yahoun",
      "Bazouriye",
      "Bint Jbeil",
      "Blida",
      "Borj ash-Shamali",
      "Borj el-Muluk",
      "Burghuz",
      "Chamaa",
      "Chaqra",
      "Chehabiyeh",
      "Chihine",
      "Deir Mimas",
      "Deir Qanoun an-Nahr",
      "Deir Seriane",
      "Dhayra",
      "Ebba",
      "Ein el-Delb",
      "El-Adousiye",
      "El-Bassatine",
      "El-Khiam",
      "El-Mansouri",
      "El-Qantara",
      "Ghandouriye",
      "Haddatha",
      "Hanaway",
      "Haris",
      "Harouf",
      "Houla",
      "Jbal as-Saghir",
      "Jezzine",
      "Jibbain",
      "Kafra",
      "Kfar Dounin",
      "Kfar Kila",
      "Kfar Melki",
      "Kfar Roummane",
      "Kfar Shuba",
      "Kfar Tibnit",
      "Khallet Wardeh",
      "Khiam",
      "Khirbet Selm",
      "Kounine",
      "Ksour",
      "Majdal Zoun",
      "Marjayoun",
      "Maroun ar-Ras",
      "Mays al-Jabal",
      "Meiss ej-Jabal",
      "Metulla",
      "Nabatiye",
      "Odaisseh",
      "Qana",
      "Qantara",
      "Qlayle",
      "Qlayaa",
      "Qouzah",
      "Rachaya al-Fukhar",
      "Ramyeh",
      "Ras al-Biyyadah",
      "Rmadiyeh",
      "Rmeish",
      "Rshaf",
      "Saida",
      "Sajad",
      "Sarba",
      "Shaqra",
      "Sreifa",
      "Tayr Harfa",
      "Tayr Dibba",
      "Tebnine",
      "Tyre",
      "Yaroun",
      "Yateri",
      "Zawtar ash-Sharqiye",
    ];

    res.json({
      message: "Villages list fetched successfully",
      villages: allVillages.sort(),
      villagesWithCases: villages.sort(),
    });
  } catch (error) {
    console.error("Get villages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete case (admin only - for cleanup)
router.delete("/cases/:caseId", adminAuth, async (req, res) => {
  try {
    const caseItem = await Case.findOne({ caseId: req.params.caseId });

    if (!caseItem) {
      return res.status(404).json({ message: "Case not found" });
    }

    // Don't allow deletion of approved cases with donations
    if (caseItem.status === "approved" && caseItem.totalRaised > 0) {
      return res.status(400).json({
        message: "Cannot delete approved case with donations",
      });
    }

    await Case.deleteOne({ _id: caseItem._id });

    res.json({
      message: "Case deleted successfully",
      caseId: req.params.caseId,
    });
  } catch (error) {
    console.error("Delete case error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all checkers
router.get("/checkers", adminAuth, async (req, res) => {
  try {
    const checkers = await User.find({ role: "checker", isActive: true })
      .select("firstName lastName email phone isActive lastLoginDate")
      .sort({ firstName: 1 });

    const formattedCheckers = checkers.map((checker) => ({
      id: checker._id,
      name: `${checker.firstName} ${checker.lastName}`,
      email: checker.email,
      phone: checker.phone,
      isActive: checker.isActive,
      lastLogin: checker.lastLoginDate,
    }));

    res.json({
      message: "Checkers fetched successfully",
      checkers: formattedCheckers,
    });
  } catch (error) {
    console.error("Get checkers error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users (admin management)
router.get("/users", adminAuth, async (req, res) => {
  try {
    const { role, limit = 50, offset = 0 } = req.query;

    const query = {};
    if (role && role !== "all") {
      query.role = role;
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await User.countDocuments(query);

    const formattedUsers = users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      isActive: user.isActive,
      registrationDate: user.registrationDate,
      lastLoginDate: user.lastLoginDate,
    }));

    res.json({
      message: "Users fetched successfully",
      users: formattedUsers,
      total,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + formattedUsers.length < total,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user status
router.patch("/users/:userId/status", adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const { userId } = req.params;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deactivating the current admin
    if (user._id.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot deactivate your own account" });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete user (admin only)
router.delete("/users/:userId", adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting the current admin
    if (userId === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has associated cases
    const caseCount = await Case.countDocuments({ userId });
    if (caseCount > 0) {
      return res.status(400).json({
        message: `Cannot delete user with ${caseCount} associated cases`,
      });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      message: "User deleted successfully",
      userId,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
