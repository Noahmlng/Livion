import { useState, useRef } from 'react';
import { signIn } from '../../utils/auth';
import { useAuth } from '../../context/AuthContext';

interface LoginProps {
  onLogin?: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState(['', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshAuthState } = useAuth();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow one character per input and convert to uppercase
    if (value.length > 1) {
      value = value.charAt(value.length - 1);
    }
    value = value.toUpperCase();
    
    const newPassword = [...password];
    newPassword[index] = value;
    setPassword(newPassword);

    // Move to next input if current one is filled
    if (value && index < 4 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit when all fields are filled, but use the updated newPassword array
    // instead of waiting for the state update to complete
    if (index === 4 && value && newPassword.every(char => char)) {
      console.log("All fields filled, submitting with:", newPassword);
      handleSubmitWithPassword(newPassword);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace - move to previous input
    if (e.key === 'Backspace' && !password[index] && index > 0) {
      const newPassword = [...password];
      newPassword[index - 1] = '';
      setPassword(newPassword);
      inputRefs.current[index - 1]?.focus();
    }
  };

  // New function that takes the password directly instead of using state
  const handleSubmitWithPassword = async (passwordArray: string[]) => {
    // Format password as XXXX-X (dash is automatically added)
    const firstPart = passwordArray.slice(0, 4).join('');
    const lastPart = passwordArray[4]; 
    
    // Ensure we use the last character if it exists
    const formattedPassword = `${firstPart}-${lastPart}`;
        
    setError('');
    setLoading(true);

    try {
      await signIn(formattedPassword);
      await refreshAuthState();
      
      if (onLogin) {
        onLogin();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请检查密码');
      // Clear the inputs on error
      setPassword(['', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Keep the original handleSubmit for the manual button
  const handleSubmit = async () => {
    // Format password as XXXX-X (dash is automatically added)
    const firstPart = password.slice(0, 4).join('');
    const lastPart = password[4]; 
    
    console.log('Raw password array:', password);
    console.log('Index 4 value:', password[4]);
    console.log('First part length:', firstPart.length);
    console.log('Last part defined:', lastPart ? 'yes' : 'no');
    
    // Ensure we use the last character if it exists
    const formattedPassword = lastPart 
      ? `${firstPart}-${lastPart}` 
      : `${firstPart}-`;
    
    console.log('password: ', password);
    console.log('firstPart: ', firstPart);
    console.log('lastPart: ', lastPart);
    console.log('formattedPassword: ', formattedPassword);
    
    setError('');
    setLoading(true);

    try {
      await signIn(formattedPassword);
      await refreshAuthState();
      
      if (onLogin) {
        onLogin();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请检查密码');
      // Clear the inputs on error
      setPassword(['', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-bg-dark border border-border-metal rounded-lg p-6 w-96 shadow-lg">
        <h2 className="text-xl font-semibold text-text-primary text-center mb-6">
          输入密码
        </h2>
        
        <div className="flex items-center justify-center space-x-2 mb-8">
          {/* First 4 characters */}
          {[0, 1, 2, 3].map((index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el }}
              type="text"
              maxLength={1}
              className="w-12 h-12 text-center text-xl bg-bg-panel border border-border-metal rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
              value={password[index]}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading}
              autoFocus={index === 0}
            />
          ))}
          
          {/* Dash separator (non-input) */}
          <div className="w-6 text-center text-xl text-text-primary">-</div>
          
          {/* Last character */}
          <input
            ref={el => { 
              inputRefs.current[4] = el;
            }}
            type="text"
            maxLength={1}
            className="w-12 h-12 text-center text-xl bg-bg-panel border border-border-metal rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
            value={password[4]}
            onChange={(e) => {
              console.log("Last input changed:", e.target.value);
              handleInputChange(4, e.target.value);
            }}
            onKeyDown={(e) => handleKeyDown(4, e)}
            disabled={loading}
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center mb-4">{error}</div>
        )}

        <div className="text-xs text-gray-400 text-center">
          {loading ? '验证中...' : '输入完成后将自动验证'}
        </div>

        {/* Add a manual submit button for testing */}
        <div className="mt-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            手动提交
          </button>
        </div>
      </div>
    </div>
  );
}