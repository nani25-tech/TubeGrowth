import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Campaign from '../src/models/Campaign.js';
import EarnAction from '../src/models/EarnAction.js';
import PaymentTransaction from '../src/models/PaymentTransaction.js';
import Referral from '../src/models/Referral.js';
import Task from '../src/models/Task.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tubegrowth';
const DRY_RUN = process.argv.includes('--dry-run');

const isPlaceholderEmail = (email = '') => String(email).endsWith('@channel.tubegrowth');

const normalizeChannelId = (value = '') => String(value).trim().toLowerCase();

const uniqueStrings = (values) => Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim())));

const chooseKeeper = (users) => {
  const scored = [...users].sort((a, b) => {
    const aHasRealEmail = a.email && !isPlaceholderEmail(a.email);
    const bHasRealEmail = b.email && !isPlaceholderEmail(b.email);
    if (aHasRealEmail !== bHasRealEmail) {
      return aHasRealEmail ? -1 : 1;
    }

    const aLogin = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
    const bLogin = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
    if (aLogin !== bLogin) {
      return bLogin - aLogin;
    }

    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (aCreated !== bCreated) {
      return aCreated - bCreated;
    }

    return String(a._id).localeCompare(String(b._id));
  });

  return scored[0];
};

const mergeUsers = async (channelId, users) => {
  const keeper = chooseKeeper(users);
  const duplicates = users.filter((user) => String(user._id) !== String(keeper._id));
  const duplicateIds = duplicates.map((user) => user._id);

  if (!duplicateIds.length) {
    return {
      channelId,
      keeperId: String(keeper._id),
      duplicateCount: 0,
      rewired: {},
      droppedEarnActions: 0,
      deletedUsers: 0,
    };
  }

  const rewired = {
    campaigns: 0,
    payments: 0,
    tasks: 0,
    referralsAsReferrer: 0,
    referralsAsReferred: 0,
  };

  // Aggregate user-level scalar/list fields onto the keeper.
  const mergedCredits = [keeper, ...duplicates].reduce((sum, user) => sum + (Number(user.credits) || 0), 0);
  const mergedSubscribers = [keeper, ...duplicates].reduce((sum, user) => sum + (Number(user.subscribers) || 0), 0);
  const mergedWatchHours = [keeper, ...duplicates].reduce((sum, user) => sum + (Number(user.watchTimeHours) || 0), 0);
  const mergedReferralEarnings = [keeper, ...duplicates].reduce((sum, user) => sum + (Number(user.referralEarnings) || 0), 0);

  const mergedSubscribedChannels = uniqueStrings([
    ...(keeper.subscribedChannels || []),
    ...duplicates.flatMap((user) => user.subscribedChannels || []),
  ]);

  const mergedCompletedTasks = Array.from(new Set([
    ...(keeper.completedTasks || []).map((id) => String(id)),
    ...duplicates.flatMap((user) => (user.completedTasks || []).map((id) => String(id))),
  ])).map((id) => new mongoose.Types.ObjectId(id));

  const mergedName =
    [keeper, ...duplicates]
      .map((user) => String(user.youtubeChannelTitle || user.name || '').trim())
      .find(Boolean) || keeper.name;

  const mergedTitle =
    [keeper, ...duplicates]
      .map((user) => String(user.youtubeChannelTitle || '').trim())
      .find(Boolean) || keeper.youtubeChannelTitle;

  if (!DRY_RUN) {
    keeper.credits = mergedCredits;
    keeper.subscribers = mergedSubscribers;
    keeper.watchTimeHours = mergedWatchHours;
    keeper.referralEarnings = mergedReferralEarnings;
    keeper.subscribedChannels = mergedSubscribedChannels;
    keeper.completedTasks = mergedCompletedTasks;
    keeper.name = mergedName || keeper.name;
    keeper.youtubeChannelTitle = mergedTitle || keeper.youtubeChannelTitle;

    await keeper.save();
  }

  if (!DRY_RUN) {
    const [campaignRes, paymentRes, taskRes, referralReferrerRes, referralReferredRes] = await Promise.all([
      Campaign.updateMany({ user: { $in: duplicateIds } }, { $set: { user: keeper._id } }),
      PaymentTransaction.updateMany({ user: { $in: duplicateIds } }, { $set: { user: keeper._id } }),
      Task.updateMany({ user: { $in: duplicateIds } }, { $set: { user: keeper._id } }),
      Referral.updateMany({ referrer: { $in: duplicateIds } }, { $set: { referrer: keeper._id } }),
      Referral.updateMany({ referred: { $in: duplicateIds } }, { $set: { referred: keeper._id } }),
    ]);

    rewired.campaigns = campaignRes.modifiedCount || 0;
    rewired.payments = paymentRes.modifiedCount || 0;
    rewired.tasks = taskRes.modifiedCount || 0;
    rewired.referralsAsReferrer = referralReferrerRes.modifiedCount || 0;
    rewired.referralsAsReferred = referralReferredRes.modifiedCount || 0;
  } else {
    const [campaignCount, paymentCount, taskCount, referralReferrerCount, referralReferredCount] = await Promise.all([
      Campaign.countDocuments({ user: { $in: duplicateIds } }),
      PaymentTransaction.countDocuments({ user: { $in: duplicateIds } }),
      Task.countDocuments({ user: { $in: duplicateIds } }),
      Referral.countDocuments({ referrer: { $in: duplicateIds } }),
      Referral.countDocuments({ referred: { $in: duplicateIds } }),
    ]);

    rewired.campaigns = campaignCount;
    rewired.payments = paymentCount;
    rewired.tasks = taskCount;
    rewired.referralsAsReferrer = referralReferrerCount;
    rewired.referralsAsReferred = referralReferredCount;
  }

  let droppedEarnActions = 0;

  for (const duplicateId of duplicateIds) {
    const actions = await EarnAction.find({ user: duplicateId }).lean();

    for (const action of actions) {
      if (DRY_RUN) {
        const exists = await EarnAction.exists({ user: keeper._id, taskKey: action.taskKey });
        if (exists) {
          droppedEarnActions += 1;
        }
        continue;
      }

      try {
        await EarnAction.updateOne({ _id: action._id }, { $set: { user: keeper._id } });
      } catch (error) {
        if (error && error.code === 11000) {
          await EarnAction.deleteOne({ _id: action._id });
          droppedEarnActions += 1;
          continue;
        }
        throw error;
      }
    }
  }

  let deletedUsers = 0;
  if (!DRY_RUN) {
    const deleteResult = await User.deleteMany({ _id: { $in: duplicateIds } });
    deletedUsers = deleteResult.deletedCount || 0;
  } else {
    deletedUsers = duplicateIds.length;
  }

  return {
    channelId,
    keeperId: String(keeper._id),
    duplicateCount: duplicateIds.length,
    rewired,
    droppedEarnActions,
    deletedUsers,
  };
};

const main = async () => {
  await connectDB(MONGODB_URI);

  const users = await User.find({
    youtubeChannelId: { $exists: true, $ne: '' },
    isAdmin: false,
  })
    .select('_id name email credits subscribers watchTimeHours referralEarnings subscribedChannels completedTasks youtubeChannelId youtubeChannelTitle lastLogin createdAt')
    .lean();

  const groups = new Map();
  for (const user of users) {
    const key = normalizeChannelId(user.youtubeChannelId);
    if (!key) {
      continue;
    }
    const existing = groups.get(key) || [];
    existing.push(user);
    groups.set(key, existing);
  }

  const duplicateGroups = Array.from(groups.entries())
    .filter(([, groupUsers]) => groupUsers.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  if (!duplicateGroups.length) {
    console.log('No duplicate user groups found by channel ID.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`Found ${duplicateGroups.length} duplicate channel group(s).`);
  console.log(DRY_RUN ? 'Running in DRY RUN mode. No data will be changed.' : 'Running in APPLY mode. Data will be updated.');

  const results = [];
  for (const [channelId, groupUsers] of duplicateGroups) {
    const result = await mergeUsers(channelId, groupUsers);
    results.push(result);
    console.log(
      `Merged ${channelId}: duplicates=${result.duplicateCount}, deleted=${result.deletedUsers}, droppedEarnActions=${result.droppedEarnActions}`
    );
  }

  const summary = results.reduce(
    (acc, result) => {
      acc.groups += 1;
      acc.duplicates += result.duplicateCount;
      acc.deletedUsers += result.deletedUsers;
      acc.droppedEarnActions += result.droppedEarnActions;
      acc.rewiredCampaigns += result.rewired.campaigns;
      acc.rewiredPayments += result.rewired.payments;
      acc.rewiredTasks += result.rewired.tasks;
      acc.rewiredReferralsAsReferrer += result.rewired.referralsAsReferrer;
      acc.rewiredReferralsAsReferred += result.rewired.referralsAsReferred;
      return acc;
    },
    {
      groups: 0,
      duplicates: 0,
      deletedUsers: 0,
      droppedEarnActions: 0,
      rewiredCampaigns: 0,
      rewiredPayments: 0,
      rewiredTasks: 0,
      rewiredReferralsAsReferrer: 0,
      rewiredReferralsAsReferred: 0,
    }
  );

  console.log('\nSummary:');
  console.log(JSON.stringify(summary, null, 2));

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('mergeDuplicateUsersByChannelId failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
