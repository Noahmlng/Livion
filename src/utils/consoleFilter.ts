/**
 * Console Filter Utility
 * 
 * Overrides the default console methods to only display content 
 * that appears after the word "Exception" in the output.
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

// Function to filter console output
const filterOutput = (args: any[]): any[] => {
  if (args.length === 0) return args;
  
  // Convert all arguments to strings and join them
  const fullMessage = args.map(arg => 
    typeof arg === 'string' ? arg : 
    (arg instanceof Error ? arg.stack || arg.message : 
    JSON.stringify(arg))).join(' ');
  
  // Check if "Exception" is in the message
  const exceptionIndex = fullMessage.indexOf('Exception');
  if (exceptionIndex !== -1) {
    // Only return the part after "Exception"
    return [fullMessage.substring(exceptionIndex)];
  }
  
  // If "Exception" is not found, return empty array (nothing will be logged)
  return [];
};

// Override console methods
console.log = (...args: any[]) => {
  const filteredArgs = filterOutput(args);
  if (filteredArgs.length > 0) {
    originalConsole.log(...filteredArgs);
  }
};

console.warn = (...args: any[]) => {
  const filteredArgs = filterOutput(args);
  if (filteredArgs.length > 0) {
    originalConsole.warn(...filteredArgs);
  }
};

console.error = (...args: any[]) => {
  const filteredArgs = filterOutput(args);
  if (filteredArgs.length > 0) {
    originalConsole.error(...filteredArgs);
  }
};

console.info = (...args: any[]) => {
  const filteredArgs = filterOutput(args);
  if (filteredArgs.length > 0) {
    originalConsole.info(...filteredArgs);
  }
};

console.debug = (...args: any[]) => {
  const filteredArgs = filterOutput(args);
  if (filteredArgs.length > 0) {
    originalConsole.debug(...filteredArgs);
  }
};

// Export the original methods in case they need to be restored
export const restoreConsole = () => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
}; 