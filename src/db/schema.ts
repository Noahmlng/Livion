import { pgTable, text, integer, bigint, real, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// User table - updated for points system
export const users = pgTable('users', {
  user_id: bigint('user_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  password: text('password').notNull().unique(),
  total_points: real('total_points').notNull().default(0),
  daily_pay: real('daily_pay').notNull().default(1000),
  user_goals: jsonb('user_goals').default(sql`'[]'::jsonb`),
  user_competencies_to_develop: jsonb('user_competencies_to_develop').default(sql`'[]'::jsonb`),
  points_settings: jsonb('points_settings').default(sql`'{}'::jsonb`),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`(now() AT TIME ZONE 'Asia/Taipei')`),
});

// User goals table - for detailed goal management
export const userGoals = pgTable('user_goals', {
  goal_id: bigint('goal_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.user_id, { onDelete: 'cascade' }),
  goal_text: text('goal_text').notNull(),
  priority: integer('priority').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`(now() AT TIME ZONE 'Asia/Taipei')`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`(now() AT TIME ZONE 'Asia/Taipei')`),
});

// Challenge table - updated for points system (formerly tasks)
export const challenge = pgTable('challenge', {
  task_id: bigint('task_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.user_id, { onDelete: 'cascade' }),
  goal_id: bigint('goal_id', { mode: 'number' }).references(() => userGoals.goal_id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`(now() AT TIME ZONE 'Asia/Taipei')`),
  priority: integer('priority').notNull().default(0),
  status: text('status').notNull().default('ongoing'),
  reward_points: real('reward_points').notNull().default(0),
  image_path: text('image_path'),
  // Points system fields
  task_record: text('task_record').default(''),
  estimated_time: real('estimated_time').default(0),
  reward_multiplier: real('reward_multiplier').default(1.0),
  learning_reward: real('learning_reward').default(0),
  points_calculated_at: timestamp('points_calculated_at', { withTimezone: true }),
  ai_evaluation: jsonb('ai_evaluation').default(sql`'{}'::jsonb`),
});

// Behaviour table - updated for Supabase (formerly task_templates)
export const behaviour = pgTable('behaviour', {
  template_id: bigint('template_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: text('name').notNull(),
  description: text('description'),
  reward_points: real('reward_points').default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`(now() AT TIME ZONE 'Asia/Taipei')`),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.user_id, { onUpdate: 'cascade' }),
});

// Task table - updated for points system (formerly schedule_entries)
export const task = pgTable('task', {
  entry_id: bigint('entry_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.user_id, { onDelete: 'cascade' }),
  date: timestamp('date', { mode: 'date' }).notNull(),
  slot: text('slot').notNull(),
  status: text('status').notNull().default('ongoing'),
  task_type: text('task_type').notNull(),
  ref_task_id: bigint('ref_task_id', { mode: 'number' }).references(() => challenge.task_id, { onDelete: 'set null' }),
  ref_template_id: bigint('ref_template_id', { mode: 'number' }).references(() => behaviour.template_id, { onDelete: 'set null' }),
  custom_name: text('custom_name'),
  description: text('description'),
  reward_points: real('reward_points').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`(now() AT TIME ZONE 'Asia/Taipei')`),
  // Points system fields
  task_record: text('task_record').default(''),
  estimated_time: real('estimated_time').default(0),
  reward_multiplier: real('reward_multiplier').default(1.0),
  learning_reward: real('learning_reward').default(0),
  points_calculated_at: timestamp('points_calculated_at', { withTimezone: true }),
  ai_evaluation: jsonb('ai_evaluation').default(sql`'{}'::jsonb`),
});

// Note table - updated for Supabase (formerly notes)
export const note = pgTable('note', {
  note_id: bigint('note_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.user_id, { onDelete: 'cascade' }),
  goal_id: bigint('goal_id', { mode: 'number' }).references(() => userGoals.goal_id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`(now() AT TIME ZONE 'Asia/Taipei')`),
  updated_at: timestamp('updated_at', { withTimezone: true }).default(sql`(now() AT TIME ZONE 'Asia/Taipei')`),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
  pinned: boolean('pinned').notNull().default(false),
});

// Points history table - new for points system
export const pointsHistory = pgTable('points_history', {
  history_id: bigint('history_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.user_id, { onDelete: 'cascade' }),
  task_id: bigint('task_id', { mode: 'number' }).references(() => challenge.task_id, { onDelete: 'set null' }),
  schedule_entry_id: bigint('schedule_entry_id', { mode: 'number' }).references(() => task.entry_id, { onDelete: 'set null' }),
  task_title: text('task_title').notNull(),
  task_record: text('task_record').default(''),
  points_earned: real('points_earned').notNull(),
  base_amount: real('base_amount').notNull(),
  reward_amount: real('reward_amount').notNull(),
  reward_multiplier: real('reward_multiplier').notNull(),
  learning_reward: real('learning_reward').notNull(),
  estimated_time: real('estimated_time').notNull(),
  daily_pay: real('daily_pay').notNull(),
  reasoning: text('reasoning').default(''),
  provider: text('provider').default('DeepSeek'),
  api_cost: real('api_cost').default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`(now() AT TIME ZONE 'Asia/Taipei')`),
});

// User skills table - optional for detailed skill management
export const userCompetenciesToDevelop = pgTable('user_competencies_to_develop', {
  skill_id: bigint('skill_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  user_id: bigint('user_id', { mode: 'number' }).notNull().references(() => users.user_id, { onDelete: 'cascade' }),
  skill_text: text('skill_text').notNull(),
  priority: integer('priority').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`(now() AT TIME ZONE 'Asia/Taipei')`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`(now() AT TIME ZONE 'Asia/Taipei')`),
}); 