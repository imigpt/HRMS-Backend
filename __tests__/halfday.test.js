const leaveService = require('../services/leave.service');

// ─── Mock Mongoose models ─────────────────────────────────────────────────────
jest.mock('../models/Leave.model', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/LeaveBalance.model', () => ({
  findOne: jest.fn()
}));

const Leave = require('../models/Leave.model');
const LeaveBalance = require('../models/LeaveBalance.model');

// Helper: build a .lean() chainable mock
const leanMock = (value) => ({ lean: jest.fn().mockResolvedValue(value) });

// Use a far-future weekday (Monday) so date validation always passes
const FUTURE_DATE = '2099-12-01'; // Monday

describe('Half-day leave service — createHalfDayLeaveRequest', () => {
  beforeEach(() => jest.resetAllMocks());

  // ── SUCCESS CASES ────────────────────────────────────────────────────────────

  test('creates half-day (paid) when no conflict and sufficient balance', async () => {
    Leave.findOne.mockResolvedValue(null);                            // no conflict
    LeaveBalance.findOne.mockReturnValue(leanMock({ paid: 2, usedPaid: 0 }));
    Leave.create.mockResolvedValue({
      _id: 'leave123', user: 'user1', isHalfDay: true, session: 'morning', days: 0.5
    });

    const result = await leaveService.createHalfDayLeaveRequest('user1', 'company1', {
      leaveType: 'paid', date: FUTURE_DATE, session: 'morning', reason: 'Doctor'
    });

    expect(Leave.findOne).toHaveBeenCalledTimes(1);
    expect(LeaveBalance.findOne).toHaveBeenCalledWith({ user: 'user1' });
    expect(Leave.create).toHaveBeenCalledWith(
      expect.objectContaining({ isHalfDay: true, session: 'morning', days: 0.5 })
    );
    expect(result).toHaveProperty('_id', 'leave123');
  });

  test('creates half-day (unpaid) without needing a balance record', async () => {
    // Unpaid leave is unlimited — LeaveBalance.findOne should NOT be called
    Leave.findOne.mockResolvedValue(null);
    Leave.create.mockResolvedValue({
      _id: 'leave456', user: 'user2', isHalfDay: true, session: 'afternoon', days: 0.5
    });

    const result = await leaveService.createHalfDayLeaveRequest('user2', 'company1', {
      leaveType: 'unpaid', date: FUTURE_DATE, session: 'afternoon', reason: 'Personal'
    });

    expect(LeaveBalance.findOne).not.toHaveBeenCalled();   // Bug 2 fix verified
    expect(result).toHaveProperty('_id', 'leave456');
  });

  test('creates half-day (sick) with exact 0.5 remaining balance', async () => {
    Leave.findOne.mockResolvedValue(null);
    LeaveBalance.findOne.mockReturnValue(leanMock({ sick: 1, usedSick: 0.5 }));
    Leave.create.mockResolvedValue({ _id: 'leave789', days: 0.5 });

    const result = await leaveService.createHalfDayLeaveRequest('user1', 'company1', {
      leaveType: 'sick', date: FUTURE_DATE, session: 'morning', reason: 'Sick'
    });

    expect(result).toHaveProperty('_id', 'leave789');
  });

  // ── CONFLICT CASES ───────────────────────────────────────────────────────────

  test('throws when a full-day leave already exists on that date', async () => {
    Leave.findOne.mockResolvedValue({ isHalfDay: false, startDate: new Date(FUTURE_DATE) });

    await expect(
      leaveService.createHalfDayLeaveRequest('user1', 'company1', {
        leaveType: 'paid', date: FUTURE_DATE, session: 'morning', reason: 'Test'
      })
    ).rejects.toThrow('A full-day leave already exists on this date');
  });

  test('throws when a half-day leave already exists for same date + session', async () => {
    Leave.findOne.mockResolvedValue({ isHalfDay: true, session: 'morning' });

    await expect(
      leaveService.createHalfDayLeaveRequest('user1', 'company1', {
        leaveType: 'paid', date: FUTURE_DATE, session: 'morning', reason: 'Test'
      })
    ).rejects.toThrow('A half-day leave already exists for this date and session');
  });

  // ── BALANCE CASES ────────────────────────────────────────────────────────────

  test('throws when no LeaveBalance record exists for paid leave', async () => {
    Leave.findOne.mockResolvedValue(null);
    LeaveBalance.findOne.mockReturnValue(leanMock(null));              // no record

    await expect(
      leaveService.createHalfDayLeaveRequest('user1', 'company1', {
        leaveType: 'paid', date: FUTURE_DATE, session: 'morning', reason: 'Test'
      })
    ).rejects.toThrow(/Insufficient paid leave balance.*Contact your admin/);
  });

  test('throws when insufficient paid balance (0.4 remaining)', async () => {
    Leave.findOne.mockResolvedValue(null);
    LeaveBalance.findOne.mockReturnValue(leanMock({ paid: 1, usedPaid: 0.6 }));  // 0.4 left

    await expect(
      leaveService.createHalfDayLeaveRequest('user1', 'company1', {
        leaveType: 'paid', date: FUTURE_DATE, session: 'morning', reason: 'Test'
      })
    ).rejects.toThrow(/Insufficient paid leave balance/);
  });
});
