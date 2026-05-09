import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../utils/api';
import { authStorage } from '../utils/storage';

export const EarnPage = () => {
  const { user, updateUser } = useAuth();
  const balance = user?.credits ?? 1000;
  const [tasks] = useState([
    {
      id: 1,
      taskKey: 'subscribe-1',
      taskType: 'subscribe',
      type: 'Subscribe',
      channel: 'Popular Gaming Channel',
      reward: 50,
      completed: false
    },
    {
      id: 2,
      taskKey: 'like-2',
      taskType: 'like',
      type: 'Like Video',
      channel: 'Tech Reviews',
      reward: 25,
      completed: false
    },
    {
      id: 3,
      taskKey: 'watch-3',
      taskType: 'watch',
      type: 'Watch Video',
      channel: 'Educational Content',
      reward: 30,
      completed: false
    },
    {
      id: 4,
      taskKey: 'comment-4',
      taskType: 'comment',
      type: 'Comment on Video',
      channel: 'Music Channel',
      reward: 20,
      completed: false
    },
  ]);

  const [completedTasks, setCompletedTasks] = useState([]);

  useEffect(() => {
    const loadCompletedTasks = async () => {
      if (!user || !authStorage.hasAccessToken()) {
        return;
      }

      try {
        const response = await userAPI.getEarnHistory();
        setCompletedTasks(response.data.actions.map((action) => action.taskKey));
      } catch (error) {
        console.error('Failed to load earn history:', error);
      }
    };

    loadCompletedTasks();
  }, [user]);

  const handleCompleteTask = async (task) => {
    if (completedTasks.includes(task.taskKey)) {
      return;
    }

    if (!authStorage.hasAccessToken()) {
      setCompletedTasks([...completedTasks, task.taskKey]);
      updateUser({ credits: (user?.credits ?? 1000) + task.reward });
      return;
    }

    try {
      const response = await userAPI.recordEarnAction({
        taskKey: task.taskKey,
        taskType: task.taskType,
        taskName: task.type,
        channelName: task.channel,
        reward: task.reward,
      });

      setCompletedTasks((currentTasks) => [...currentTasks, task.taskKey]);
      if (response.data.user) {
        updateUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to store earn action:', error);
    }
  };

  return (
    <div className="min-h-screen bg-dark pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* HEADER */}
        <div className="bg-primary text-white rounded-lg p-8 mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">EARN CREDITS</h1>
          <p className="text-lg">Complete tasks to earn free credits for boosting your channel</p>
          <div className="mt-4 text-3xl font-bold">Your Balance: {balance} Credits</div>
        </div>

        {/* TASKS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-secondary rounded-lg p-6 border-2 border-primary hover:border-accent transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{task.type}</h3>
                  <p className="text-text-secondary">{task.channel}</p>
                </div>
                <div className="bg-primary text-white px-4 py-2 rounded font-bold">
                  +{task.reward}
                </div>
              </div>
              <button
                onClick={() => handleCompleteTask(task)}
                disabled={completedTasks.includes(task.taskKey)}
                className={`w-full py-2 rounded font-bold transition ${
                  completedTasks.includes(task.taskKey)
                    ? 'bg-success text-white'
                    : 'bg-primary text-white hover:bg-red-700'
                }`}
              >
                {completedTasks.includes(task.taskKey) ? '✓ Completed' : 'Complete Task'}
              </button>
            </div>
          ))}
        </div>

        {/* INFO SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-secondary rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-primary mb-2">{tasks.length}</h3>
            <p className="text-text-secondary">Available Tasks</p>
          </div>
          <div className="bg-secondary rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-accent mb-2">{completedTasks.length}</h3>
            <p className="text-text-secondary">Tasks Completed</p>
          </div>
          <div className="bg-secondary rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-success mb-2">
              {tasks.reduce((acc, task) => completedTasks.includes(task.taskKey) ? acc + task.reward : acc, 0)}
            </h3>
            <p className="text-text-secondary">Credits Earned</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarnPage;
