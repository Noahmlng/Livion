# Supabase 数据库迁移指南

## 问题描述

在 TodayView 的笔记模块中发现了一个重要问题：`notes` 表缺少 `updated_at` 字段，导致笔记编辑后无法正确更新时间戳。

## 问题影响

1. 笔记编辑后，`updated_at` 字段无法更新
2. 笔记列表无法按最新编辑时间正确排序
3. 代码中多处尝试使用不存在的 `updated_at` 字段，可能导致错误

## 解决方案

### 方法一：执行迁移脚本（推荐）

在 Supabase 控制台的 SQL 编辑器中执行以下文件：

```bash
supabase/add_updated_at_to_notes.sql
```

这个脚本会：
1. 为 `notes` 表添加 `updated_at` 字段
2. 将现有记录的 `updated_at` 设置为 `created_at` 的值
3. 创建触发器，在更新记录时自动更新 `updated_at` 字段
4. 创建索引以提高查询性能

### 方法二：重新创建数据库

如果是新项目或可以重新创建数据库，可以使用更新后的 `schema.sql` 文件：

```bash
supabase/schema.sql
```

## 验证迁移

迁移完成后，可以通过以下 SQL 验证：

```sql
-- 检查 updated_at 字段是否存在
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'notes' AND column_name = 'updated_at';

-- 检查触发器是否存在
SELECT trigger_name, event_manipulation, action_timing 
FROM information_schema.triggers 
WHERE trigger_name = 'update_notes_updated_at';

-- 测试触发器是否工作
-- 1. 创建一条测试笔记
INSERT INTO notes (user_id, content) VALUES (1, '测试笔记');

-- 2. 等待几秒后更新笔记
UPDATE notes SET content = '更新后的测试笔记' WHERE content = '测试笔记';

-- 3. 检查 updated_at 是否大于 created_at，并显示台北时区时间
SELECT note_id, content, 
       created_at AT TIME ZONE 'Asia/Taipei' as created_at_taipei,
       updated_at AT TIME ZONE 'Asia/Taipei' as updated_at_taipei,
       (updated_at > created_at) as updated_correctly
FROM notes 
WHERE content = '更新后的测试笔记';
```

## 代码修改

迁移完成后，代码已经修改为不再手动设置 `updated_at` 字段，而是依赖数据库触发器自动更新。主要修改的文件：

- `src/context/DbContext.tsx`
- `src/utils/supabaseApi.ts`
- `src/utils/database.ts`

## 注意事项

1. 执行迁移前建议备份数据库
2. 迁移脚本是幂等的，可以安全地重复执行
3. 触发器会在每次 UPDATE 操作时自动设置 `updated_at` 为台北时区的当前时间
4. 新创建的笔记会自动设置 `created_at` 和 `updated_at` 为台北时区的当前时间
5. 所有时间戳都使用 `Asia/Taipei` 时区（UTC+8），确保与应用程序的时区一致 