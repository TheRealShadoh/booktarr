/**
 * Test Component for Error Boundary Testing
 * This component can intentionally throw errors to test error boundary functionality
 */
import React, { useState } from 'react';

interface TestErrorComponentProps {
  throwOnMount?: boolean;
  throwOnClick?: boolean;
  throwOnRender?: boolean;
  errorMessage?: string;
}

const TestErrorComponent: React.FC<TestErrorComponentProps> = ({
  throwOnMount = false,
  throwOnClick = false,
  throwOnRender = false,
  errorMessage = 'Test error thrown by TestErrorComponent'
}) => {
  const [shouldThrow, setShouldThrow] = useState(false);

  // Throw error on mount if requested
  React.useEffect(() => {
    if (throwOnMount) {
      throw new Error(errorMessage + ' (on mount)');
    }
  }, [throwOnMount, errorMessage]);

  // Throw error on render if requested
  if (throwOnRender || shouldThrow) {
    throw new Error(errorMessage + ' (on render)');
  }

  const handleClick = () => {
    if (throwOnClick) {
      throw new Error(errorMessage + ' (on click)');
    }
    setShouldThrow(true);
  };

  const handleAsyncError = async () => {
    // This will not be caught by error boundaries (async errors aren't caught)
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error(errorMessage + ' (async - not caught by boundary)');
  };

  return (
    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 m-4">
      <h3 className="text-yellow-400 font-semibold mb-3">Error Boundary Test Component</h3>
      
      <div className="space-y-2">
        <button
          onClick={handleClick}
          className="block w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm"
        >
          Throw Synchronous Error (Will be caught)
        </button>
        
        <button
          onClick={handleAsyncError}
          className="block w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors text-sm"
        >
          Throw Async Error (Will NOT be caught)
        </button>
      </div>
      
      <div className="mt-4 text-xs text-gray-400">
        <p>Props:</p>
        <ul className="list-disc list-inside">
          <li>throwOnMount: {throwOnMount ? 'true' : 'false'}</li>
          <li>throwOnClick: {throwOnClick ? 'true' : 'false'}</li>
          <li>throwOnRender: {throwOnRender ? 'true' : 'false'}</li>
        </ul>
      </div>
    </div>
  );
};

export default TestErrorComponent;