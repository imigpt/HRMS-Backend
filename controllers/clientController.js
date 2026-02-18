/**
 * CLIENT CONTROLLER - Handles client management and client-specific operations
 *
 * Clients are external users created by Admin or HR.
 * They can ONLY access the chat panel.
 * Chat restrictions: clients can only chat with admin/hr by default.
 * If admin/hr adds a client to a group that includes employees,
 * the client can then chat with those employees through that group.
 */

const User = require('../models/User.model');
const { uploadToCloudinary } = require('../utils/uploadToCloudinary');

// ─────────────────────────────────────────────
// Helper: generate a unique client employeeId
// ─────────────────────────────────────────────
const generateClientId = async () => {
  const count = await User.countDocuments({ role: 'client' });
  return `CLT-${String(count + 1).padStart(4, '0')}`;
};

// ─────────────────────────────────────────────
// @desc    Get all clients (admin/hr only)
// @route   GET /api/clients
// ─────────────────────────────────────────────
exports.getClients = async (req, res) => {
  try {
    const { search, status } = req.query;
    const companyId = req.user.company;
    const isAdmin = req.user.role === 'admin';

    const filter = { role: 'client' };

    if (isAdmin) {
      // Admin with a company sees only that company's clients.
      // Admin without a company (super-admin) sees ALL clients.
      if (companyId) {
        filter.company = companyId;
      }
      // else: no company filter – see everything
    } else {
      // HR: see clients assigned to their company
      // OR clients with no company assigned (created by a company-less admin).
      // Using $or so both cases are covered.
      if (companyId) {
        filter.$or = [
          { company: companyId },
          { company: null },
          { company: { $exists: false } },
        ];
      }
    }

    if (status) filter.status = status;

    if (search) {
      // Merge search $or with any existing $or using $and to avoid overwriting
      const searchConditions = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
      ];
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: searchConditions },
        ];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const clients = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get single client by ID
// @route   GET /api/clients/:id
// ─────────────────────────────────────────────
exports.getClientById = async (req, res) => {
  try {
    const client = await User.findOne({
      _id: req.params.id,
      role: 'client',
    })
      .select('-password')
      .lean();

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    res.status(200).json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Create a new client (admin/hr only)
// @route   POST /api/clients
// ─────────────────────────────────────────────
exports.createClient = async (req, res) => {
  try {
    const { name, email, password, phone, companyName, clientNotes, address, company: bodyCompany } = req.body;
    // Use explicitly provided company, then fall back to creator's company.
    // This allows a super-admin (no company) to assign a client to a specific company.
    const creatorCompany = bodyCompany || req.user.company;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    // Auto-generate a client employeeId
    const employeeId = await generateClientId();

    // Profile photo upload
    let profilePhoto = null;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, { folder: 'client-photos' });
        profilePhoto = { url: result.secure_url, publicId: result.public_id };
      } catch (err) {
        console.error('Client photo upload error:', err);
      }
    }

    const client = await User.create({
      employeeId,
      name,
      email,
      password,
      phone: phone || '',
      role: 'client',
      companyName: companyName || '',
      clientNotes: clientNotes || '',
      address: address || '',
      company: creatorCompany || null,
      profilePhoto,
      status: 'active',
    });

    client.password = undefined;

    console.log(`✅ Client created: ${client.name} (${client.email}) by ${req.user.name}`);

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: client,
    });
  } catch (error) {
    console.error('createClient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create client',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Update a client (admin/hr only)
// @route   PUT /api/clients/:id
// ─────────────────────────────────────────────
exports.updateClient = async (req, res) => {
  try {
    // Disallow changing role or password via this route
    delete req.body.password;
    delete req.body.role;

    const client = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'client' },
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      data: client,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update client',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Delete a client (admin/hr only)
// @route   DELETE /api/clients/:id
// ─────────────────────────────────────────────
exports.deleteClient = async (req, res) => {
  try {
    const client = await User.findOneAndDelete({ _id: req.params.id, role: 'client' });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    res.status(200).json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete client',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Get client dashboard (chat-only summary)
// @route   GET /api/clients/dashboard
// @access  Private (client role)
// ─────────────────────────────────────────────
exports.getClientDashboard = async (req, res) => {
  try {
    const ChatRoom = require('../models/ChatRoom.model');
    const Message = require('../models/Message.model');
    const userId = req.user._id;

    // Count personal chats (with admin/hr)
    const personalChats = await ChatRoom.countDocuments({
      type: 'personal',
      participants: userId,
      isActive: true,
    });

    // Count groups the client is part of
    const groupChats = await ChatRoom.countDocuments({
      type: 'group',
      participants: userId,
      isActive: true,
    });

    // Unread messages
    const unreadMessages = await Message.countDocuments({
      sender: { $ne: userId },
      isRead: false,
      isDeleted: false,
      chatRoom: {
        $in: await ChatRoom.find({ participants: userId, isActive: true }).distinct('_id'),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        personalChats,
        groupChats,
        unreadMessages,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client dashboard',
      error: error.message,
    });
  }
};
