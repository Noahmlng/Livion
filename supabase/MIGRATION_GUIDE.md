# 笔记置顶功能迁移指南

## 概述

本次更新为笔记功能添加了置顶功能，用户可以将重要的笔记置顶显示在列表顶部。

## 数据库迁移

### 1. 执行迁移脚本

在 Supabase 控制台的 SQL 编辑器中执行以下脚本：

```sql
-- 执行 add_pinned_to_notes.sql 文件中的内容
```

或者直接复制粘贴以下 SQL：

```sql
-- 迁移脚本：为 notes 表添加 pinned 字段
-- 执行此脚本来添加笔记置顶功能

-- 为现有的 notes 表添加 pinned 列（如果不存在）
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
```

### 2. 验证迁移

执行以下 SQL 来验证迁移是否成功：

```sql
-- 检查 pinned 字段是否存在
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'notes' AND column_name = 'pinned';

-- 检查索引是否创建成功
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'notes' AND indexname LIKE '%pinned%';
```

## 功能说明

### 前端更新

1. **笔记接口更新**：添加了 `pinned?: boolean` 字段
2. **置顶按钮**：每个笔记都有置顶/取消置顶按钮
3. **置顶图标**：置顶的笔记会显示一个图钉图标
4. **排序逻辑**：置顶的笔记会显示在列表顶部，然后按更新时间排序

### 后端更新

1. **数据库字段**：添加了 `pinned` 布尔字段，默认为 `false`
2. **API 更新**：添加了 `togglePin` 方法来切换置顶状态
3. **查询优化**：添加了索引来提高排序查询性能

### 使用方法

1. **置顶笔记**：点击笔记下方的"置顶"按钮
2. **取消置顶**：点击已置顶笔记下方的"取消置顶"按钮
3. **视觉标识**：置顶的笔记会在右上角显示图钉图标
4. **排序规则**：置顶笔记在列表顶部，非置顶笔记按更新时间排序

## 注意事项

1. 迁移脚本是幂等的，可以安全地多次执行
2. 现有笔记的 `pinned` 字段默认为 `false`
3. 置顶状态的切换使用乐观更新，提供更好的用户体验
4. 如果服务器更新失败，UI 会自动回滚到之前的状态 