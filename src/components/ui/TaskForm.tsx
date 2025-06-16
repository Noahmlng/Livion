import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FormGroup, Label, Input, TextArea, Select, Button } from './StyledElements';
import { useTask } from '../../context/TaskContext';
import { Task, TaskPriority, TaskCategory } from '../../types/task';

interface TaskFormProps {
  initialTask?: Partial<Task>;
  onSubmit?: (task: Task) => void;
  onCancel: () => void;
  isEdit?: boolean;
}

const TaskForm: React.FC<TaskFormProps> = ({ 
  initialTask = {}, 
  onSubmit, 
  onCancel,
  isEdit = false 
}) => {
  const { addTask, updateTask } = useTask();
  
  const [title, setTitle] = useState(initialTask.title || '');
  const [description, setDescription] = useState(initialTask.description || '');
  const [priority, setPriority] = useState<TaskPriority>(initialTask.priority || 'medium');
  const [category, setCategory] = useState<TaskCategory>(initialTask.category || 'daily');
  const [dueDate, setDueDate] = useState(
    initialTask.dueDate ? new Date(initialTask.dueDate).toISOString().split('T')[0] : ''
  );
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData = {
      title,
      description,
      priority,
      category,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags: initialTask.tags || []
    };
    
    if (isEdit && initialTask.id) {
      updateTask(initialTask.id, taskData);
      if (onSubmit && initialTask as Task) {
        onSubmit({
          ...initialTask as Task,
          ...taskData
        });
      }
    } else {
      addTask(taskData);
    }
    
    onCancel();
  };
  
  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <FormGroup>
        <Label htmlFor="title">任务标题</Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入任务标题"
          required
        />
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="description">任务详情</Label>
        <TextArea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="输入任务详情..."
          required
        />
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="priority">优先级</Label>
        <Select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
        >
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </Select>
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="category">类别</Label>
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
        <Label htmlFor="dueDate">截止日期</Label>
        <Input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </FormGroup>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" variant="primary">
          {isEdit ? '更新任务' : '创建任务'}
        </Button>
      </div>
    </motion.form>
  );
};

export default TaskForm; 