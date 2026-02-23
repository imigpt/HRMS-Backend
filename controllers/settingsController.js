/**
 * SETTINGS CONTROLLER - Admin settings management
 * 
 * Handles system settings, employee ID config, roles/permissions,
 * email settings, and company configuration.
 */

const SystemSettings = require('../models/SystemSettings.model');
const EmployeeIDConfig = require('../models/EmployeeIDConfig.model');
const Role = require('../models/Role.model');
const EmailSettings = require('../models/EmailSettings.model');
const EmailLog = require('../models/EmailLog.model');
const EmailTemplate = require('../models/EmailTemplate.model');
const PermissionModule = require('../models/PermissionModule.model');
const User = require('../models/User.model');
const Company = require('../models/Company.model');
const nodemailer = require('nodemailer');

// ========================
// SYSTEM SETTINGS
// ========================

/**
 * Get all settings or by category
 */
exports.getSettings = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const settings = await SystemSettings.find(filter)
      .populate('updatedBy', 'name email')
      .sort({ category: 1, key: 1 });

    // Convert to key-value map grouped by category
    const grouped = {};
    settings.forEach(s => {
      if (!grouped[s.category]) grouped[s.category] = {};
      grouped[s.category][s.key] = s.value;
    });

    res.status(200).json({ success: true, data: category ? (grouped[category] || {}) : grouped, raw: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update a single setting
 */
exports.updateSetting = async (req, res) => {
  try {
    const { key, value, category, description } = req.body;
    if (!key || value === undefined || !category) {
      return res.status(400).json({ success: false, message: 'key, value, and category are required' });
    }

    const setting = await SystemSettings.findOneAndUpdate(
      { key, category },
      { value, description, updatedBy: req.user._id, updatedAt: new Date() },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk update settings for a category
 */
exports.updateCategorySettings = async (req, res) => {
  try {
    const { category } = req.params;
    const { settings } = req.body; // { key: value, key2: value2, ... }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'settings object is required' });
    }

    const ops = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key, category },
        update: { value, category, updatedBy: req.user._id, updatedAt: new Date() },
        upsert: true
      }
    }));

    await SystemSettings.bulkWrite(ops);

    const updated = await SystemSettings.find({ category }).sort({ key: 1 });
    const result = {};
    updated.forEach(s => { result[s.key] = s.value; });

    res.status(200).json({ success: true, message: `${category} settings updated`, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// HRM / ATTENDANCE SETTINGS
// ========================

/**
 * Get HRM settings (attendance rules, work policies)
 */
exports.getHRMSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.find({ category: 'hrm' });
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });

    // Provide defaults if not set
    const defaults = {
      leaveStartMonth: 'January',
      clockInTime: '09:30:00',
      clockOutTime: '18:00:00',
      earlyClockInMinutes: 0,
      allowClockOutTillMinutes: 0,
      lateMarkAfterMinutes: 30,
      selfClocking: true,
      captureLocation: false,
      halfDayHours: 4,
      allowedIPs: [],
      workingDaysPerWeek: 5,
      weeklyOffDays: ['sunday']
    };

    res.status(200).json({ success: true, data: { ...defaults, ...result } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update HRM settings
 */
exports.updateHRMSettings = async (req, res) => {
  try {
    const settings = req.body;
    const ops = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key, category: 'hrm' },
        update: { value, category: 'hrm', updatedBy: req.user._id, updatedAt: new Date() },
        upsert: true
      }
    }));

    await SystemSettings.bulkWrite(ops);

    const updated = await SystemSettings.find({ category: 'hrm' });
    const result = {};
    updated.forEach(s => { result[s.key] = s.value; });

    res.status(200).json({ success: true, message: 'HRM settings updated', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// EMPLOYEE ID CONFIG
// ========================

/**
 * Get employee ID configuration
 */
exports.getEmployeeIDConfig = async (req, res) => {
  try {
    let config = await EmployeeIDConfig.findOne().populate('updatedBy', 'name email');
    if (!config) {
      config = await EmployeeIDConfig.create({ prefix: 'EMP', nextNumber: 1 });
    }
    // Generate preview
    const preview = config.generateNextId();
    res.status(200).json({ success: true, data: { ...config.toObject(), preview } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update employee ID configuration
 */
exports.updateEmployeeIDConfig = async (req, res) => {
  try {
    const { prefix, nextNumber, padding, separator, includeYear, formatRule, manualOverrideAllowed } = req.body;
    
    let config = await EmployeeIDConfig.findOne();
    if (!config) {
      config = new EmployeeIDConfig({});
    }

    if (prefix !== undefined) config.prefix = prefix;
    if (nextNumber !== undefined) config.nextNumber = nextNumber;
    if (padding !== undefined) config.padding = padding;
    if (separator !== undefined) config.separator = separator;
    if (includeYear !== undefined) config.includeYear = includeYear;
    if (formatRule !== undefined) config.formatRule = formatRule;
    if (manualOverrideAllowed !== undefined) config.manualOverrideAllowed = manualOverrideAllowed;
    config.updatedBy = req.user._id;

    await config.save();
    const preview = config.generateNextId();
    
    res.status(200).json({ success: true, data: { ...config.toObject(), preview } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Assign employee ID to a user
 */
exports.assignEmployeeID = async (req, res) => {
  try {
    const { userId, customId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let newId;
    if (customId) {
      // Check uniqueness
      const existing = await User.findOne({ employeeId: customId, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Employee ID already in use' });
      }
      newId = customId;
    } else {
      // Auto-generate
      const config = await EmployeeIDConfig.findOne();
      if (!config) {
        return res.status(400).json({ success: false, message: 'Employee ID configuration not set up' });
      }
      newId = config.generateNextId();
      config.nextNumber += 1;
      await config.save();
    }

    user.employeeId = newId;
    await user.save();

    res.status(200).json({ success: true, data: { userId: user._id, employeeId: newId, name: user.name } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get employee ID for a user
 */
exports.getEmployeeID = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('name employeeId email role');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// COMPANY SETTINGS
// ========================

/**
 * Get company settings
 */
exports.getCompanySettings = async (req, res) => {
  try {
    // Get company from user's company or first company
    let company;
    if (req.user.company) {
      company = await Company.findById(req.user.company);
    } else {
      company = await Company.findOne();
    }

    // Get additional settings from SystemSettings
    const sysSettings = await SystemSettings.find({ category: 'company' });
    const additional = {};
    sysSettings.forEach(s => { additional[s.key] = s.value; });

    res.status(200).json({
      success: true,
      data: {
        company: company || {},
        settings: additional
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update company settings
 */
exports.updateCompanySettings = async (req, res) => {
  try {
    const { companyData, settings } = req.body;

    // Update company model fields
    if (companyData) {
      let company;
      if (req.user.company) {
        company = await Company.findByIdAndUpdate(req.user.company, companyData, { new: true, runValidators: true });
      } else {
        company = await Company.findOne();
        if (company) {
          Object.assign(company, companyData);
          await company.save();
        }
      }
    }

    // Update system settings
    if (settings && typeof settings === 'object') {
      const ops = Object.entries(settings).map(([key, value]) => ({
        updateOne: {
          filter: { key, category: 'company' },
          update: { value, category: 'company', updatedBy: req.user._id, updatedAt: new Date() },
          upsert: true
        }
      }));
      await SystemSettings.bulkWrite(ops);
    }

    res.status(200).json({ success: true, message: 'Company settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// ROLES & PERMISSIONS
// ========================

/**
 * Get all roles
 */
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find()
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ isSystem: -1, roleName: 1 });
    res.status(200).json({ success: true, count: roles.length, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a role
 */
exports.createRole = async (req, res) => {
  try {
    const { roleName, description, permissions } = req.body;

    if (!roleName) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const existing = await Role.findOne({ roleName: roleName.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Role already exists' });
    }

    const role = await Role.create({
      roleName: roleName.toLowerCase(),
      description,
      permissions: permissions || [],
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    res.status(201).json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update a role
 */
exports.updateRole = async (req, res) => {
  try {
    const { roleName, description, permissions, status } = req.body;
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // Prevent modifying system roles' names
    if (role.isSystem && roleName && roleName !== role.roleName) {
      return res.status(400).json({ success: false, message: 'Cannot rename system roles' });
    }

    if (roleName) role.roleName = roleName.toLowerCase();
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;
    if (status) role.status = status;
    role.updatedBy = req.user._id;

    await role.save();
    res.status(200).json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a role
 */
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    if (role.isSystem) {
      return res.status(400).json({ success: false, message: 'Cannot delete system roles' });
    }

    await Role.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Role deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get permissions for a role
 */
exports.getRolePermissions = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    res.status(200).json({ success: true, data: { roleName: role.roleName, permissions: role.permissions } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Assign permissions to a role
 */
exports.assignPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    role.permissions = permissions;
    role.updatedBy = req.user._id;
    await role.save();

    res.status(200).json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// EMAIL SETTINGS
// ========================

/**
 * Get email settings
 */
exports.getEmailSettings = async (req, res) => {
  try {
    let settings = await EmailSettings.findOne().populate('updatedBy', 'name email');
    if (!settings) {
      settings = await EmailSettings.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update email settings
 */
exports.updateEmailSettings = async (req, res) => {
  try {
    const updates = req.body;
    let settings = await EmailSettings.findOne();
    if (!settings) {
      settings = new EmailSettings({});
    }

    const allowed = [
      'mailDriver', 'smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword',
      'encryption', 'fromName', 'fromEmail', 'triggers', 'sendgridApiKey'
    ];
    allowed.forEach(field => {
      if (updates[field] !== undefined) settings[field] = updates[field];
    });
    settings.updatedBy = req.user._id;

    await settings.save();
    res.status(200).json({ success: true, message: 'Email settings updated', data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send test email
 */
exports.sendTestEmail = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, message: 'Recipient email is required' });
    }

    const settings = await EmailSettings.findOne().select('+smtpPassword');
    if (!settings) {
      return res.status(400).json({ success: false, message: 'Email settings not configured' });
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.encryption === 'ssl',
      auth: {
        user: settings.smtpUsername,
        pass: settings.smtpPassword
      }
    });

    await transporter.sendMail({
      from: `${settings.fromName} <${settings.fromEmail}>`,
      to,
      subject: 'HRMS Test Email',
      html: '<h1>Test Email</h1><p>This is a test email from your HRMS system.</p><p>If you received this, your email settings are configured correctly.</p>'
    });

    await EmailLog.create({
      to: [to],
      subject: 'HRMS Test Email',
      body: 'Test email',
      type: 'test',
      status: 'sent',
      sentBy: req.user._id
    });

    res.status(200).json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    await EmailLog.create({
      to: [req.body.to],
      subject: 'HRMS Test Email',
      body: 'Test email',
      type: 'test',
      status: 'failed',
      error: error.message,
      sentBy: req.user._id
    });
    res.status(500).json({ success: false, message: `Failed to send email: ${error.message}` });
  }
};

/**
 * Send bulk email
 */
exports.sendBulkEmail = async (req, res) => {
  try {
    const { recipients, subject, body, targetRole } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ success: false, message: 'Subject and body are required' });
    }

    let toEmails = [];
    if (targetRole) {
      const users = await User.find({ role: targetRole, status: 'active' }).select('email');
      toEmails = users.map(u => u.email);
    } else if (recipients && Array.isArray(recipients)) {
      toEmails = recipients;
    } else {
      // Send to all active users
      const users = await User.find({ status: 'active' }).select('email');
      toEmails = users.map(u => u.email);
    }

    if (toEmails.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients found' });
    }

    const settings = await EmailSettings.findOne().select('+smtpPassword');
    if (!settings || !settings.smtpUsername) {
      return res.status(400).json({ success: false, message: 'Email settings not configured' });
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.encryption === 'ssl',
      auth: {
        user: settings.smtpUsername,
        pass: settings.smtpPassword
      }
    });

    let sent = 0;
    let failed = 0;
    for (const email of toEmails) {
      try {
        await transporter.sendMail({
          from: `${settings.fromName} <${settings.fromEmail}>`,
          to: email,
          subject,
          html: body
        });
        sent++;
      } catch {
        failed++;
      }
    }

    await EmailLog.create({
      to: toEmails,
      subject,
      body,
      type: targetRole ? 'role-based' : 'bulk',
      targetRole,
      status: failed === 0 ? 'sent' : 'failed',
      error: failed > 0 ? `${failed} of ${toEmails.length} emails failed` : null,
      sentBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: `Emails sent: ${sent}, Failed: ${failed}`,
      data: { sent, failed, total: toEmails.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get email logs
 */
exports.getEmailLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      EmailLog.find()
        .populate('sentBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      EmailLog.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// STORAGE SETTINGS
// ========================

exports.getStorageSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.find({ category: 'storage' });
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });

    const defaults = {
      provider: 'cloudinary',
      cloudinaryCloudName: '',
      cloudinaryApiKey: '',
      cloudinaryApiSecret: '',
      maxFileSize: 10,
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx']
    };

    res.status(200).json({ success: true, data: { ...defaults, ...result } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStorageSettings = async (req, res) => {
  try {
    const settings = req.body;
    const ops = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key, category: 'storage' },
        update: { value, category: 'storage', updatedBy: req.user._id, updatedAt: new Date() },
        upsert: true
      }
    }));

    await SystemSettings.bulkWrite(ops);
    res.status(200).json({ success: true, message: 'Storage settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// LOCALIZATION SETTINGS
// ========================

exports.getLocalizationSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.find({ category: 'localization' });
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });

    const defaults = {
      defaultLanguage: 'en',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      currency: 'INR',
      currencySymbol: '₹',
      currencyPosition: 'before'
    };

    res.status(200).json({ success: true, data: { ...defaults, ...result } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateLocalizationSettings = async (req, res) => {
  try {
    const settings = req.body;
    const ops = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key, category: 'localization' },
        update: { value, category: 'localization', updatedBy: req.user._id, updatedAt: new Date() },
        upsert: true
      }
    }));
    await SystemSettings.bulkWrite(ops);
    res.status(200).json({ success: true, message: 'Localization settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// PAYROLL SETTINGS
// ========================

exports.getPayrollSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.find({ category: 'payroll' });
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });

    const defaults = {
      payrollCycle: 'monthly',
      payDay: 1,
      overtimeRate: 1.5,
      taxCalculation: 'auto',
      providentFundPercentage: 12,
      esiPercentage: 0.75,
      professionalTax: true,
      autoGeneratePayslip: true,
      payslipFormat: 'pdf'
    };

    res.status(200).json({ success: true, data: { ...defaults, ...result } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePayrollSettings = async (req, res) => {
  try {
    const settings = req.body;
    const ops = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key, category: 'payroll' },
        update: { value, category: 'payroll', updatedBy: req.user._id, updatedAt: new Date() },
        upsert: true
      }
    }));
    await SystemSettings.bulkWrite(ops);
    res.status(200).json({ success: true, message: 'Payroll settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// EMPLOYEE WORK STATUS SETTINGS
// ========================

exports.getWorkStatusSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.find({ category: 'general', key: 'workStatuses' });
    const defaults = ['active', 'on-leave', 'inactive', 'probation', 'notice-period', 'terminated'];
    const data = settings.length > 0 ? settings[0].value : defaults;
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateWorkStatusSettings = async (req, res) => {
  try {
    const { statuses } = req.body;
    if (!Array.isArray(statuses)) {
      return res.status(400).json({ success: false, message: 'statuses must be an array' });
    }
    await SystemSettings.findOneAndUpdate(
      { key: 'workStatuses', category: 'general' },
      { value: statuses, updatedBy: req.user._id, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, message: 'Work statuses updated', data: statuses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// GET MY PERMISSIONS (any authenticated user)
// ========================

exports.getMyPermissions = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Fetch all active modules from DB
    let activeModules = await PermissionModule.find({ isActive: true }).sort({ sortOrder: 1 }).select('name');
    let allModuleNames = activeModules.map(m => m.name);

    // Fallback: if no modules in DB yet, use defaults
    if (allModuleNames.length === 0) {
      allModuleNames = [
        'dashboard', 'employees', 'attendance', 'leaves',
        'tasks', 'expenses', 'payroll', 'chat', 'announcements',
        'policies', 'companies', 'clients', 'settings', 'reports'
      ];
    }

    // Admin always gets full access on all modules
    if (userRole === 'admin') {
      return res.status(200).json({
        success: true,
        data: {
          role: 'admin',
          permissions: allModuleNames.map(m => ({ module: m, actions: { view: true, create: true, edit: true, delete: true } }))
        }
      });
    }

    // For HR/employee/client, look up their role in the DB
    const role = await Role.findOne({ roleName: userRole, status: 'active' });
    if (!role) {
      // Fallback: return empty permissions (nothing visible)
      return res.status(200).json({
        success: true,
        data: { role: userRole, permissions: [] }
      });
    }

    res.status(200).json({
      success: true,
      data: { role: role.roleName, permissions: role.permissions }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// SEED DEFAULT ROLES
// ========================

exports.seedDefaultRoles = async (req, res) => {
  try {
    // Fetch all active modules from DB
    let activeModules = await PermissionModule.find({ isActive: true }).sort({ sortOrder: 1 }).select('name');
    let allModules = activeModules.map(m => m.name);

    // Fallback: if no modules in DB yet, seed default modules first
    if (allModules.length === 0) {
      const defaultModules = [
        { name: 'dashboard', label: 'Dashboard', isSystem: true, sortOrder: 1 },
        { name: 'employees', label: 'Employees', isSystem: true, sortOrder: 2 },
        { name: 'attendance', label: 'Attendance', isSystem: true, sortOrder: 3 },
        { name: 'leaves', label: 'Leaves', isSystem: true, sortOrder: 4 },
        { name: 'tasks', label: 'Tasks', isSystem: true, sortOrder: 5 },
        { name: 'expenses', label: 'Expenses', isSystem: true, sortOrder: 6 },
        { name: 'payroll', label: 'Payroll', isSystem: true, sortOrder: 7 },
        { name: 'chat', label: 'Chat', isSystem: true, sortOrder: 8 },
        { name: 'announcements', label: 'Announcements', isSystem: true, sortOrder: 9 },
        { name: 'policies', label: 'Policies', isSystem: true, sortOrder: 10 },
        { name: 'companies', label: 'Companies', isSystem: true, sortOrder: 11 },
        { name: 'clients', label: 'Clients', isSystem: true, sortOrder: 12 },
        { name: 'settings', label: 'Settings', isSystem: true, sortOrder: 13 },
        { name: 'reports', label: 'Reports', isSystem: true, sortOrder: 14 },
      ];
      for (const mod of defaultModules) {
        await PermissionModule.findOneAndUpdate({ name: mod.name }, mod, { upsert: true, new: true });
      }
      allModules = defaultModules.map(m => m.name);
    }

    const defaultRoles = [
      {
        roleName: 'admin',
        description: 'Full system access',
        isSystem: true,
        permissions: allModules.map(m => ({ module: m, actions: { view: true, create: true, edit: true, delete: true } }))
      },
      {
        roleName: 'hr',
        description: 'HR management access',
        isSystem: true,
        permissions: allModules.filter(m => m !== 'settings' && m !== 'companies').map(m => ({
          module: m,
          actions: { view: true, create: true, edit: true, delete: m !== 'payroll' }
        }))
      },
      {
        roleName: 'employee',
        description: 'Basic employee access',
        isSystem: true,
        permissions: ['dashboard', 'attendance', 'leaves', 'tasks', 'expenses', 'chat', 'announcements', 'policies'].map(m => ({
          module: m,
          actions: { view: true, create: m !== 'announcements' && m !== 'policies', edit: false, delete: false }
        }))
      }
    ];

    for (const role of defaultRoles) {
      await Role.findOneAndUpdate(
        { roleName: role.roleName },
        role,
        { upsert: true, new: true }
      );
    }

    const roles = await Role.find().sort({ isSystem: -1, roleName: 1 });
    res.status(200).json({ success: true, message: 'Default roles seeded', data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// PERMISSION MODULES (dynamic module management)
// ========================

/**
 * Get all permission modules
 */
exports.getPermissionModules = async (req, res) => {
  try {
    const modules = await PermissionModule.find().sort({ sortOrder: 1 });
    res.status(200).json({ success: true, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new permission module
 */
exports.createPermissionModule = async (req, res) => {
  try {
    const { name, label, description } = req.body;
    if (!name || !label) {
      return res.status(400).json({ success: false, message: 'Name and label are required' });
    }
    const existing = await PermissionModule.findOne({ name: name.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Module with this name already exists' });
    }
    const maxOrder = await PermissionModule.findOne().sort({ sortOrder: -1 }).select('sortOrder');
    const mod = await PermissionModule.create({
      name: name.toLowerCase().trim(),
      label: label.trim(),
      description: description || '',
      sortOrder: (maxOrder?.sortOrder || 0) + 1,
      isSystem: false,
      isActive: true
    });
    res.status(201).json({ success: true, data: mod });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update a permission module
 */
exports.updatePermissionModule = async (req, res) => {
  try {
    const { label, description, isActive, sortOrder } = req.body;
    const mod = await PermissionModule.findById(req.params.id);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }
    if (label !== undefined) mod.label = label;
    if (description !== undefined) mod.description = description;
    if (isActive !== undefined) mod.isActive = isActive;
    if (sortOrder !== undefined) mod.sortOrder = sortOrder;
    await mod.save();
    res.status(200).json({ success: true, data: mod });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a permission module (non-system only)
 */
exports.deletePermissionModule = async (req, res) => {
  try {
    const mod = await PermissionModule.findById(req.params.id);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }
    if (mod.isSystem) {
      return res.status(400).json({ success: false, message: 'Cannot delete system modules' });
    }
    // Also remove this module from all existing roles
    await Role.updateMany(
      {},
      { $pull: { permissions: { module: mod.name } } }
    );
    await mod.deleteOne();
    res.status(200).json({ success: true, message: 'Module deleted and removed from all roles' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Seed default permission modules
 */
exports.seedPermissionModules = async (req, res) => {
  try {
    const defaultModules = [
      { name: 'dashboard', label: 'Dashboard', isSystem: true, sortOrder: 1 },
      { name: 'employees', label: 'Employees', isSystem: true, sortOrder: 2 },
      { name: 'attendance', label: 'Attendance', isSystem: true, sortOrder: 3 },
      { name: 'leaves', label: 'Leaves', isSystem: true, sortOrder: 4 },
      { name: 'tasks', label: 'Tasks', isSystem: true, sortOrder: 5 },
      { name: 'expenses', label: 'Expenses', isSystem: true, sortOrder: 6 },
      { name: 'payroll', label: 'Payroll', isSystem: true, sortOrder: 7 },
      { name: 'chat', label: 'Chat', isSystem: true, sortOrder: 8 },
      { name: 'announcements', label: 'Announcements', isSystem: true, sortOrder: 9 },
      { name: 'policies', label: 'Policies', isSystem: true, sortOrder: 10 },
      { name: 'companies', label: 'Companies', isSystem: true, sortOrder: 11 },
      { name: 'clients', label: 'Clients', isSystem: true, sortOrder: 12 },
      { name: 'settings', label: 'Settings', isSystem: true, sortOrder: 13 },
      { name: 'reports', label: 'Reports', isSystem: true, sortOrder: 14 },
    ];
    for (const mod of defaultModules) {
      await PermissionModule.findOneAndUpdate({ name: mod.name }, mod, { upsert: true, new: true });
    }
    const modules = await PermissionModule.find().sort({ sortOrder: 1 });
    res.status(200).json({ success: true, message: 'Default modules seeded', data: modules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// EMAIL TEMPLATES
// ========================

/**
 * Get all email templates (with optional category filter & search)
 */
exports.getEmailTemplates = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
      ];
    }
    const templates = await EmailTemplate.find(filter)
      .populate('updatedBy', 'name email')
      .sort({ category: 1, type: 1 });
    res.status(200).json({ success: true, count: templates.length, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single email template by ID
 */
exports.getEmailTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id)
      .populate('updatedBy', 'name email');
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create email template
 */
exports.createEmailTemplate = async (req, res) => {
  try {
    const { name, subject, body, category, type, variables } = req.body;
    if (!name || !subject || !body || !type) {
      return res.status(400).json({ success: false, message: 'Name, subject, body, and type are required' });
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await EmailTemplate.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Template with this name already exists' });
    }
    const template = await EmailTemplate.create({
      name, slug, subject, body,
      category: category || 'company',
      type,
      variables: variables || [],
      updatedBy: req.user._id
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update email template
 */
exports.updateEmailTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    const { name, subject, body, category, type, variables, isActive } = req.body;
    if (name !== undefined) {
      template.name = name;
      template.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (subject !== undefined) template.subject = subject;
    if (body !== undefined) template.body = body;
    if (category !== undefined) template.category = category;
    if (type !== undefined) template.type = type;
    if (variables !== undefined) template.variables = variables;
    if (isActive !== undefined) template.isActive = isActive;
    template.updatedBy = req.user._id;
    await template.save();
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete email template
 */
exports.deleteEmailTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    if (template.isSystem) {
      return res.status(400).json({ success: false, message: 'Cannot delete system templates' });
    }
    await EmailTemplate.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send email using a specific template
 */
exports.sendEmailFromTemplate = async (req, res) => {
  try {
    const { recipients, customVariables } = req.body;
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'Recipients are required' });
    }

    // Get SMTP settings
    const emailSettings = await EmailSettings.findOne().select('+smtpPassword');
    if (!emailSettings || !emailSettings.smtpHost) {
      return res.status(400).json({ success: false, message: 'Email server not configured' });
    }

    // Replace variables in subject and body
    let subject = template.subject;
    let body = template.body;
    if (customVariables) {
      Object.entries(customVariables).forEach(([key, value]) => {
        const regex = new RegExp(`##${key}##`, 'g');
        subject = subject.replace(regex, String(value));
        body = body.replace(regex, String(value));
      });
    }

    const transporter = nodemailer.createTransport({
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      secure: emailSettings.encryption === 'ssl',
      auth: {
        user: emailSettings.smtpUsername,
        pass: emailSettings.smtpPassword
      }
    });

    await transporter.sendMail({
      from: `${emailSettings.fromName} <${emailSettings.fromEmail}>`,
      to: recipients.join(', '),
      subject,
      html: body
    });

    await EmailLog.create({
      to: recipients,
      subject,
      body,
      type: 'individual',
      status: 'sent',
      sentBy: req.user._id
    });

    res.status(200).json({ success: true, message: `Email sent to ${recipients.length} recipient(s)` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Seed default email templates
 */
exports.seedEmailTemplates = async (req, res) => {
  try {
    const defaults = [
      // Company templates
      {
        name: 'New Leave Request Submitted',
        slug: 'new-leave-request-submitted',
        subject: 'New Leave Request Submitted by ##EMPLOYEE_NAME##',
        body: '<p>Dear Admin/HR,</p><p><strong>##EMPLOYEE_NAME##</strong> has submitted a new leave request.</p><p><strong>Leave Type:</strong> ##LEAVE_TYPE##</p><p><strong>From:</strong> ##FROM_DATE##</p><p><strong>To:</strong> ##TO_DATE##</p><p><strong>Reason:</strong> ##REASON##</p><p>Please review and take action.</p>',
        category: 'company',
        type: 'On Employee Leave Apply',
        variables: ['EMPLOYEE_NAME', 'LEAVE_TYPE', 'FROM_DATE', 'TO_DATE', 'REASON'],
        isSystem: true
      },
      {
        name: 'New Expense Request Submitted',
        slug: 'new-expense-request-submitted',
        subject: 'New Expense Request Submitted by ##EMPLOYEE_NAME##',
        body: '<p>Dear Admin/HR,</p><p><strong>##EMPLOYEE_NAME##</strong> has submitted a new expense request.</p><p><strong>Title:</strong> ##EXPENSE_TITLE##</p><p><strong>Amount:</strong> ##AMOUNT##</p><p><strong>Category:</strong> ##CATEGORY##</p><p>Please review and approve.</p>',
        category: 'company',
        type: 'On Employee Expense Apply',
        variables: ['EMPLOYEE_NAME', 'EXPENSE_TITLE', 'AMOUNT', 'CATEGORY'],
        isSystem: true
      },
      {
        name: 'Employee Clock-In Notification',
        slug: 'employee-clock-in-notification',
        subject: 'Employee Clock-In Notification - ##EMPLOYEE_NAME##',
        body: '<p>Dear Admin/HR,</p><p><strong>##EMPLOYEE_NAME##</strong> has clocked in.</p><p><strong>Time:</strong> ##CLOCK_IN_TIME##</p><p><strong>Location:</strong> ##LOCATION##</p>',
        category: 'company',
        type: 'On Employee Clock In',
        variables: ['EMPLOYEE_NAME', 'CLOCK_IN_TIME', 'LOCATION'],
        isSystem: true
      },
      {
        name: 'Employee Clock-Out Notification',
        slug: 'employee-clock-out-notification',
        subject: 'Employee Clock-Out Notification - ##EMPLOYEE_NAME##',
        body: '<p>Dear Admin/HR,</p><p><strong>##EMPLOYEE_NAME##</strong> has clocked out.</p><p><strong>Time:</strong> ##CLOCK_OUT_TIME##</p><p><strong>Total Hours:</strong> ##TOTAL_HOURS##</p>',
        category: 'company',
        type: 'On Employee Clock Out',
        variables: ['EMPLOYEE_NAME', 'CLOCK_OUT_TIME', 'TOTAL_HOURS'],
        isSystem: true
      },
      {
        name: 'Resignation Submitted',
        slug: 'resignation-submitted',
        subject: 'Resignation Submitted by ##EMPLOYEE_NAME##',
        body: '<p>Dear Admin/HR,</p><p><strong>##EMPLOYEE_NAME##</strong> has submitted a resignation.</p><p><strong>Effective Date:</strong> ##EFFECTIVE_DATE##</p><p><strong>Reason:</strong> ##REASON##</p>',
        category: 'company',
        type: 'On Employee Resignation Apply',
        variables: ['EMPLOYEE_NAME', 'EFFECTIVE_DATE', 'REASON'],
        isSystem: true
      },
      {
        name: 'New Complaint Submitted',
        slug: 'new-complaint-submitted',
        subject: 'New Complaint Submitted by ##EMPLOYEE_NAME##',
        body: '<p>Dear Admin/HR,</p><p><strong>##EMPLOYEE_NAME##</strong> has submitted a new complaint.</p><p><strong>Subject:</strong> ##COMPLAINT_SUBJECT##</p><p><strong>Description:</strong> ##DESCRIPTION##</p>',
        category: 'company',
        type: 'On Employee Complaint Apply',
        variables: ['EMPLOYEE_NAME', 'COMPLAINT_SUBJECT', 'DESCRIPTION'],
        isSystem: true
      },
      {
        name: 'Survey Feedback Submitted',
        slug: 'survey-feedback-submitted',
        subject: 'Survey Feedback Submitted by ##EMPLOYEE_NAME##',
        body: '<p>Dear Admin/HR,</p><p><strong>##EMPLOYEE_NAME##</strong> has submitted survey feedback.</p><p><strong>Survey:</strong> ##SURVEY_NAME##</p><p><strong>Rating:</strong> ##RATING##</p>',
        category: 'company',
        type: 'On Employee Survey Submit',
        variables: ['EMPLOYEE_NAME', 'SURVEY_NAME', 'RATING'],
        isSystem: true
      },
      {
        name: 'New Task Assigned',
        slug: 'new-task-assigned',
        subject: 'New Task Assigned to ##EMPLOYEE_NAME##',
        body: '<p>Dear Admin/HR,</p><p>A new task has been assigned to <strong>##EMPLOYEE_NAME##</strong>.</p><p><strong>Task:</strong> ##TASK_TITLE##</p><p><strong>Priority:</strong> ##PRIORITY##</p><p><strong>Due Date:</strong> ##DUE_DATE##</p>',
        category: 'company',
        type: 'On Task Assignment',
        variables: ['EMPLOYEE_NAME', 'TASK_TITLE', 'PRIORITY', 'DUE_DATE'],
        isSystem: true
      },
      {
        name: 'New Announcement Published',
        slug: 'new-announcement-published',
        subject: 'New Announcement: ##TITLE##',
        body: '<p>Dear Team,</p><p>A new announcement has been published.</p><p><strong>Title:</strong> ##TITLE##</p><p>##CONTENT##</p>',
        category: 'company',
        type: 'On Announcement Create',
        variables: ['TITLE', 'CONTENT'],
        isSystem: true
      },
      // Employee templates
      {
        name: 'Leave Request Approved',
        slug: 'leave-request-approved',
        subject: 'Your Leave Request has been Approved',
        body: '<p>Dear ##EMPLOYEE_NAME##,</p><p>Your leave request has been <strong>approved</strong>.</p><p><strong>Leave Type:</strong> ##LEAVE_TYPE##</p><p><strong>From:</strong> ##FROM_DATE##</p><p><strong>To:</strong> ##TO_DATE##</p><p><strong>Approved by:</strong> ##APPROVED_BY##</p>',
        category: 'employee',
        type: 'On Leave Approved',
        variables: ['EMPLOYEE_NAME', 'LEAVE_TYPE', 'FROM_DATE', 'TO_DATE', 'APPROVED_BY'],
        isSystem: true
      },
      {
        name: 'Leave Request Rejected',
        slug: 'leave-request-rejected',
        subject: 'Your Leave Request has been Rejected',
        body: '<p>Dear ##EMPLOYEE_NAME##,</p><p>Your leave request has been <strong>rejected</strong>.</p><p><strong>Leave Type:</strong> ##LEAVE_TYPE##</p><p><strong>From:</strong> ##FROM_DATE##</p><p><strong>To:</strong> ##TO_DATE##</p><p><strong>Reason:</strong> ##REJECTION_REASON##</p>',
        category: 'employee',
        type: 'On Leave Rejected',
        variables: ['EMPLOYEE_NAME', 'LEAVE_TYPE', 'FROM_DATE', 'TO_DATE', 'REJECTION_REASON'],
        isSystem: true
      },
      {
        name: 'Expense Request Approved',
        slug: 'expense-request-approved',
        subject: 'Your Expense Request has been Approved',
        body: '<p>Dear ##EMPLOYEE_NAME##,</p><p>Your expense request has been <strong>approved</strong>.</p><p><strong>Title:</strong> ##EXPENSE_TITLE##</p><p><strong>Amount:</strong> ##AMOUNT##</p>',
        category: 'employee',
        type: 'On Expense Approved',
        variables: ['EMPLOYEE_NAME', 'EXPENSE_TITLE', 'AMOUNT'],
        isSystem: true
      },
      {
        name: 'Expense Request Rejected',
        slug: 'expense-request-rejected',
        subject: 'Your Expense Request has been Rejected',
        body: '<p>Dear ##EMPLOYEE_NAME##,</p><p>Your expense request has been <strong>rejected</strong>.</p><p><strong>Title:</strong> ##EXPENSE_TITLE##</p><p><strong>Reason:</strong> ##REJECTION_REASON##</p>',
        category: 'employee',
        type: 'On Expense Rejected',
        variables: ['EMPLOYEE_NAME', 'EXPENSE_TITLE', 'REJECTION_REASON'],
        isSystem: true
      },
      {
        name: 'Task Assigned to You',
        slug: 'task-assigned-to-you',
        subject: 'New Task Assigned: ##TASK_TITLE##',
        body: '<p>Dear ##EMPLOYEE_NAME##,</p><p>A new task has been assigned to you.</p><p><strong>Task:</strong> ##TASK_TITLE##</p><p><strong>Priority:</strong> ##PRIORITY##</p><p><strong>Due Date:</strong> ##DUE_DATE##</p><p><strong>Assigned by:</strong> ##ASSIGNED_BY##</p>',
        category: 'employee',
        type: 'On Task Assigned',
        variables: ['EMPLOYEE_NAME', 'TASK_TITLE', 'PRIORITY', 'DUE_DATE', 'ASSIGNED_BY'],
        isSystem: true
      },
      {
        name: 'Welcome Email',
        slug: 'welcome-email',
        subject: 'Welcome to ##COMPANY_NAME## - Your Account Details',
        body: '<p>Dear ##EMPLOYEE_NAME##,</p><p>Welcome to <strong>##COMPANY_NAME##</strong>!</p><p>Your account has been created.</p><p><strong>Email:</strong> ##EMAIL##</p><p><strong>Employee ID:</strong> ##EMPLOYEE_ID##</p><p>Please login and update your password.</p>',
        category: 'employee',
        type: 'On Employee Create',
        variables: ['EMPLOYEE_NAME', 'COMPANY_NAME', 'EMAIL', 'EMPLOYEE_ID'],
        isSystem: true
      },
      {
        name: 'Password Reset',
        slug: 'password-reset',
        subject: 'Password Reset Request',
        body: '<p>Dear ##EMPLOYEE_NAME##,</p><p>We received a request to reset your password.</p><p>Click the link below to reset:</p><p><a href="##RESET_LINK##">Reset Password</a></p><p>If you did not request this, please ignore this email.</p>',
        category: 'employee',
        type: 'On Password Reset',
        variables: ['EMPLOYEE_NAME', 'RESET_LINK'],
        isSystem: true
      },
      {
        name: 'Payslip Generated',
        slug: 'payslip-generated',
        subject: 'Your Payslip for ##MONTH## ##YEAR## is Ready',
        body: '<p>Dear ##EMPLOYEE_NAME##,</p><p>Your payslip for <strong>##MONTH## ##YEAR##</strong> has been generated.</p><p><strong>Net Pay:</strong> ##NET_PAY##</p><p>Please login to view and download your payslip.</p>',
        category: 'employee',
        type: 'On Payslip Generated',
        variables: ['EMPLOYEE_NAME', 'MONTH', 'YEAR', 'NET_PAY'],
        isSystem: true
      },
      {
        name: 'Late Arrival Alert',
        slug: 'late-arrival-alert',
        subject: 'Late Arrival Notice - ##EMPLOYEE_NAME##',
        body: '<p>Dear ##EMPLOYEE_NAME##,</p><p>You have been marked as late for today.</p><p><strong>Expected Time:</strong> ##EXPECTED_TIME##</p><p><strong>Actual Time:</strong> ##ACTUAL_TIME##</p><p>Please ensure punctuality.</p>',
        category: 'employee',
        type: 'On Late Arrival',
        variables: ['EMPLOYEE_NAME', 'EXPECTED_TIME', 'ACTUAL_TIME'],
        isSystem: true
      }
    ];

    for (const tpl of defaults) {
      await EmailTemplate.findOneAndUpdate(
        { slug: tpl.slug },
        tpl,
        { upsert: true, new: true }
      );
    }

    const templates = await EmailTemplate.find().sort({ category: 1, type: 1 });
    res.status(200).json({ success: true, message: 'Default templates seeded', count: templates.length, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
