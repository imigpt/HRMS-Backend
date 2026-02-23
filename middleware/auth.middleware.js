const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// Protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

/**
 * Check DB-based module permission for the user's role.
 * Admin always passes. For hr/employee, checks the Role collection.
 * If no role is found in DB, falls back to allowing access (legacy behavior).
 * 
 * Usage: checkPermission('attendance', 'view')
 *        checkPermission('leaves', 'create')
 */
exports.checkPermission = (module, action = 'view') => {
  return async (req, res, next) => {
    try {
      // Admin always has full access
      if (req.user.role === 'admin') return next();

      const Role = require('../models/Role.model');
      const role = await Role.findOne({ roleName: req.user.role, status: 'active' });

      // If no role in DB yet, allow access (fallback to legacy behavior)
      // This ensures the app works before admin seeds roles
      if (!role || !role.permissions || role.permissions.length === 0) {
        return next();
      }

      const perm = role.permissions.find(p => p.module === module);
      if (!perm) {
        // Module not listed in permissions = no access
        return res.status(403).json({
          success: false,
          message: `You do not have access to ${module}`
        });
      }

      if (!perm.actions[action]) {
        return res.status(403).json({
          success: false,
          message: `You do not have ${action} permission for ${module}`
        });
      }

      next();
    } catch (error) {
      // On error, allow through (don't break the app)
      console.error('Permission check error:', error.message);
      next();
    }
  };
};
