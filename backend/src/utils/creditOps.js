import User from '../models/User.js';
import CreditTransaction from '../models/CreditTransaction.js';
import mongoose from 'mongoose';

/**
 * Strict validation to ensure credits are exact (integer only)
 * No floating point, no rounding errors
 */
const validateCreditAmount = (amount, operationName) => {
  // Must be a number
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error(`${operationName}: Amount must be a number, got ${typeof amount}`);
  }

  // Must be an integer (no decimals/floating point)
  if (!Number.isInteger(amount)) {
    throw new Error(`${operationName}: Amount must be an integer, got ${amount} (decimals not allowed)`);
  }

  // Must be positive for add/refund, or positive magnitude for deduct
  if (amount <= 0) {
    throw new Error(`${operationName}: Amount must be positive, got ${amount}`);
  }

  // Safe integer range (JavaScript safe integer limit)
  if (!Number.isSafeInteger(amount)) {
    throw new Error(`${operationName}: Amount exceeds safe integer range: ${amount}`);
  }

  return amount;
};

/**
 * Verify exact deduction: before - amount = after
 * Throws if math doesn't add up
 */
const verifyDeduction = (balanceBefore, amount, balanceAfter) => {
  const expectedAfter = balanceBefore - amount;
  if (balanceAfter !== expectedAfter) {
    throw new Error(
      `Credit deduction mismatch: ${balanceBefore} - ${amount} should equal ${expectedAfter}, ` +
      `but got ${balanceAfter}. Deduction is incorrect!`
    );
  }
};

/**
 * Verify exact addition: before + amount = after
 * Throws if math doesn't add up
 */
const verifyAddition = (balanceBefore, amount, balanceAfter) => {
  const expectedAfter = balanceBefore + amount;
  if (balanceAfter !== expectedAfter) {
    throw new Error(
      `Credit addition mismatch: ${balanceBefore} + ${amount} should equal ${expectedAfter}, ` +
      `but got ${balanceAfter}. Addition is incorrect!`
    );
  }
};

/**
 * Core credit management utility with atomicity and audit trail
 */

export const creditOps = {
  /**
   * Add credits with automatic transaction logging
   * @param {String} userId - User ID
   * @param {Number} amount - Credits to add (must be positive INTEGER)
   * @param {String} source - Source of credit (task_earn, payment_purchase, etc.)
   * @param {String} relatedType - Type of related record
   * @param {String} relatedId - ID of related record
   * @param {String} description - Human-readable description
   * @param {Object} session - Mongoose session for transaction
   * @returns {Object} {user, transaction, success}
   */
  async addCredits(userId, amount, source, relatedType = 'None', relatedId = null, description = '', session = null) {
    // Strict validation: must be integer, no decimals
    const validatedAmount = validateCreditAmount(amount, 'addCredits');

    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    const balanceBefore = user.credits;
    user.credits += validatedAmount;
    const balanceAfter = user.credits;

    // Verify exact math before saving
    verifyAddition(balanceBefore, validatedAmount, balanceAfter);

    await user.save({ session });

    const transaction = await CreditTransaction.create(
      [
        {
          user: userId,
          type: 'earn',
          amount: validatedAmount,
          balanceBefore,
          balanceAfter,
          source,
          relatedType,
          relatedId,
          description: description || `Added ${validatedAmount} credits`,
          status: 'completed',
        },
      ],
      { session }
    );

    return {
      user,
      transaction: transaction[0],
      success: true,
    };
  },

  /**
   * Deduct credits with validation and strict amount checking
   * @param {String} userId - User ID
   * @param {Number} amount - Credits to deduct (must be positive INTEGER)
   * @param {String} source - Source of spend
   * @param {String} relatedType - Type of related record
   * @param {String} relatedId - ID of related record
   * @param {String} description - Human-readable description
   * @param {Object} session - Mongoose session for transaction
   * @returns {Object} {user, transaction, success}
   */
  async deductCredits(userId, amount, source, relatedType = 'None', relatedId = null, description = '', session = null) {
    // Strict validation: must be integer, no decimals
    const validatedAmount = validateCreditAmount(amount, 'deductCredits');

    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify sufficient balance
    if (user.credits < validatedAmount) {
      throw new Error(
        `Insufficient credits: ` +
        `have ${user.credits}, need ${validatedAmount}. ` +
        `Cannot deduct.`
      );
    }

    const balanceBefore = user.credits;
    user.credits -= validatedAmount;
    const balanceAfter = user.credits;

    // Verify exact math before saving
    verifyDeduction(balanceBefore, validatedAmount, balanceAfter);

    await user.save({ session });

    const transaction = await CreditTransaction.create(
      [
        {
          user: userId,
          type: 'spend',
          amount: validatedAmount,
          balanceBefore,
          balanceAfter,
          source,
          relatedType,
          relatedId,
          description: description || `Deducted ${validatedAmount} credits`,
          status: 'completed',
        },
      ],
      { session }
    );

    return {
      user,
      transaction: transaction[0],
      success: true,
    };
  },

  /**
   * Refund credits (typically for campaign cancellation)
   * @param {String} userId - User ID
   * @param {Number} amount - Credits to refund (must be positive INTEGER)
   * @param {String} originalSource - Original source of the spend
   * @param {String} relatedId - ID of original transaction
   * @param {String} reason - Reason for refund
   * @param {Object} session - Mongoose session
   * @returns {Object} {user, transaction, success}
   */
  async refundCredits(userId, amount, originalSource, relatedId, reason = '', session = null) {
    // Strict validation: must be integer, no decimals
    const validatedAmount = validateCreditAmount(amount, 'refundCredits');

    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    const balanceBefore = user.credits;
    user.credits += validatedAmount;
    const balanceAfter = user.credits;

    // Verify exact math before saving
    verifyAddition(balanceBefore, validatedAmount, balanceAfter);

    await user.save({ session });

    const transaction = await CreditTransaction.create(
      [
        {
          user: userId,
          type: 'refund',
          amount: validatedAmount,
          balanceBefore,
          balanceAfter,
          source: originalSource,
          relatedType: originalSource === 'campaign_spend' ? 'Campaign' : 'None',
          relatedId,
          description: reason || `Refunded ${validatedAmount} credits for cancelled operation`,
          status: 'completed',
        },
      ],
      { session }
    );

    return {
      user,
      transaction: transaction[0],
      success: true,
    };
  },

  /**
   * Get transaction history
   * @param {String} userId - User ID
   * @param {Object} filters - Filter options {type, source, status, limit, skip}
   * @returns {Array} Transactions
   */
  async getTransactionHistory(userId, filters = {}) {
    const { type, source, status, limit = 50, skip = 0 } = filters;

    const query = { user: userId };
    if (type) query.type = type;
    if (source) query.source = source;
    if (status) query.status = status;

    return await CreditTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  },

  /**
   * Get credit balance with transaction count
   * @param {String} userId - User ID
   * @returns {Object} {balance, totalEarned, totalSpent, transactionCount}
   */
  async getBalance(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const transactions = await CreditTransaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalEarned: {
            $sum: {
              $cond: [{ $eq: ['$type', 'earn'] }, '$amount', 0],
            },
          },
          totalSpent: {
            $sum: {
              $cond: [{ $eq: ['$type', 'spend'] }, '$amount', 0],
            },
          },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const stats = transactions[0] || { totalEarned: 0, totalSpent: 0, transactionCount: 0 };

    return {
      balance: user.credits,
      totalEarned: stats.totalEarned,
      totalSpent: stats.totalSpent,
      transactionCount: stats.transactionCount,
    };
  },
};

export default creditOps;
