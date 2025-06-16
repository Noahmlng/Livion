import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// User table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// Goals (main quests, achievements, categories)
export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  user_id: text('user_id').notNull().references(() => users.id),
  parent_id: text('parent_id'),
  type: text('type').notNull().default('category'), // category, main_quest, achievement
  reward_points: integer('reward_points').default(0),
  image_url: text('image_url'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  completed_at: integer('completed_at', { mode: 'timestamp' }),
  is_completed: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
});

// Relation - goals to parent goals (self-reference)
// This is applied after the table definition to avoid circular references
// Will be enforced at the application level

// Tasks (challenges, quests)
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  user_id: text('user_id').notNull().references(() => users.id),
  goal_id: text('goal_id').references(() => goals.id),
  reward_points: integer('reward_points').default(0),
  image_url: text('image_url'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  completed_at: integer('completed_at', { mode: 'timestamp' }),
  is_completed: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  category: text('category').default('side'), // side, daily, etc.
});

// Task templates for recurring tasks
export const taskTemplates = sqliteTable('task_templates', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  user_id: text('user_id').notNull().references(() => users.id),
  goal_id: text('goal_id').references(() => goals.id),
  reward_points: integer('reward_points').default(0),
  recurrence: text('recurrence'), // daily, weekly, etc.
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  category: text('category').default('daily'), // daily, weekly, etc.
});

// Schedule entries for the "Today" view
export const scheduleEntries = sqliteTable('schedule_entries', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  task_id: text('task_id').references(() => tasks.id),
  template_id: text('template_id').references(() => taskTemplates.id),
  title: text('title').notNull(),
  time_slot: text('time_slot').notNull(), // morning, afternoon, evening
  scheduled_date: integer('scheduled_date', { mode: 'timestamp' }).notNull(),
  completed_at: integer('completed_at', { mode: 'timestamp' }),
  is_completed: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  source_type: text('source_type').notNull(), // challenge, template, custom
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// Notes
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}); 