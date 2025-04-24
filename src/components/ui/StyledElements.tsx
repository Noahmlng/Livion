import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

// Main container for the app
export const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
  background-image: url('/background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
`;

// RPG World container
export const WorldContainer = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
`;

// Top navigation tabs (styled like RPG menu tabs)
export const TabsContainer = styled.div`
  display: flex;
  background-color: rgba(44, 35, 24, 0.85);
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-bottom: ${({ theme }) => theme.border.width.medium} solid ${({ theme }) => theme.colors.leather};
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

interface TabButtonProps {
  active?: boolean;
}

export const TabButton = styled.button<TabButtonProps>`
  background-color: ${({ active, theme }) => 
    active ? theme.colors.tabActive : theme.colors.tabDefault};
  color: ${({ theme }) => theme.colors.foreground};
  border: none;
  border-radius: ${({ theme }) => theme.border.radius.medium} ${({ theme }) => theme.border.radius.medium} 0 0;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  font-family: ${({ theme }) => theme.fonts.rpg};
  font-size: 1.1rem;
  cursor: pointer;
  position: relative;
  transition: all ${({ theme }) => theme.transitions.medium};
  min-width: 100px;
  text-align: center;
  box-shadow: ${({ theme }) => theme.shadows.medium};
  
  &:hover {
    background-color: ${({ active, theme }) => 
      active ? theme.colors.tabActive : theme.colors.leather};
  }
  
  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background-color: ${({ active, theme }) => 
      active ? theme.colors.accent : 'transparent'};
    transition: all ${({ theme }) => theme.transitions.fast};
  }
`;

// Task card elements
export const TaskCard = styled(motion.div)`
  background-color: ${({ theme }) => theme.colors.parchment};
  color: ${({ theme }) => theme.colors.dark};
  border-radius: ${({ theme }) => theme.border.radius.medium};
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  box-shadow: ${({ theme }) => theme.shadows.medium};
  position: relative;
  transition: all ${({ theme }) => theme.transitions.medium};
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.large};
  }
`;

// Task detail modal
export const TaskModal = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: ${({ theme }) => theme.colors.darkBrown};
  border: ${({ theme }) => theme.border.width.medium} solid ${({ theme }) => theme.colors.wood};
  border-radius: ${({ theme }) => theme.border.radius.medium};
  padding: ${({ theme }) => theme.spacing.lg};
  max-width: 90%;
  width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  flex-direction: column;
`;

export const TaskModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  
  h2 {
    font-family: ${({ theme }) => theme.fonts.rpg};
    color: ${({ theme }) => theme.colors.gold};
    margin: 0;
  }
`;

export const TaskModalContent = styled.div`
  display: flex;
  flex: 1;
  gap: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

export const TaskModalLeft = styled.div`
  flex: 1;
  color: ${({ theme }) => theme.colors.parchment};
`;

export const TaskModalRight = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.dark};
  border-radius: ${({ theme }) => theme.border.radius.medium};
  overflow: hidden;
  
  img {
    max-width: 100%;
    max-height: 300px;
    object-fit: cover;
  }
`;

export const TaskModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

// Button styles
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
}

export const Button = styled.button<ButtonProps>`
  background-color: ${({ variant = 'primary', theme }) => {
    switch (variant) {
      case 'primary': return theme.colors.primary;
      case 'secondary': return theme.colors.secondary;
      case 'danger': return theme.colors.danger;
      case 'success': return theme.colors.success;
      default: return theme.colors.primary;
    }
  }};
  color: ${({ theme }) => theme.colors.foreground};
  border: none;
  border-radius: ${({ theme }) => theme.border.radius.small};
  padding: ${({ size = 'medium', theme }) => {
    switch (size) {
      case 'small': return `${theme.spacing.xs} ${theme.spacing.sm}`;
      case 'medium': return `${theme.spacing.sm} ${theme.spacing.md}`;
      case 'large': return `${theme.spacing.md} ${theme.spacing.lg}`;
      default: return `${theme.spacing.sm} ${theme.spacing.md}`;
    }
  }};
  font-size: ${({ size = 'medium' }) => {
    switch (size) {
      case 'small': return '0.8rem';
      case 'medium': return '1rem';
      case 'large': return '1.2rem';
      default: return '1rem';
    }
  }};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    filter: brightness(1.1);
  }
  
  &:active {
    filter: brightness(0.9);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Task list container
export const TaskListContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  overflow-y: auto;
  max-height: calc(100vh - 60px);
`;

// Task section (for grouping tasks by date)
export const TaskSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

export const TaskSectionHeader = styled.h3`
  font-family: ${({ theme }) => theme.fonts.rpg};
  color: ${({ theme }) => theme.colors.accent};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  border-bottom: ${({ theme }) => theme.border.width.thin} solid ${({ theme }) => theme.colors.accent};
  padding-bottom: ${({ theme }) => theme.spacing.xs};
`;

// HUD component (transparent overlay for today's tasks)
export const HudContainer = styled.div`
  position: absolute;
  top: 30%;
  right: ${({ theme }) => theme.spacing.md};
  width: 300px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: ${({ theme }) => theme.border.radius.medium};
  padding: ${({ theme }) => theme.spacing.md};
  transition: all ${({ theme }) => theme.transitions.medium};
  
  &:hover {
    background-color: rgba(30, 30, 30, 0.8);
  }
`;

export const HudHeader = styled.h4`
  font-family: ${({ theme }) => theme.fonts.rpg};
  color: ${({ theme }) => theme.colors.accent};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

export const HudTaskItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.xs} 0;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    color: ${({ theme }) => theme.colors.accent};
  }
`;

export const CircleCheckbox = styled.div<{ checked?: boolean }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid ${({ checked, theme }) => 
    checked ? theme.colors.success : theme.colors.accent};
  background-color: ${({ checked, theme }) => 
    checked ? theme.colors.success : 'transparent'};
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.success};
    background-color: ${({ checked, theme }) => 
      checked ? theme.colors.success : 'rgba(86, 166, 90, 0.2)'};
  }
`;

// Task form elements
export const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

export const Label = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.parchment};
`;

export const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.dark};
  color: ${({ theme }) => theme.colors.foreground};
  border: ${({ theme }) => theme.border.width.thin} solid ${({ theme }) => theme.colors.lightBrown};
  border-radius: ${({ theme }) => theme.border.radius.small};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
    box-shadow: ${({ theme }) => theme.shadows.outline};
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.dark};
  color: ${({ theme }) => theme.colors.foreground};
  border: ${({ theme }) => theme.border.width.thin} solid ${({ theme }) => theme.colors.lightBrown};
  border-radius: ${({ theme }) => theme.border.radius.small};
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
    box-shadow: ${({ theme }) => theme.shadows.outline};
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.dark};
  color: ${({ theme }) => theme.colors.foreground};
  border: ${({ theme }) => theme.border.width.thin} solid ${({ theme }) => theme.colors.lightBrown};
  border-radius: ${({ theme }) => theme.border.radius.small};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
    box-shadow: ${({ theme }) => theme.shadows.outline};
  }
`;

// Create task floating button
export const FloatingButton = styled(Button)`
  position: fixed;
  bottom: ${({ theme }) => theme.spacing.lg};
  right: ${({ theme }) => theme.spacing.lg};
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: ${({ theme }) => theme.shadows.large};
  z-index: ${({ theme }) => theme.zIndex.dropdown};
`;

// Task priority indicator
export const PriorityIndicator = styled.span<{ priority: 'low' | 'medium' | 'high' }>`
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: ${({ theme }) => theme.spacing.xs};
  background-color: ${({ priority, theme }) => {
    switch (priority) {
      case 'low': return theme.colors.success;
      case 'medium': return theme.colors.warning;
      case 'high': return theme.colors.danger;
      default: return theme.colors.info;
    }
  }};
`;

// Task upvote button
export const UpvoteButton = styled.button`
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.copper};
  cursor: pointer;
  font-weight: 500;
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    color: ${({ theme }) => theme.colors.gold};
  }
`;

// Overlay for modals
export const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${({ theme }) => theme.zIndex.modal - 1};
`; 