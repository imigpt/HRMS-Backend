/**
 * PAYROLL SERVICE - Business logic for payroll management
 */

const EmployeeSalary = require('../models/EmployeeSalary.model');
const PrePayment = require('../models/PrePayment.model');
const IncrementPromotion = require('../models/IncrementPromotion.model');
const Payroll = require('../models/Payroll.model');

// ============ EMPLOYEE SALARY ============

exports.createSalary = async (data) => {
  // Check if active salary already exists for user
  const existing = await EmployeeSalary.findOne({ user: data.user, status: 'active' });
  if (existing) {
    throw new Error('Active salary record already exists for this employee. Deactivate it first.');
  }
  const salary = await EmployeeSalary.create(data);
  return salary.populate('user', 'name email employeeId department position');
};

exports.getAllSalaries = async (companyId, filters = {}) => {
  const query = {};
  if (companyId) query.company = companyId;
  if (filters.status && filters.status !== 'all') query.status = filters.status;
  if (filters.userId) query.user = filters.userId;

  return EmployeeSalary.find(query)
    .populate('user', 'name email employeeId department position profilePhoto')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
};

exports.getSalaryById = async (id) => {
  return EmployeeSalary.findById(id)
    .populate('user', 'name email employeeId department position profilePhoto')
    .populate('createdBy', 'name');
};

exports.getSalaryByUser = async (userId) => {
  return EmployeeSalary.findOne({ user: userId, status: 'active' })
    .populate('user', 'name email employeeId department position profilePhoto');
};

exports.updateSalary = async (id, data) => {
  const salary = await EmployeeSalary.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!salary) throw new Error('Salary record not found');
  return salary.populate('user', 'name email employeeId department position');
};

exports.deleteSalary = async (id) => {
  const salary = await EmployeeSalary.findByIdAndDelete(id);
  if (!salary) throw new Error('Salary record not found');
  return salary;
};

// ============ PRE-PAYMENTS ============

exports.createPrePayment = async (data) => {
  return (await PrePayment.create(data)).populate('user', 'name email employeeId position department');
};

exports.getAllPrePayments = async (companyId, filters = {}) => {
  const query = {};
  if (companyId) query.company = companyId;
  if (filters.userId) query.user = filters.userId;
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  return PrePayment.find(query)
    .populate('user', 'name email employeeId position department profilePhoto')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
};

exports.getPrePaymentById = async (id) => {
  return PrePayment.findById(id)
    .populate('user', 'name email employeeId position department profilePhoto')
    .populate('createdBy', 'name');
};

exports.getPrePaymentsByUser = async (userId) => {
  return PrePayment.find({ user: userId })
    .populate('user', 'name email employeeId position department')
    .sort({ createdAt: -1 });
};

exports.updatePrePayment = async (id, data) => {
  const pp = await PrePayment.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!pp) throw new Error('Pre-payment not found');
  return pp.populate('user', 'name email employeeId position department');
};

exports.deletePrePayment = async (id) => {
  const pp = await PrePayment.findByIdAndDelete(id);
  if (!pp) throw new Error('Pre-payment not found');
  return pp;
};

// ============ INCREMENT / PROMOTION ============

exports.createIncrementPromotion = async (data) => {
  return (await IncrementPromotion.create(data)).populate('user', 'name email employeeId position department');
};

exports.getAllIncrementPromotions = async (companyId, filters = {}) => {
  const query = {};
  if (companyId) query.company = companyId;
  if (filters.type && filters.type !== 'all') query.type = filters.type;
  if (filters.userId) query.user = filters.userId;

  return IncrementPromotion.find(query)
    .populate('user', 'name email employeeId position department profilePhoto')
    .populate('createdBy', 'name')
    .sort({ effectiveDate: -1 });
};

exports.getIncrementPromotionById = async (id) => {
  return IncrementPromotion.findById(id)
    .populate('user', 'name email employeeId position department profilePhoto')
    .populate('createdBy', 'name');
};

exports.getIncrementPromotionsByUser = async (userId) => {
  return IncrementPromotion.find({ user: userId })
    .populate('user', 'name email employeeId position department')
    .sort({ effectiveDate: -1 });
};

exports.updateIncrementPromotion = async (id, data) => {
  const ip = await IncrementPromotion.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!ip) throw new Error('Increment/Promotion record not found');
  return ip.populate('user', 'name email employeeId position department');
};

exports.deleteIncrementPromotion = async (id) => {
  const ip = await IncrementPromotion.findByIdAndDelete(id);
  if (!ip) throw new Error('Increment/Promotion record not found');
  return ip;
};

// ============ PAYROLL ============

exports.generatePayroll = async (data) => {
  // Look up salary structure
  const salary = await EmployeeSalary.findOne({ user: data.userId, status: 'active' });
  if (!salary) {
    throw new Error('Salary not configured for this employee. Please setup basic salary first.');
  }

  // Check if payroll already exists for this month/year
  const existing = await Payroll.findOne({ user: data.userId, month: data.month, year: data.year });
  if (existing) {
    throw new Error(`Payroll already generated for ${data.month}/${data.year}`);
  }

  // Calculate allowances
  const allowances = salary.allowances.map(a => ({
    name: a.name,
    amount: a.type === 'percentage' ? Math.round(salary.basicSalary * a.amount / 100) : a.amount
  }));
  const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);

  // Calculate deductions
  const deductions = salary.deductions.map(d => ({
    name: d.name,
    amount: d.type === 'percentage' ? Math.round(salary.basicSalary * d.amount / 100) : d.amount
  }));
  let totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

  // Check pre-payments for this month
  const monthStr = `${data.year}-${String(data.month).padStart(2, '0')}`;
  const prePayments = await PrePayment.find({
    user: data.userId,
    deductMonth: monthStr,
    status: 'pending'
  });
  const prePaymentDeductions = prePayments.reduce((sum, pp) => sum + pp.amount, 0);
  totalDeductions += prePaymentDeductions;

  const grossSalary = salary.basicSalary + totalAllowances;
  const netSalary = grossSalary - totalDeductions;

  const payroll = await Payroll.create({
    user: data.userId,
    company: data.companyId || null,
    month: data.month,
    year: data.year,
    basicSalary: salary.basicSalary,
    allowances,
    deductions,
    prePaymentDeductions,
    grossSalary,
    totalDeductions,
    netSalary,
    status: 'generated',
    generatedBy: data.generatedBy
  });

  // Mark pre-payments as deducted
  if (prePayments.length > 0) {
    await PrePayment.updateMany(
      { _id: { $in: prePayments.map(pp => pp._id) } },
      { status: 'deducted' }
    );
  }

  return payroll.populate('user', 'name email employeeId department position profilePhoto');
};

exports.getAllPayrolls = async (companyId, filters = {}) => {
  const query = {};
  if (companyId) query.company = companyId;
  if (filters.userId) query.user = filters.userId;
  if (filters.month) query.month = parseInt(filters.month);
  if (filters.year) query.year = parseInt(filters.year);
  if (filters.status && filters.status !== 'all') query.status = filters.status;

  return Payroll.find(query)
    .populate('user', 'name email employeeId department position profilePhoto')
    .populate('generatedBy', 'name')
    .sort({ year: -1, month: -1, createdAt: -1 });
};

exports.getPayrollById = async (id) => {
  return Payroll.findById(id)
    .populate('user', 'name email employeeId department position profilePhoto')
    .populate('generatedBy', 'name');
};

exports.getPayrollsByUser = async (userId, filters = {}) => {
  const query = { user: userId };
  if (filters.year) query.year = parseInt(filters.year);
  if (filters.month) query.month = parseInt(filters.month);

  return Payroll.find(query)
    .populate('user', 'name email employeeId department position')
    .sort({ year: -1, month: -1 });
};

exports.updatePayroll = async (id, data) => {
  const payroll = await Payroll.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!payroll) throw new Error('Payroll record not found');
  return payroll.populate('user', 'name email employeeId department position');
};

exports.deletePayroll = async (id) => {
  const payroll = await Payroll.findByIdAndDelete(id);
  if (!payroll) throw new Error('Payroll record not found');
  return payroll;
};
