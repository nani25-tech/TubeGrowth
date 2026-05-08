import mongoose from 'mongoose';

const earnActionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskKey: {
      type: String,
      required: true,
      index: true,
    },
    taskType: {
      type: String,
      required: true,
      enum: ['subscribe', 'like', 'watch', 'comment'],
    },
    taskName: {
      type: String,
      required: true,
    },
    channelName: {
      type: String,
      required: true,
    },
    reward: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

earnActionSchema.index({ user: 1, taskKey: 1 }, { unique: true });

export default mongoose.model('EarnAction', earnActionSchema);