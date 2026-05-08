import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['subscribe', 'like', 'watch'],
      required: true,
    },
    targetChannelId: {
      type: String,
      required: true,
    },
    targetChannelName: {
      type: String,
    },
    targetVideoId: {
      type: String,
    },
    targetVideoTitle: {
      type: String,
    },
    targetUrl: {
      type: String,
      required: true,
    },
    reward: {
      type: Number,
      required: true,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
    },
    watchProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding daily completed tasks
taskSchema.index({ user: 1, type: 1, createdAt: 1 });

export default mongoose.model('Task', taskSchema);
