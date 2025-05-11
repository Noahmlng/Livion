// This patch fixes react-beautiful-dnd compatibility issues with React 18
// Apply this fix before using the drag-and-drop functionality

import { useEffect } from 'react';

export const useDragDropFix = () => {
  useEffect(() => {
    // This is a workaround for react-beautiful-dnd and React 18+ compatibility
    const originalConsoleError = console.error;
    console.error = (...args: any) => {
      if (
        args[0]?.includes?.('attachRefs') ||
        args[0]?.includes?.('findDOMNode is deprecated in StrictMode') ||
        args[0]?.includes?.('forwardRef render functions') ||
        // Add any other error messages to suppress
        false
      ) {
        return;
      }
      originalConsoleError(...args);
    };

    // Intercept preventDefault to make it work properly in React 18
    const originalAddEventListener = document.addEventListener;
    document.addEventListener = function (
      type: string, 
      listener: EventListenerOrEventListenerObject, 
      options?: boolean | AddEventListenerOptions
    ) {
      // Override specifically for drag events
      if (
        type === 'touchstart' ||
        type === 'touchmove' ||
        type === 'wheel' ||
        type === 'dragstart'
      ) {
        originalAddEventListener.call(
          document,
          type,
          function (e: Event) {
            if (e.defaultPrevented) {
              // Do nothing if preventDefault already called
              return;
            }
            
            if (typeof listener === 'function') {
              listener(e);
            } else if (listener && typeof listener.handleEvent === 'function') {
              listener.handleEvent(e);
            }
          },
          options
        );
        return;
      }
      originalAddEventListener.call(document, type, listener, options);
    } as typeof document.addEventListener;

    // Clean up
    return () => {
      console.error = originalConsoleError;
      document.addEventListener = originalAddEventListener;
    };
  }, []);
}; 