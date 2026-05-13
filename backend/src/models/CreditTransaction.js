import mongoose from 'mongoose';

const creditTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['earn', 'spend', 'purchase', 'refund', 'referral_reward', 'admin_adjust'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    source: {
      // What triggered this transaction
      type: String,
      enum: ['task_earn', 'task_verify', 'campaign_spend', 'campaign_refund', 'payment_purchase', 'referral', 'admin'],
      required: true,
    },
    relatedId: {
      // Reference to related record (EarnAction, Campaign, PaymentTransaction, Referral, etc.)
      type: mongoose.Schema.Types.ObjectId,
    },
    relatedType: {
      // Type of related record
      type: String,
      enum: ['EarnAction', 'Campaign', 'PaymentTransaction', 'Referral', 'None'],
      default: 'None',
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed', 'reversed'],
      default: 'completed',
    },
    metadata: {
      // Additional context
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    indexes: [
      { user: 1, createdAt: -1 },
      { type: 1, status: 1 },
      { source: 1 },
      { 'metadata.campaignId': 1 },
    ],
  }
);

export default mongoose.model('CreditTransaction', creditTransactionSchema);
