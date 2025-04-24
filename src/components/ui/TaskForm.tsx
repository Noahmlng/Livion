import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TaskModal, 
  TaskModalHeader, 
  Button, 
  FormGroup, 
  Label, 
  Input, 
  TextArea, 
  Select 
} from './StyledElements';
import { useTask } from '../../context/TaskContext';
import { Task, TaskPriority, TaskCategory } from '../../types/task';

interface TaskFormProps {
  task?: Task;
  onClose: () => void;
  onClick: (e: React.MouseEvent) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ task, onClose, onClick }) => {
  const { addTask, updateTask } = useTask();
  const isEditMode = !!task;

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium');
  const [category, setCategory] = useState<TaskCategory>(task?.category || 'main');
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [tags, setTags] = useState<string>(task?.tags.join(', ') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedTags = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
      
    if (isEditMode && task) {
      updateTask(task.id, {
        title,
        description,
        priority,
        category,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        tags: [...formattedTags, category],
      });
    } else {
      addTask({
        title,
        description,
        priority,
        category,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        tags: [...formattedTags, category],
      });
    }

    onClose();
  };

  return (
    <TaskModal 
      onClick={onClick}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      <TaskModalHeader>
        <h2>{isEditMode ? '编辑任务' : '创建新任务'}</h2>
        <Button 
          variant="danger" 
          size="small" 
          onClick={onClose}
        >
          ×
        </Button>
      </TaskModalHeader>

      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="title">任务标题</Label>
          <Input 
            id="title" 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="description">任务描述</Label>
          <TextArea 
            id="description" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            required 
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="category">任务类型</Label>
          <Select 
            id="category" 
            value={category} 
            onChange={(e) => setCategory(e.target.value as TaskCategory)} 
          >
            <option value="main">主线任务</option>
            <option value="side">支线任务</option>
            <option value="daily">日常任务</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="priority">优先级</Label>
          <Select 
            id="priority" 
            value={priority} 
            onChange={(e) => setPriority(e.target.value as TaskPriority)} 
          >
            <option value="high">高优先级</option>
            <option value="medium">中等优先级</option>
            <option value="low">低优先级</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="dueDate">截止日期</Label>
          <Input 
            id="dueDate" 
            type="date" 
            value={dueDate} 
            onChange={(e) => setDueDate(e.target.value)} 
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="tags">标签（用逗号分隔）</Label>
          <Input 
            id="tags" 
            type="text" 
            value={tags} 
            onChange={(e) => setTags(e.target.value)} 
            placeholder="例如: combat, reward, important" 
          />
        </FormGroup>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary">
            {isEditMode ? '保存' : '创建'}
          </Button>
        </div>
      </form>
    </TaskModal>
  );
};

export default TaskForm; 