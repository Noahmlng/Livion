import { motion } from 'framer-motion';
import { useValhallaTaskContext } from '../../context/ValhallaTaskContext';

const Dashboard = () => {
  // 使用上下文中的数据
  const { stats, achievements } = useValhallaTaskContext();
  
  // 当前周进度数据（实际项目中可能从后端获取或通过计算得出）
  const WEEKLY_PROGRESS = [
    { day: '周一', completed: 4, total: 6 },
    { day: '周二', completed: 7, total: 8 },
    { day: '周三', completed: 5, total: 7 },
    { day: '周四', completed: 3, total: 5 },
    { day: '周五', completed: 6, total: 8 },
    { day: '周六', completed: 2, total: 4 },
    { day: '周日', completed: 0, total: 2 },
  ];

  const STATS = [
    { id: 'completed', label: '已完成任务', value: stats.completedTasks, icon: '✓', color: 'text-accent-gold border-accent-gold' },
    { id: 'ongoing', label: '进行中任务', value: stats.ongoingTasks, icon: '⚔️', color: 'text-accent-copper border-accent-copper' },
    { id: 'level', label: '战士等级', value: stats.warriorLevel, icon: '⬆️', color: 'text-text-primary border-border-metal' },
    { id: 'achievements', label: '获得成就', value: stats.achievementsCount, icon: '🏆', color: 'text-accent-gold border-accent-gold' },
  ];

  // 获取已解锁的成就
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  
  return (
    <div className="space-y-8">
      <section>
        <h2 className="valhalla-category-title">
          <span className="mr-2">⚡</span>
          <span>战士状态</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(stat => (
            <motion.div
              key={stat.id}
              whileHover={{ y: -5 }}
              className={`valhalla-panel flex items-center gap-4 ${stat.color}`}
            >
              <div className="valhalla-icon-box text-2xl">{stat.icon}</div>
              <div>
                <div className="text-sm text-text-secondary">{stat.label}</div>
                <div className="text-2xl font-display">{stat.value}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      
      <div className="valhalla-divider"></div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="valhalla-category-title">
            <span className="mr-2">🏆</span>
            <span>最近成就</span>
          </h2>
          <div className="space-y-4">
            {unlockedAchievements.length > 0 ? (
              unlockedAchievements.slice(0, 3).map(achievement => (
                <motion.div
                  key={achievement.id}
                  whileHover={{ x: 5 }}
                  className="valhalla-task-item flex items-start gap-4"
                >
                  <div className="valhalla-icon-box text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="font-display text-accent-gold">{achievement.title}</div>
                    <div className="text-sm text-text-secondary">{achievement.description}</div>
                    <div className="text-xs text-text-secondary mt-1">{achievement.date}</div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-text-secondary p-6 text-center valhalla-panel">
                还没有解锁任何成就，继续努力！
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="valhalla-btn w-full"
            >
              查看所有成就
            </motion.button>
          </div>
        </section>
        
        <section>
          <h2 className="valhalla-category-title">
            <span className="mr-2">📊</span>
            <span>本周进度</span>
          </h2>
          <div className="valhalla-panel">
            <div className="flex items-end justify-between h-40 mb-2">
              {WEEKLY_PROGRESS.map((day, i) => {
                const percentage = day.completed / day.total;
                const height = percentage * 100;
                
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div className="relative w-8 flex flex-col items-center justify-end">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className={`w-full ${
                          day.completed === day.total ? 'bg-accent-gold' : 'bg-accent-copper'
                        }`}
                      />
                      <div className="text-xs text-text-secondary mt-1 absolute -top-6">
                        {day.completed}/{day.total}
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary mt-1">{day.day}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard; 