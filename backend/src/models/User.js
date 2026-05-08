import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
    },
    credits: {
      type: Number,
      default: 0,
      min: 0,
    },
    subscribers: {
      type: Number,
      default: 0,
      min: 0,
    },
    watchTimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    youtubeChannelId: {
      type: String,
      default: '',
    },
    youtubeChannelTitle: {
      type: String,
      default: '',
    },
    youtubeAccessToken: {
      type: String,
      select: false,
    },
    youtubeRefreshToken: {
      type: String,
      select: false,
    },
    youtubeTokenExpiry: {
      type: Date,
      select: false,
    },
    youtubeConnectedAt: {
      type: Date,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    subscribedChannels: [
      {
        type: String,
      },
    ],
    completedTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referralEarnings: {
      type: Number,
      default: 0,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// Generate referral code
userSchema.methods.generateReferralCode = function () {
  const code = 'TB' + this._id.toString().slice(-8).toUpperCase();
  this.referralCode = code;
  return code;
};

export default mongoose.model('User', userSchema);
