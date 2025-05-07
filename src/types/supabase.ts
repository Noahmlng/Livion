// Supabase 数据模型类型定义

// 1. 用户
export interface User {
  user_id: number;         // 主键
  password: string;       // 登录密码
  total_points: number;   // 总积分
  created_at: string;     // 创建时间
}

// 2. 目标/项目
export interface Goal {
  goal_id: number;         // 主键
  user_id: number;         // 外键，关联到 users 表
  name: string;           // 目标名称
  description?: string;    // 目标描述
  created_at: string;      // 创建时间
}

// 3. 支线任务
export interface Task {
  task_id: number;         // 主键
  user_id: number;         // 外键，关联到 users 表
  goal_id?: number;        // 外键，关联到 goals 表
  name: string;           // 任务名称
  description: string;     // 任务描述
  created_at: string;      // 创建时间
  priority: number;        // 优先级
  status: 'ongoing' | 'completed' | 'deleted';  // 任务状态
  reward_points: number;   // 奖励积分
  image_path?: string;     // 图片路径
}

// 4. 日常任务模板
export interface TaskTemplate {
  template_id: number;     // 主键
  user_id: number;         // 外键，关联到 users 表
  name: string;           // 模板名称
  description?: string;    // 模板描述
  default_points: number;  // 默认积分
  created_at: string;      // 创建时间
}

// 5. 任务安排
export interface ScheduleEntry {
  entry_id: number;        // 主键
  user_id: number;         // 外键，关联到 users 表
  date: string;           // 日期
  slot: 'morning' | 'afternoon' | 'evening';  // 时间段
  status: 'ongoing' | 'completed' | 'deleted';  // 状态
  task_type: 'normal' | 'template' | 'custom';  // 任务类型
  ref_task_id?: number;    // 关联的任务ID
  ref_template_id?: number; // 关联的模板ID
  custom_name?: string;    // 自定义任务名称
  custom_desc?: string;    // 自定义任务描述
  reward_points: number;   // 奖励积分
  created_at: string;      // 创建时间
}

// 6. 笔记
export interface Note {
  note_id: number;         // 主键
  user_id: number;         // 外键，关联到 users 表
  goal_id?: number;        // 外键，关联到 goals 表
  content: string;         // 笔记内容
  created_at: string;      // 创建时间
}

// 辅助类型定义
export type TaskStatus = 'ongoing' | 'completed' | 'deleted';
export type TimeSlot = 'morning' | 'afternoon' | 'evening';
export type TaskType = 'normal' | 'template' | 'custom'; 