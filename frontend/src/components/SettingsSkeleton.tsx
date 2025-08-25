/**
 * Skeleton loading component for settings page
 * Provides visual feedback during settings loading
 */
import React from 'react';

const SettingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-8" data-testid="settings-skeleton">
      {/* Settings sections */}
      {Array.from({ length: 4 }, (_, sectionIndex) => (
        <div key={`settings-section-${sectionIndex}`} className="space-y-6">
          {/* Section header */}
          <div className="border-b border-booktarr-border pb-3">
            <div className="h-6 bg-gray-300 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded w-96 mt-2 animate-pulse"></div>
          </div>

          {/* Settings items */}
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, itemIndex) => (
              <div 
                key={`settings-item-${sectionIndex}-${itemIndex}`}
                className="flex items-start justify-between py-4 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-300 rounded w-64 animate-pulse"></div>
                  <div className="h-3 bg-gray-300 rounded w-80 animate-pulse"></div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Toggle or input field */}
                  {itemIndex % 2 === 0 ? (
                    <div className="w-12 h-6 bg-gray-300 rounded-full animate-pulse"></div>
                  ) : (
                    <div className="w-32 h-8 bg-gray-300 rounded animate-pulse"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Action buttons */}
      <div className="flex justify-between pt-6 border-t border-booktarr-border">
        <div className="flex space-x-3">
          <div className="w-24 h-10 bg-gray-300 rounded animate-pulse"></div>
          <div className="w-28 h-10 bg-gray-300 rounded animate-pulse"></div>
        </div>
        <div className="flex space-x-3">
          <div className="w-20 h-10 bg-gray-300 rounded animate-pulse"></div>
          <div className="w-16 h-10 bg-gray-300 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default SettingsSkeleton;