const CompanyPolicy = require('../models/CompanyPolicy.model');
const { uploadToCloudinary } = require('../utils/uploadToCloudinary');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');

/**
 * @desc  Get all active policies
 * @route GET /api/policies
 * @access Private (admin, hr, employee)
 */
exports.getPolicies = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { search } = req.query;

    const filter = { isActive: true };
    if (companyId) {
      filter.$or = [
        { company: companyId },
        { company: null },
        { company: { $exists: false } },
      ];
    }
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const policies = await CompanyPolicy.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: policies.length, data: policies });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch policies', error: error.message });
  }
};

/**
 * @desc  Get single policy
 * @route GET /api/policies/:id
 * @access Private
 */
exports.getPolicyById = async (req, res) => {
  try {
    const policy = await CompanyPolicy.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!policy)
      return res.status(404).json({ success: false, message: 'Policy not found' });

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch policy', error: error.message });
  }
};

/**
 * @desc  Create a new policy (admin only)
 * @route POST /api/policies
 * @access Private (Admin)
 */
exports.createPolicy = async (req, res) => {
  try {
    const { title, description, location } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const policyData = {
      title,
      description: description || '',
      location: location || 'Head Office',
      createdBy: req.user._id,
      company: req.user.company || null,
    };

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'company-policies',
        resource_type: 'raw',
        public_id: `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`,
      });
      policyData.file = {
        url: result.secure_url,
        publicId: result.public_id,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      };
    }

    const policy = await CompanyPolicy.create(policyData);
    const populated = await policy.populate('createdBy', 'name email');

    res.status(201).json({ success: true, message: 'Policy created successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create policy', error: error.message });
  }
};

/**
 * @desc  Delete a policy (admin only)
 * @route DELETE /api/policies/:id
 * @access Private (Admin)
 */
exports.deletePolicy = async (req, res) => {
  try {
    const policy = await CompanyPolicy.findById(req.params.id);
    if (!policy)
      return res.status(404).json({ success: false, message: 'Policy not found' });

    if (policy.file?.publicId) {
      try {
        await cloudinary.uploader.destroy(policy.file.publicId, { resource_type: 'raw' });
      } catch (_) { /* ignore cloudinary delete errors */ }
    }

    await CompanyPolicy.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Policy deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete policy', error: error.message });
  }
};

/**
 * @desc  Stream/download the attached file with correct headers
 * @route GET /api/policies/:id/download
 * @access Private (admin, hr, employee)
 */
exports.downloadPolicy = async (req, res) => {
  try {
    const policy = await CompanyPolicy.findById(req.params.id).lean();
    if (!policy)
      return res.status(404).json({ success: false, message: 'Policy not found' });

    if (!policy.file?.url)
      return res.status(404).json({ success: false, message: 'No file attached to this policy' });

    const filename = policy.file.originalName || `${policy.title}.pdf`;
    const response = await axios.get(policy.file.url, { responseType: 'stream' });

    const contentType =
      policy.file.mimeType ||
      response.headers['content-type'] ||
      'application/octet-stream';
    const contentLength = response.headers['content-length'];

    res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );

    response.data.pipe(res);
  } catch (error) {
    console.error('Download policy error:', error?.message);
    res.status(500).json({ success: false, message: 'Failed to download file', error: error.message });
  }
};
