/**
 * Touch-friendly form components
 * Enhanced form inputs optimized for mobile interaction
 */
import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { isTouchDevice } from '../hooks/useSwipeGestures';

interface TouchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  touchOptimized?: boolean;
}

interface TouchTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  clearable?: boolean;
  onClear?: () => void;
  autoResize?: boolean;
  touchOptimized?: boolean;
}

interface TouchSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  touchOptimized?: boolean;
}

interface TouchCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  touchOptimized?: boolean;
}

interface TouchFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  touchOptimized?: boolean;
}

// Touch-optimized Input component
export const TouchInput = forwardRef<HTMLInputElement, TouchInputProps>(({
  label,
  error,
  hint,
  icon,
  clearable = false,
  onClear,
  touchOptimized = true,
  className = "",
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(e.target.value.length > 0);
    props.onChange?.(e);
  };

  const handleClear = () => {
    setHasValue(false);
    onClear?.();
  };

  const inputClasses = `
    w-full px-4 py-3 text-base border rounded-xl
    bg-booktarr-surface text-booktarr-text
    border-booktarr-border focus:border-booktarr-accent
    focus:outline-none focus:ring-2 focus:ring-booktarr-accent focus:ring-opacity-20
    transition-all duration-200
    ${touchOptimized && isTouchDevice() ? 'min-h-[48px] text-lg' : 'min-h-[40px]'}
    ${icon ? 'pl-12' : ''}
    ${clearable && hasValue ? 'pr-12' : ''}
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    ${isFocused ? 'ring-2' : ''}
    ${className}
  `;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-booktarr-text">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-booktarr-textMuted">
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          {...props}
          onChange={handleChange}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={inputClasses}
        />
        
        {clearable && hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-booktarr-textMuted hover:text-booktarr-text transition-colors touch-target"
            aria-label="Clear input"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-500 flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </p>
      )}
      
      {hint && !error && (
        <p className="text-sm text-booktarr-textSecondary">{hint}</p>
      )}
    </div>
  );
});

TouchInput.displayName = 'TouchInput';

// Touch-optimized Textarea component
export const TouchTextarea = forwardRef<HTMLTextAreaElement, TouchTextareaProps>(({
  label,
  error,
  hint,
  clearable = false,
  onClear,
  autoResize = true,
  touchOptimized = true,
  className = "",
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHasValue(e.target.value.length > 0);
    
    // Auto-resize
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
    
    props.onChange?.(e);
  };

  const handleClear = () => {
    setHasValue(false);
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onClear?.();
  };

  const textareaClasses = `
    w-full px-4 py-3 text-base border rounded-xl
    bg-booktarr-surface text-booktarr-text
    border-booktarr-border focus:border-booktarr-accent
    focus:outline-none focus:ring-2 focus:ring-booktarr-accent focus:ring-opacity-20
    transition-all duration-200 resize-none
    ${touchOptimized && isTouchDevice() ? 'min-h-[96px] text-lg' : 'min-h-[80px]'}
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    ${isFocused ? 'ring-2' : ''}
    ${className}
  `;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-booktarr-text">
          {label}
        </label>
      )}
      
      <div className="relative">
        <textarea
          ref={(node) => {
            textareaRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          {...props}
          onChange={handleChange}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={textareaClasses}
        />
        
        {clearable && hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-3 p-1 text-booktarr-textMuted hover:text-booktarr-text transition-colors touch-target"
            aria-label="Clear textarea"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-500 flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </p>
      )}
      
      {hint && !error && (
        <p className="text-sm text-booktarr-textSecondary">{hint}</p>
      )}
    </div>
  );
});

TouchTextarea.displayName = 'TouchTextarea';

// Touch-optimized Select component
export const TouchSelect = forwardRef<HTMLSelectElement, TouchSelectProps>(({
  label,
  error,
  hint,
  options,
  placeholder,
  touchOptimized = true,
  className = "",
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const selectClasses = `
    w-full px-4 py-3 text-base border rounded-xl appearance-none
    bg-booktarr-surface text-booktarr-text
    border-booktarr-border focus:border-booktarr-accent
    focus:outline-none focus:ring-2 focus:ring-booktarr-accent focus:ring-opacity-20
    transition-all duration-200 cursor-pointer
    ${touchOptimized && isTouchDevice() ? 'min-h-[48px] text-lg' : 'min-h-[40px]'}
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    ${isFocused ? 'ring-2' : ''}
    ${className}
  `;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-booktarr-text">
          {label}
        </label>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          {...props}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={selectClasses}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-500 flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </p>
      )}
      
      {hint && !error && (
        <p className="text-sm text-booktarr-textSecondary">{hint}</p>
      )}
    </div>
  );
});

TouchSelect.displayName = 'TouchSelect';

// Touch-optimized Checkbox component
export const TouchCheckbox = forwardRef<HTMLInputElement, TouchCheckboxProps>(({
  label,
  description,
  error,
  touchOptimized = true,
  className = "",
  ...props
}, ref) => {
  const checkboxId = `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  const checkboxClasses = `
    w-5 h-5 text-booktarr-accent border-2 border-booktarr-border rounded
    focus:ring-2 focus:ring-booktarr-accent focus:ring-opacity-20
    bg-booktarr-surface
    ${touchOptimized && isTouchDevice() ? 'w-6 h-6' : ''}
    ${error ? 'border-red-500' : ''}
  `;

  const labelClasses = `
    flex items-start space-x-3 cursor-pointer
    ${touchOptimized && isTouchDevice() ? 'p-2 -m-2 touch-target' : ''}
  `;

  return (
    <div className="space-y-1">
      <label htmlFor={checkboxId} className={labelClasses}>
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          className={`${checkboxClasses} ${className}`}
          {...props}
        />
        <div className="flex-1">
          {label && (
            <span className="text-sm font-medium text-booktarr-text">
              {label}
            </span>
          )}
          {description && (
            <p className="text-sm text-booktarr-textSecondary mt-1">
              {description}
            </p>
          )}
        </div>
      </label>
      
      {error && (
        <p className="text-sm text-red-500 flex items-center space-x-1 ml-8">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

TouchCheckbox.displayName = 'TouchCheckbox';

// Touch-optimized Form wrapper
export const TouchForm: React.FC<TouchFormProps> = ({
  children,
  onSubmit,
  className = "",
  touchOptimized = true
}) => {
  const formClasses = `
    ${touchOptimized && isTouchDevice() ? 'space-y-6' : 'space-y-4'}
    ${className}
  `;

  return (
    <form onSubmit={onSubmit} className={formClasses}>
      {children}
    </form>
  );
};

// Touch-optimized Submit Button
interface TouchSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  touchOptimized?: boolean;
}

export const TouchSubmit: React.FC<TouchSubmitProps> = ({
  children,
  loading = false,
  loadingText = "Submitting...",
  touchOptimized = true,
  className = "",
  disabled,
  ...props
}) => {
  const buttonClasses = `
    w-full py-3 px-6 text-base font-semibold rounded-xl
    bg-booktarr-accent hover:bg-booktarr-accent-dark
    text-white transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-booktarr-accent focus:ring-opacity-50
    disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center space-x-2
    ${touchOptimized && isTouchDevice() ? 'min-h-[52px] text-lg' : 'min-h-[44px]'}
    ${className}
  `;

  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={buttonClasses}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
};

// Export all components as default
export default {
  TouchForm,
  TouchInput,
  TouchTextarea,
  TouchSelect,
  TouchCheckbox,
  TouchSubmit
};