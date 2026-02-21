/**
 * PAYROLL CONTROLLER - Request handlers for payroll management
 * 
 * Admin: full CRUD
 * HR/Employee: view only (own data)
 */

const payrollService = require('../services/payroll.service');
const { HTTP_STATUS, ROLES } = require('../constants');

// ============ EMPLOYEE SALARY ============

exports.createSalary = async (req, res) => {
  try {
    const data = {
      ...req.body,
      company: req.user.company || null,
      createdBy: req.user._id
    };
    const salary = await payrollService.createSalary(data);
    res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Salary created successfully', data: salary });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

exports.getAllSalaries = async (req, res) => {
  try {
    const companyId = req.user.company;
    const filters = { ...req.query };

    // HR/Employee can only see their own
    if (req.user.role === ROLES.HR || req.user.role === ROLES.EMPLOYEE) {
      filters.userId = req.user._id;
    }

    const salaries = await payrollService.getAllSalaries(companyId, filters);
    res.status(HTTP_STATUS.OK).json({ success: true, count: salaries.length, data: salaries });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

exports.getSalaryById = async (req, res) => {
  try {
    const salary = await payrollService.getSalaryById(req.params.id);
    if (!salary) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Salary not found' });
    }
    // HR/Employee can only view their own
    if ((req.user.role === ROLES.HR || req.user.role === ROLES.EMPLOYEE) &&
        salary.user._id.toString() !== req.user._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: 'Access denied' });
    }
    res.status(HTTP_STATUS.OK).json({ success: true, data: salary });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

exports.getMySalary = async (req, res) => {
  try {
    const salary = await payrollService.getSalaryByUser(req.user._id);
    res.status(HTTP_STATUS.OK).json({ success: true, data: salary });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

exports.updateSalary = async (req, res) => {
  try {
    const salary = await payrollService.updateSalary(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Salary updated successfully', data: salary });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

exports.deleteSalary = async (req, res) => {
  try {
    await payrollService.deleteSalary(req.params.id);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Salary deleted successfully' });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

// ============ PRE-PAYMENTS ============

exports.createPrePayment = async (req, res) => {
  try {
    const data = {
      ...req.body,
      company: req.user.company || null,
      createdBy: req.user._id
    };
    const pp = await payrollService.createPrePayment(data);
    res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Pre-payment created successfully', data: pp });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

exports.getAllPrePayments = async (req, res) => {
  try {
    const companyId = req.user.company;
    const filters = { ...req.query };

    if (req.user.role === ROLES.HR || req.user.role === ROLES.EMPLOYEE) {
      filters.userId = req.user._id;
    }

    const prePayments = await payrollService.getAllPrePayments(companyId, filters);
    res.status(HTTP_STATUS.OK).json({ success: true, count: prePayments.length, data: prePayments });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

exports.getPrePaymentById = async (req, res) => {
  try {
    const pp = await payrollService.getPrePaymentById(req.params.id);
    if (!pp) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Pre-payment not found' });
    }
    if ((req.user.role === ROLES.HR || req.user.role === ROLES.EMPLOYEE) &&
        pp.user._id.toString() !== req.user._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: 'Access denied' });
    }
    res.status(HTTP_STATUS.OK).json({ success: true, data: pp });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

exports.updatePrePayment = async (req, res) => {
  try {
    const pp = await payrollService.updatePrePayment(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Pre-payment updated successfully', data: pp });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

exports.deletePrePayment = async (req, res) => {
  try {
    await payrollService.deletePrePayment(req.params.id);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Pre-payment deleted successfully' });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

// ============ INCREMENT / PROMOTION ============

exports.createIncrementPromotion = async (req, res) => {
  try {
    const data = {
      ...req.body,
      company: req.user.company || null,
      createdBy: req.user._id
    };
    const ip = await payrollService.createIncrementPromotion(data);
    res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Record created successfully', data: ip });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

exports.getAllIncrementPromotions = async (req, res) => {
  try {
    const companyId = req.user.company;
    const filters = { ...req.query };

    if (req.user.role === ROLES.HR || req.user.role === ROLES.EMPLOYEE) {
      filters.userId = req.user._id;
    }

    const records = await payrollService.getAllIncrementPromotions(companyId, filters);
    res.status(HTTP_STATUS.OK).json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

exports.getIncrementPromotionById = async (req, res) => {
  try {
    const ip = await payrollService.getIncrementPromotionById(req.params.id);
    if (!ip) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Record not found' });
    }
    if ((req.user.role === ROLES.HR || req.user.role === ROLES.EMPLOYEE) &&
        ip.user._id.toString() !== req.user._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: 'Access denied' });
    }
    res.status(HTTP_STATUS.OK).json({ success: true, data: ip });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

exports.updateIncrementPromotion = async (req, res) => {
  try {
    const ip = await payrollService.updateIncrementPromotion(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Record updated successfully', data: ip });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

exports.deleteIncrementPromotion = async (req, res) => {
  try {
    await payrollService.deleteIncrementPromotion(req.params.id);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

// ============ PAYROLL ============

exports.generatePayroll = async (req, res) => {
  try {
    const data = {
      userId: req.body.userId,
      month: req.body.month,
      year: req.body.year,
      companyId: req.user.company || null,
      generatedBy: req.user._id
    };
    const payroll = await payrollService.generatePayroll(data);
    res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Payroll generated successfully', data: payroll });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

exports.getAllPayrolls = async (req, res) => {
  try {
    const companyId = req.user.company;
    const filters = { ...req.query };

    if (req.user.role === ROLES.HR || req.user.role === ROLES.EMPLOYEE) {
      filters.userId = req.user._id;
    }

    const payrolls = await payrollService.getAllPayrolls(companyId, filters);
    res.status(HTTP_STATUS.OK).json({ success: true, count: payrolls.length, data: payrolls });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

exports.getPayrollById = async (req, res) => {
  try {
    const payroll = await payrollService.getPayrollById(req.params.id);
    if (!payroll) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Payroll not found' });
    }
    if ((req.user.role === ROLES.HR || req.user.role === ROLES.EMPLOYEE) &&
        payroll.user._id.toString() !== req.user._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: 'Access denied' });
    }
    res.status(HTTP_STATUS.OK).json({ success: true, data: payroll });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

exports.getMyPayrolls = async (req, res) => {
  try {
    const payrolls = await payrollService.getPayrollsByUser(req.user._id, req.query);
    res.status(HTTP_STATUS.OK).json({ success: true, count: payrolls.length, data: payrolls });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

exports.updatePayroll = async (req, res) => {
  try {
    const payroll = await payrollService.updatePayroll(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Payroll updated successfully', data: payroll });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

exports.deletePayroll = async (req, res) => {
  try {
    await payrollService.deletePayroll(req.params.id);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Payroll deleted successfully' });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
};
