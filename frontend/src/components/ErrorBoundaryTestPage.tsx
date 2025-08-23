/**
 * Error Boundary Test Page
 * Comprehensive testing interface for error boundary functionality
 */
import React, { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import PageErrorBoundary from './PageErrorBoundary';
import ComponentErrorBoundary from './ComponentErrorBoundary';
import TestErrorComponent from './TestErrorComponent';

const ErrorBoundaryTestPage: React.FC = () => {
  const [testScenario, setTestScenario] = useState<string>('none');
  const [resetKey, setResetKey] = useState(0);

  const resetTests = () => {
    setResetKey(prev => prev + 1);
    setTestScenario('none');
  };

  const testScenarios = [
    { value: 'none', label: 'No Error', description: 'Normal operation' },
    { value: 'component-render', label: 'Component Render Error', description: 'Error thrown during component render' },
    { value: 'component-mount', label: 'Component Mount Error', description: 'Error thrown during component mount' },
    { value: 'component-click', label: 'Component Click Error', description: 'Error thrown on user interaction' },
    { value: 'page-level', label: 'Page Level Error', description: 'Error that affects entire page' },
    { value: 'nested-boundaries', label: 'Nested Boundaries', description: 'Test error boundaries within boundaries' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">Error Boundary Testing</h1>
        
        <p className="text-gray-300 mb-4">
          This page allows you to test the error boundary implementation by triggering different types of errors.
          Each test demonstrates how errors are caught and handled at different levels of the component hierarchy.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={resetTests}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            Reset All Tests
          </button>
          
          <span className="text-gray-400 px-4 py-2">
            Reset Key: {resetKey}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Scenario Selection */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Scenarios</h2>
          
          <div className="space-y-3">
            {testScenarios.map(scenario => (
              <label key={scenario.value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="testScenario"
                  value={scenario.value}
                  checked={testScenario === scenario.value}
                  onChange={(e) => setTestScenario(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">{scenario.label}</div>
                  <div className="text-gray-400 text-sm">{scenario.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Error Storage Info */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Error Storage</h2>
          
          <div className="space-y-3 text-sm">
            <div className="bg-gray-700 rounded p-3">
              <div className="text-yellow-400 font-medium mb-1">Session Storage</div>
              <div className="text-gray-300">
                Errors are stored in sessionStorage under 'booktarr_errors' key (last 10 errors)
              </div>
            </div>
            
            <div className="bg-gray-700 rounded p-3">
              <div className="text-blue-400 font-medium mb-1">Console Logging</div>
              <div className="text-gray-300">
                Detailed error information is logged to browser console with component stack traces
              </div>
            </div>
            
            <div className="bg-gray-700 rounded p-3">
              <div className="text-green-400 font-medium mb-1">Production Ready</div>
              <div className="text-gray-300">
                Error boundaries show user-friendly messages in production while maintaining debug info
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Components */}
      <div className="mt-6 space-y-6">
        {/* Component Level Error Boundary Test */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Component Level Error Boundary</h2>
          
          <ComponentErrorBoundary 
            componentName="Test Error Component" 
            showMinimal={false}
            key={`component-${resetKey}`}
          >
            {testScenario === 'component-render' && (
              <TestErrorComponent 
                throwOnRender={true} 
                errorMessage="Component render error test"
              />
            )}
            {testScenario === 'component-mount' && (
              <TestErrorComponent 
                throwOnMount={true} 
                errorMessage="Component mount error test"
              />
            )}
            {(testScenario === 'component-click' || testScenario === 'none') && (
              <TestErrorComponent 
                throwOnClick={testScenario === 'component-click'} 
                errorMessage="Component click error test"
              />
            )}
          </ComponentErrorBoundary>
        </div>

        {/* Page Level Error Boundary Test */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Page Level Error Boundary</h2>
          
          <PageErrorBoundary 
            pageName="Error Test Page"
            key={`page-${resetKey}`}
          >
            {testScenario === 'page-level' && (
              <TestErrorComponent 
                throwOnRender={true} 
                errorMessage="Page level error test"
              />
            )}
            {testScenario !== 'page-level' && (
              <div className="bg-green-900/20 border border-green-500/30 rounded p-4">
                <p className="text-green-400">Page content loads normally when no errors occur</p>
              </div>
            )}
          </PageErrorBoundary>
        </div>

        {/* Nested Error Boundaries Test */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Nested Error Boundaries</h2>
          
          <ErrorBoundary name="Outer-Boundary" key={`nested-outer-${resetKey}`}>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded p-4 mb-4">
              <p className="text-blue-400 mb-2">Outer Error Boundary</p>
              
              <ComponentErrorBoundary 
                componentName="Inner Test Component" 
                showMinimal={true}
                key={`nested-inner-${resetKey}`}
              >
                <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3">
                  <p className="text-purple-400 mb-2">Inner Error Boundary</p>
                  
                  {testScenario === 'nested-boundaries' && (
                    <TestErrorComponent 
                      throwOnRender={true} 
                      errorMessage="Nested boundary error test"
                    />
                  )}
                  {testScenario !== 'nested-boundaries' && (
                    <p className="text-purple-200 text-sm">
                      Inner component working normally. Select "Nested Boundaries" test to trigger error.
                    </p>
                  )}
                </div>
              </ComponentErrorBoundary>
            </div>
          </ErrorBoundary>
        </div>

        {/* Error Recovery Instructions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Error Recovery Testing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-yellow-400 font-medium mb-2">Try Again</h3>
              <p className="text-gray-300">
                Tests component recovery by resetting the error boundary and re-rendering the failed component.
              </p>
            </div>
            
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-blue-400 font-medium mb-2">Go Back</h3>
              <p className="text-gray-300">
                Tests navigation recovery by providing users a way to navigate away from the broken component.
              </p>
            </div>
            
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-red-400 font-medium mb-2">Reload Page</h3>
              <p className="text-gray-300">
                Tests full page recovery as a last resort when component-level recovery fails.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundaryTestPage;