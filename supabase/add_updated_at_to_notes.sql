-- 迁移脚本：为 notes 表添加 updated_at 字段
-- 执行此脚本来更新现有的数据库结构

-- 1. 创建函数来自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = (now() AT TIME ZONE 'Asia/Taipei'::text);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. 为现有的 notes 表添加 updated_at 字段（如果不存在）
DO $$ 
BEGIN
    -- 检查 updated_at 列是否存在，如果不存在则添加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'updated_at'
    ) THEN
        -- 添加 updated_at 列，默认值为台北时区的当前时间
        ALTER TABLE notes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'Asia/Taipei'::text) NOT NULL;
        
        -- 将现有记录的 updated_at 设置为 created_at 的值
        UPDATE notes SET updated_at = created_at WHERE updated_at IS NULL;
        
        -- 创建索引以提高按更新时间排序的查询性能
        CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
        
        RAISE NOTICE 'Added updated_at column to notes table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in notes table';
    END IF;
END $$;

-- 3. 创建或替换触发器，在更新时自动设置 updated_at
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at 
    BEFORE UPDATE ON notes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 验证迁移结果
DO $$
BEGIN
    -- 检查列是否成功添加
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'updated_at'
    ) THEN
        RAISE NOTICE 'Migration completed successfully: updated_at column is present';
    ELSE
        RAISE EXCEPTION 'Migration failed: updated_at column is missing';
    END IF;
    
    -- 检查触发器是否存在
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_notes_updated_at'
    ) THEN
        RAISE NOTICE 'Trigger created successfully: update_notes_updated_at';
    ELSE
        RAISE EXCEPTION 'Trigger creation failed: update_notes_updated_at is missing';
    END IF;
END $$; 