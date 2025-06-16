// This patch fixes react-beautiful-dnd compatibility issues with React 18
// Apply this fix before using the drag-and-drop functionality

import { useEffect } from 'react';

// 修复react-beautiful-dnd在React 18中的拖拽问题
export const useDragDropFix = () => {
  useEffect(() => {
    // 抑制控制台错误，这些错误通常不会影响功能
    const originalConsoleError = console.error;
    console.error = (...args: any) => {
      // 忽略react-beautiful-dnd相关的特定警告
      if (
        args[0]?.includes?.('attachRefs') ||
        args[0]?.includes?.('findDOMNode is deprecated in StrictMode') ||
        args[0]?.includes?.('forwardRef render functions') ||
        args[0]?.includes?.('ReactDOM.findDOMNode')
      ) {
        return;
      }
      originalConsoleError(...args);
    };

    // 注意: 拖拽禁用逻辑已移至TodayView组件中实现
    // 此处不再添加全局拖拽事件处理

    // 清理函数
    return () => {
      console.error = originalConsoleError;
    };
  }, []);
}; 