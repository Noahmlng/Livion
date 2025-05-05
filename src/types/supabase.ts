// Supabase 数据模型类型定义

// 1. 用户
export interface User {
  user_id: number;         // 主键
  login_key: string;       // 登录密钥，格式 "XXXX-X"
  total_points: number;    // 累计积分
  created_at: string;      // 创建时间
}

// 2. 目标/项目
export interface Goal {
  goal_id: number;         // 主键
  user_id: number;         // 外键：所属用户ID
  name: string;            // 目标名称
  description?: string;    // 目标描述（可选）
  created_at: string;      // 创建时间
}

// 3. 支线任务
export interface Task {
  task_id: number;         // 主键
  user_id: number;         // 外键：所属用户ID
  goal_id?: number;        // 外键：关联的目标ID（可为空）
  name: string;            // 任务名称
  description: string;     // 任务描述
  created_at: string;      // 创建时间
  priority: number;        // 优先级数值，默认0
  status: 'ongoing' | 'completed' | 'deleted';  // 任务状态
  reward_points: number;   // 完成奖励积分
  image_path?: string;     // 任务配图存储路径（可选）
}

// 4. 日常任务模板
export interface TaskTemplate {
  template_id: number;     // 主键
  user_id: number;         // 外键：所属用户ID
  name: string;            // 模板任务名称
  description?: string;    // 任务描述（可选）
  default_points?: number; // 完成奖励默认积分（可选）
  created_at: string;      // 创建时间
}

// 5. 任务安排
export interface ScheduleEntry {
  entry_id: number;        // 主键
  user_id: number;         // 外键：所属用户ID
  date: string;            // 安排日期
  slot: 'morning' | 'afternoon' | 'evening';  // 时段枚举
  status: 'ongoing' | 'completed' | 'deleted';  // 状态枚举
  task_type: 'normal' | 'template' | 'custom';  // 来源类型枚举
  ref_task_id?: number;    // 当task_type='normal'时指向Task.task_id
  ref_template_id?: number; // 当task_type='template'时指向TaskTemplate.template_id
  custom_name?: string;    // 当task_type='custom'时，临时任务名称
  custom_desc?: string;    // 临时任务描述（可选）
  reward_points: number;   // 完成奖励积分
  created_at: string;      // 创建时间
}

// 6. 笔记
export interface Note {
  note_id: number;         // 主键
  user_id: number;         // 外键：所属用户ID
  goal_id?: number;        // 外键：关联的目标ID（可选）
  content: string;         // 笔记内容
  created_at: string;      // 创建时间
}

// 辅助类型定义
export type TaskStatus = 'ongoing' | 'completed' | 'deleted';
export type TimeSlot = 'morning' | 'afternoon' | 'evening';
export type TaskType = 'normal' | 'template' | 'custom'; 