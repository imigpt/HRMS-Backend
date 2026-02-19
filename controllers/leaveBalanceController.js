/**
 * LEAVE BALANCE CONTROLLER
 * Admin-only: assign/edit leave balances for HR & Employee users
 */

const LeaveBalance = require('../models/LeaveBalance.model');
const User = require('../models/User.model');
const { HTTP_STATUS, ROLES } = require('../constants');

/**
 * @desc  Get all users with their leave balances (admin view)
 * @route GET /api/leave-balance
 * @access Admin
 */
exports.getAllBalances = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { search, role } = req.query;

    // Build user filter
    const userFilter = { role: { $in: ['hr', 'employee'] } };
    if (companyId) userFilter.company = companyId;
    if (role && role !== 'all') userFilter.role = role;
    if (search) {
      userFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(userFilter)
      .select('name email employeeId role department position')
      .sort({ name: 1 })
      .lean();

    const userIds = users.map((u) => u._id);
    const balances = await LeaveBalance.find({ user: { $in: userIds } }).lean();
    const balanceMap = {};
    balances.forEach((b) => {
      balanceMap[b.user.toString()] = b;
    });

    const data = users.map((u) => {
      const bal = balanceMap[u._id.toString()] || null;
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        employeeId: u.employeeId,
        role: u.role,
        department: u.department,
        position: u.position,
        balance: bal
          ? {
              _id: bal._id,
              paid: bal.paid,
              sick: bal.sick,
              unpaid: bal.unpaid,
              usedPaid: bal.usedPaid,
              usedSick: bal.usedSick,
              usedUnpaid: bal.usedUnpaid,
            }
          : { paid: 0, sick: 0, unpaid: 0, usedPaid: 0, usedSick: 0, usedUnpaid: 0 },
      };
    });

    res.status(HTTP_STATUS.OK).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Get leave balance for a single user
 * @route GET /api/leave-balance/:userId
 * @access Admin or Self
 */
exports.getBalanceByUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Employees can only see their own balance
    if (req.user.role === ROLES.EMPLOYEE && req.user._id.toString() !== userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: 'Access denied' });
    }

    let balance = await LeaveBalance.findOne({ user: userId }).lean();
    if (!balance) {
      balance = { paid: 0, sick: 0, unpaid: 0, usedPaid: 0, usedSick: 0, usedUnpaid: 0 };
    }

    res.status(HTTP_STATUS.OK).json({ success: true, data: balance });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Get my own balance (for HR / Employee)
 * @route GET /api/leave-balance/me
 * @access Private
 */
exports.getMyBalance = async (req, res) => {
  try {
    let balance = await LeaveBalance.findOne({ user: req.user._id }).lean();
    if (!balance) {
      balance = { paid: 0, sick: 0, unpaid: 0, usedPaid: 0, usedSick: 0, usedUnpaid: 0 };
    }

    res.status(HTTP_STATUS.OK).json({ success: true, data: balance });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Assign or update leave balance for a user (admin only)
 * @route PUT /api/leave-balance/:userId
 * @access Admin
 */
exports.assignBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { paid, sick, unpaid } = req.body;

    // Verify target user exists and is hr/employee
    const targetUser = await User.findById(userId).select('role company');
    if (!targetUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'User not found' });
    }
    if (!['hr', 'employee'].includes(targetUser.role)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Balances can only be assigned to HR or Employee users',
      });
    }

    const balance = await LeaveBalance.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          paid: paid !== undefined ? Number(paid) : undefined,
          sick: sick !== undefined ? Number(sick) : undefined,
          unpaid: unpaid !== undefined ? Number(unpaid) : undefined,
          company: targetUser.company || null,
          assignedBy: req.user._id,
          lastUpdatedBy: req.user._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Leave balance updated successfully',
      data: balance,
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Bulk assign balances to multiple users (admin only)
 * @route POST /api/leave-balance/bulk
 * @access Admin
 */
exports.bulkAssign = async (req, res) => {
  try {
    const { userIds, paid, sick, unpaid } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'userIds array is required',
      });
    }

    const bulkOps = userIds.map((uid) => ({
      updateOne: {
        filter: { user: uid },
        update: {
          $set: {
            paid: Number(paid) || 0,
            sick: Number(sick) || 0,
            unpaid: Number(unpaid) || 0,
            company: req.user.company || null,
            assignedBy: req.user._id,
            lastUpdatedBy: req.user._id,
          },
        },
        upsert: true,
      },
    }));

    await LeaveBalance.bulkWrite(bulkOps);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Leave balances updated for ${userIds.length} user(s)`,
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};
