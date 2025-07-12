import { useState, useRef } from 'react';
import { 
  Card, 
  CardBody
} from '@heroui/react';
import { useAuth } from '../../context/AuthContext';

interface LoginProps {
  onLogin?: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState(['', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
      await login(formattedPassword);
      
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <Card className="w-96 bg-gray-900 border border-gray-700 shadow-2xl">
        <CardBody className="p-8 space-y-8">
          {/* Simple Title */}
          <div className="text-center">
            <h2 className="text-xl font-mono font-bold text-gray-100 tracking-widest">
              ACCESS CODE
            </h2>
          </div>
          
          {/* Password Input */}
          <div className="flex items-center justify-center gap-3">
            {/* First 4 characters */}
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el }}
                type="text"
                maxLength={1}
                className={`
                  w-12 h-12 text-center text-xl font-mono font-bold
                  bg-gray-800 border border-gray-600 rounded
                  text-gray-100 placeholder-gray-500
                  transition-all duration-200
                  ${password[index] ? 'border-green-500 bg-gray-700' : 'hover:border-gray-500'}
                  ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
                  focus:outline-none focus:border-blue-500 focus:bg-gray-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                value={password[index]}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                autoFocus={index === 0}
                placeholder="•"
              />
            ))}
            
            {/* Dash separator */}
            <div className="text-xl font-mono font-bold text-gray-400">-</div>
            
            {/* Last character */}
            <input
              ref={el => { 
                inputRefs.current[4] = el;
              }}
              type="text"
              maxLength={1}
              className={`
                w-12 h-12 text-center text-xl font-mono font-bold
                bg-gray-800 border border-gray-600 rounded
                text-gray-100 placeholder-gray-500
                transition-all duration-200
                ${password[4] ? 'border-green-500 bg-gray-700' : 'hover:border-gray-500'}
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
                focus:outline-none focus:border-blue-500 focus:bg-gray-700
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              value={password[4]}
              onChange={(e) => {
                handleInputChange(4, e.target.value);
              }}
              onKeyDown={(e) => handleKeyDown(4, e)}
              disabled={loading}
              placeholder="•"
            />
          </div>
          
          {/* Status or Error */}
          <div className="text-center">
            {error ? (
              <div className="text-red-400 text-sm font-mono">
                {error}
              </div>
            ) : (
              <div className="text-gray-500 text-xs font-mono tracking-wider">
                {loading ? 'Validating...' : 'Enter code to continue'}
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}