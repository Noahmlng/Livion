import React from 'react';

const SimpleTest: React.FC = () => {
  return (
    <div style={{ 
      padding: '2rem', 
      backgroundColor: 'blue', 
      color: 'white',
      borderRadius: '8px',
      maxWidth: '500px',
      margin: '2rem auto',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Simple Test Component</h1>
      <p style={{ fontSize: '1.2rem' }}>If you can see this, React is rendering correctly!</p>
      <button 
        onClick={() => alert('Button clicked!')}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: 'white',
          color: 'blue',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Click Me
      </button>
    </div>
  );
};

export default SimpleTest; 