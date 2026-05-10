import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      default: 'razorpay',
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentId: {
      type: String,
      default: '',
      index: true,
    },
    // Stored raw amount value (in major currency units). Use `currency` to interpret.
    amountValue: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      index: true,
    },
    // Deprecated/legacy field retained for compatibility with older records.
    amountINR: {
      type: Number,
      required: false,
      default: 0,
    },
    creditsToAdd: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed'],
      default: 'created',
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('PaymentTransaction', paymentTransactionSchema);
