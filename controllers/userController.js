/**
 * USER CONTROLLER - Manages user operations
 * 
 * WHY: Handles user CRUD operations with proper authorization
 * and company isolation for HR operations.
 */

const User = require('../models/User.model');
const { uploadToCloudinary } = require('../utils/uploadToCloudinary');

/**
 * @desc    Update own profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, phone, address, bio, dateOfBirth } = req.body;

    // Build update object
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;
    if (bio !== undefined) updateFields.bio = bio;
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;

    // Handle profile photo upload
    if (req.file) {
      try {
        console.log('📸 Uploading profile photo for user:', userId);
        const uploadResult = await uploadToCloudinary(req.file.buffer, { folder: 'profile-photos' });
        updateFields.profilePhoto = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        };
        console.log('✅ Profile photo uploaded:', updateFields.profilePhoto.url);
      } catch (uploadError) {
        console.error('❌ Profile photo upload error:', uploadError);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
      new: true,
      runValidators: true,
    })
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .populate('company', 'name');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    next(error);
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/user
 * @access  Private (Admin, HR)
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const query = {};

    // HR can only see users from their company
    if (req.user.role === 'hr') {
      query.company = req.user.company;
    }

    // Optional filters
    if (req.query.role) {
      query.role = req.query.role;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.department) {
      query.department = req.query.department;
    }

    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .populate('company', 'name industry')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/user/:id
 * @access  Private
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .populate('company', 'name industry address phone');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Permission check
    if (req.user.role === 'employee' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user',
      });
    }

    if (
      req.user.role === 'hr' &&
      user.company?.toString() !== req.user.company?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view users from other companies',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      phone, 
      department, 
      position, 
      status, 
      dateOfBirth,
      address,
      joinDate,
      employeeId
    } = req.body;

    // Find user first to check permissions
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Authorization logic
    if (req.user.role === 'employee' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user',
      });
    }

    if (
      req.user.role === 'hr' &&
      user.company?.toString() !== req.user.company?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update users from other companies',
      });
    }

    // Build update object with allowed fields
    const updateFields = {};
    
    // All users can update these basic fields
    if (name !== undefined) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;

    // Handle profile photo upload if file is present
    if (req.file) {
      try {
        const { uploadToCloudinary } = require('../utils/uploadToCloudinary');
        console.log('📸 Admin: Uploading profile photo for user:', id);
        const uploadResult = await uploadToCloudinary(req.file.buffer, { folder: 'profile-photos' });
        updateFields.profilePhoto = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        };
        console.log('✅ Admin: Profile photo uploaded:', updateFields.profilePhoto.url);
      } catch (uploadError) {
        console.error('❌ Admin: Profile photo upload error:', uploadError);
      }
    }

    // Only HR and Admin can update these
    if (req.user.role === 'admin' || req.user.role === 'hr') {
      if (email !== undefined) updateFields.email = email;
      if (department !== undefined) updateFields.department = department;
      if (position !== undefined) updateFields.position = position;
      if (status !== undefined) updateFields.status = status;
      if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
      if (joinDate !== undefined) updateFields.joinDate = joinDate;
      if (employeeId !== undefined) updateFields.employeeId = employeeId;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    })
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .populate('company', 'name');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email or Employee ID already exists',
      });
    }
    console.error('Update user error:', error);
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/user/:id
 * @access  Private (Admin, HR)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // HR can only delete users from their company
    if (
      req.user.role === 'hr' &&
      user.company?.toString() !== req.user.company?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete users from other companies',
      });
    }

    // Prevent deleting self
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }

    // Prevent deleting admin accounts (unless you're also admin)
    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete admin accounts',
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
