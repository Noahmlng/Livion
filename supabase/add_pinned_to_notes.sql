-- 迁移脚本：为 notes 表添加 pinned 字段
-- 执行此脚本来添加笔记置顶功能

-- 为现有的 notes 表添加 pinned 字段（如果不存在）
DO $$ 
BEGIN
    -- 检查 pinned 列是否存在，如果不存在则添加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'pinned'
    ) THEN
        -- 添加 pinned 列，默认值为 false
        ALTER TABLE notes ADD COLUMN pinned BOOLEAN DEFAULT FALSE NOT NULL;
        
        -- 创建索引以提高按置顶状态排序的查询性能
        CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);
        
        -- 创建复合索引以提高按置顶状态和更新时间排序的查询性能
        CREATE INDEX IF NOT EXISTS idx_notes_pinned_updated_at ON notes(pinned DESC, updated_at DESC);
        
        RAISE NOTICE 'Added pinned column to notes table';
    ELSE
        RAISE NOTICE 'pinned column already exists in notes table';
    END IF;
END $$;

-- 验证迁移结果
DO $$
BEGIN
    -- 检查列是否成功添加
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'pinned'
    ) THEN
        RAISE NOTICE 'Migration completed successfully: pinned column is present';
    ELSE
        RAISE EXCEPTION 'Migration failed: pinned column is missing';
    END IF;
END $$; 