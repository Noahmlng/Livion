-- =====================================
-- 表重命名迁移 SQL (PostgreSQL)
-- =====================================

-- 注意：表重命名操作需要谨慎执行，建议在维护窗口期间进行
-- 执行前请务必备份数据库

-- 1. 删除外键约束（重命名后需要重建）
-- 删除现有表的外键约束
ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_goal_id_fkey;
ALTER TABLE IF EXISTS public.task_templates DROP CONSTRAINT IF EXISTS task_templates_user_id_fkey;
ALTER TABLE IF EXISTS public.schedule_entries DROP CONSTRAINT IF EXISTS schedule_entries_user_id_fkey;
ALTER TABLE IF EXISTS public.schedule_entries DROP CONSTRAINT IF EXISTS schedule_entries_ref_task_id_fkey;
ALTER TABLE IF EXISTS public.schedule_entries DROP CONSTRAINT IF EXISTS schedule_entries_ref_template_id_fkey;
ALTER TABLE IF EXISTS public.notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;
ALTER TABLE IF EXISTS public.notes DROP CONSTRAINT IF EXISTS notes_goal_id_fkey;
ALTER TABLE IF EXISTS public.goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;

-- 删除积分系统相关表的外键约束（如果这些表存在）
DO $$
BEGIN
    -- 检查并删除 points_history 表的约束
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'points_history' AND table_schema = 'public') THEN
        ALTER TABLE IF EXISTS public.points_history DROP CONSTRAINT IF EXISTS points_history_user_id_fkey;
        ALTER TABLE IF EXISTS public.points_history DROP CONSTRAINT IF EXISTS points_history_task_id_fkey;
        ALTER TABLE IF EXISTS public.points_history DROP CONSTRAINT IF EXISTS points_history_schedule_entry_id_fkey;
    END IF;
    
    -- 检查并删除 user_goals 表的约束
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_goals' AND table_schema = 'public') THEN
        ALTER TABLE IF EXISTS public.user_goals DROP CONSTRAINT IF EXISTS user_goals_user_id_fkey;
    END IF;
    
    -- 检查并删除 user_competencies_to_develop 表的约束
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_competencies_to_develop' AND table_schema = 'public') THEN
        ALTER TABLE IF EXISTS public.user_competencies_to_develop DROP CONSTRAINT IF EXISTS user_competencies_to_develop_user_id_fkey;
    END IF;
END $$;

-- 2. 重命名表
ALTER TABLE IF EXISTS public.notes RENAME TO note;
ALTER TABLE IF EXISTS public.schedule_entries RENAME TO task;
ALTER TABLE IF EXISTS public.task_templates RENAME TO behaviour;
ALTER TABLE IF EXISTS public.tasks RENAME TO challenge;
-- ALTER TABLE IF EXISTS public.users RENAME TO user; -- 保留原名users，因为user是PostgreSQL保留关键字
ALTER TABLE IF EXISTS public.goals RENAME TO goal;

-- 3. 重命名主键约束（如果存在）
DO $$
BEGIN
    -- 重命名 note 表的主键约束
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notes_pkey' AND table_name = 'note' AND table_schema = 'public') THEN
        ALTER TABLE public.note RENAME CONSTRAINT notes_pkey TO note_pkey;
    END IF;
    
    -- 重命名 task 表的主键约束
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'schedule_entries_pkey' AND table_name = 'task' AND table_schema = 'public') THEN
        ALTER TABLE public.task RENAME CONSTRAINT schedule_entries_pkey TO task_pkey;
    END IF;
    
    -- 重命名 behaviour 表的主键约束
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_templates_pkey' AND table_name = 'behaviour' AND table_schema = 'public') THEN
        ALTER TABLE public.behaviour RENAME CONSTRAINT task_templates_pkey TO behaviour_pkey;
    END IF;
    
    -- 重命名 challenge 表的主键约束
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_pkey' AND table_name = 'challenge' AND table_schema = 'public') THEN
        ALTER TABLE public.challenge RENAME CONSTRAINT tasks_pkey TO challenge_pkey;
    END IF;
    
    -- 重命名 goal 表的主键约束
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'goals_pkey' AND table_name = 'goal' AND table_schema = 'public') THEN
        ALTER TABLE public.goal RENAME CONSTRAINT goals_pkey TO goal_pkey;
    END IF;
END $$;

-- 4. 重命名其他约束
-- ALTER TABLE public.user RENAME CONSTRAINT users_password_key TO user_password_key; -- 保留原名
-- ALTER TABLE public.user RENAME CONSTRAINT users_daily_pay_positive TO user_daily_pay_positive; -- 保留原名
-- 积分系统相关约束重命名（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_estimated_time_positive' AND table_name = 'challenge') THEN
        ALTER TABLE public.challenge RENAME CONSTRAINT tasks_estimated_time_positive TO challenge_estimated_time_positive;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_reward_multiplier_positive' AND table_name = 'challenge') THEN
        ALTER TABLE public.challenge RENAME CONSTRAINT tasks_reward_multiplier_positive TO challenge_reward_multiplier_positive;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_learning_reward_positive' AND table_name = 'challenge') THEN
        ALTER TABLE public.challenge RENAME CONSTRAINT tasks_learning_reward_positive TO challenge_learning_reward_positive;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'schedule_entries_estimated_time_positive' AND table_name = 'task') THEN
        ALTER TABLE public.task RENAME CONSTRAINT schedule_entries_estimated_time_positive TO task_estimated_time_positive;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'schedule_entries_reward_multiplier_positive' AND table_name = 'task') THEN
        ALTER TABLE public.task RENAME CONSTRAINT schedule_entries_reward_multiplier_positive TO task_reward_multiplier_positive;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'schedule_entries_learning_reward_positive' AND table_name = 'task') THEN
        ALTER TABLE public.task RENAME CONSTRAINT schedule_entries_learning_reward_positive TO task_learning_reward_positive;
    END IF;
END $$;

-- 5. 重命名索引（如果存在）
DO $$
BEGIN
    -- 重命名 challenge 表相关的索引
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tasks_user_id' AND schemaname = 'public') THEN
        ALTER INDEX IF EXISTS idx_tasks_user_id RENAME TO idx_challenge_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tasks_goal_id' AND schemaname = 'public') THEN
        ALTER INDEX IF EXISTS idx_tasks_goal_id RENAME TO idx_challenge_goal_id;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tasks_status' AND schemaname = 'public') THEN
        ALTER INDEX IF EXISTS idx_tasks_status RENAME TO idx_challenge_status;
    END IF;
    
    -- 重命名 task 表相关的索引
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schedule_entries_user_id' AND schemaname = 'public') THEN
        ALTER INDEX IF EXISTS idx_schedule_entries_user_id RENAME TO idx_task_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schedule_entries_date' AND schemaname = 'public') THEN
        ALTER INDEX IF EXISTS idx_schedule_entries_date RENAME TO idx_task_date;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schedule_entries_user_date' AND schemaname = 'public') THEN
        ALTER INDEX IF EXISTS idx_schedule_entries_user_date RENAME TO idx_task_user_date;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schedule_entries_status' AND schemaname = 'public') THEN
        ALTER INDEX IF EXISTS idx_schedule_entries_status RENAME TO idx_task_status;
    END IF;
    
    -- 重命名 note 表相关的索引
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notes_pinned' AND schemaname = 'public') THEN
        ALTER INDEX IF EXISTS idx_notes_pinned RENAME TO idx_note_pinned;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notes_pinned_updated_at' AND schemaname = 'public') THEN
        ALTER INDEX IF EXISTS idx_notes_pinned_updated_at RENAME TO idx_note_pinned_updated_at;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notes_user_id' AND schemaname = 'public') THEN
        ALTER INDEX IF EXISTS idx_notes_user_id RENAME TO idx_note_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notes_goal_id' AND schemaname = 'public') THEN
        ALTER INDEX IF EXISTS idx_notes_goal_id RENAME TO idx_note_goal_id;
    END IF;
    
    -- 重命名 goal 表相关的索引
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goals_user_id' AND schemaname = 'public') THEN
        ALTER INDEX IF EXISTS idx_goals_user_id RENAME TO idx_goal_user_id;
    END IF;
END $$;

-- 6. 重建外键约束（使用新表名，如果约束不存在）
DO $$
BEGIN
    -- 重建 challenge 表的外键约束
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'challenge_user_id_fkey' AND table_name = 'challenge' AND table_schema = 'public') THEN
        ALTER TABLE public.challenge ADD CONSTRAINT challenge_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'challenge_goal_id_fkey' AND table_name = 'challenge' AND table_schema = 'public') THEN
        ALTER TABLE public.challenge ADD CONSTRAINT challenge_goal_id_fkey 
          FOREIGN KEY (goal_id) REFERENCES public.goal (goal_id) ON DELETE SET NULL;
    END IF;

    -- 重建 behaviour 表的外键约束
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'behaviour_user_id_fkey' AND table_name = 'behaviour' AND table_schema = 'public') THEN
        ALTER TABLE public.behaviour ADD CONSTRAINT behaviour_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON UPDATE CASCADE;
    END IF;

    -- 重建 task 表的外键约束
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_user_id_fkey' AND table_name = 'task' AND table_schema = 'public') THEN
        ALTER TABLE public.task ADD CONSTRAINT task_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_ref_challenge_id_fkey' AND table_name = 'task' AND table_schema = 'public') THEN
        ALTER TABLE public.task ADD CONSTRAINT task_ref_challenge_id_fkey 
          FOREIGN KEY (ref_task_id) REFERENCES public.challenge (task_id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_ref_behaviour_id_fkey' AND table_name = 'task' AND table_schema = 'public') THEN
        ALTER TABLE public.task ADD CONSTRAINT task_ref_behaviour_id_fkey 
          FOREIGN KEY (ref_template_id) REFERENCES public.behaviour (template_id) ON DELETE SET NULL;
    END IF;

    -- 重建 note 表的外键约束
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'note_user_id_fkey' AND table_name = 'note' AND table_schema = 'public') THEN
        ALTER TABLE public.note ADD CONSTRAINT note_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'note_goal_id_fkey' AND table_name = 'note' AND table_schema = 'public') THEN
        ALTER TABLE public.note ADD CONSTRAINT note_goal_id_fkey 
          FOREIGN KEY (goal_id) REFERENCES public.goal (goal_id) ON DELETE SET NULL;
    END IF;

    -- 重建 goal 表的外键约束
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'goal_user_id_fkey' AND table_name = 'goal' AND table_schema = 'public') THEN
        ALTER TABLE public.goal ADD CONSTRAINT goal_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE CASCADE;
    END IF;
END $$;

-- 重建积分系统相关表的外键约束（如果这些表存在且约束不存在）
DO $$
BEGIN
    -- 重建 points_history 表的约束
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'points_history' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'points_history_user_id_fkey' AND table_name = 'points_history' AND table_schema = 'public') THEN
            ALTER TABLE public.points_history ADD CONSTRAINT points_history_user_id_fkey 
              FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'points_history_challenge_id_fkey' AND table_name = 'points_history' AND table_schema = 'public') THEN
            ALTER TABLE public.points_history ADD CONSTRAINT points_history_challenge_id_fkey 
              FOREIGN KEY (task_id) REFERENCES public.challenge (task_id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'points_history_task_id_fkey' AND table_name = 'points_history' AND table_schema = 'public') THEN
            ALTER TABLE public.points_history ADD CONSTRAINT points_history_task_id_fkey 
              FOREIGN KEY (schedule_entry_id) REFERENCES public.task (entry_id) ON DELETE SET NULL;
        END IF;
    END IF;
    
    -- 重建 user_goals 表的约束
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_goals' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_goals_user_id_fkey' AND table_name = 'user_goals' AND table_schema = 'public') THEN
            ALTER TABLE public.user_goals ADD CONSTRAINT user_goals_user_id_fkey 
              FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    -- 重建 user_competencies_to_develop 表的约束
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_competencies_to_develop' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_competencies_to_develop_user_id_fkey' AND table_name = 'user_competencies_to_develop' AND table_schema = 'public') THEN
            ALTER TABLE public.user_competencies_to_develop ADD CONSTRAINT user_competencies_to_develop_user_id_fkey 
              FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 7. 重建触发器（如果存在且函数存在）
DO $$
BEGIN
    -- 删除旧的触发器（如果存在）
    DROP TRIGGER IF EXISTS update_notes_updated_at ON public.note;
    DROP TRIGGER IF EXISTS update_note_updated_at ON public.note;
    
    -- 创建新的触发器（如果函数存在且触发器不存在）
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_updated_at_column' AND routine_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_note_updated_at' AND event_object_table = 'note' AND trigger_schema = 'public') THEN
            CREATE TRIGGER update_note_updated_at BEFORE UPDATE ON public.note 
              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END IF;
END $$;

-- 8. 更新表注释
COMMENT ON TABLE public.users IS '用户表';
COMMENT ON TABLE public.goal IS '目标表';
COMMENT ON TABLE public.challenge IS '挑战任务表';
COMMENT ON TABLE public.behaviour IS '行为模板表';
COMMENT ON TABLE public.task IS '任务调度表';
COMMENT ON TABLE public.note IS '笔记表';

-- 9. 验证重命名结果
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'goal', 'challenge', 'behaviour', 'task', 'note', 'points_history', 'user_goals', 'user_competencies_to_develop')
ORDER BY table_name; 