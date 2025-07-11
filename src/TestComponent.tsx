// Test to check if the JSX structure is valid
import React from 'react';

const TestComponent = () => {
  const mode = 'hosting';
  
  return (
    <div>
      <main>
        {mode === 'hosting' && (
          <div>
            <div>
              <h2>Test</h2>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TestComponent;
