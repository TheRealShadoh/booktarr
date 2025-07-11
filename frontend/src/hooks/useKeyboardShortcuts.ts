/**
 * Hook for keyboard shortcuts and undo/redo functionality
 * Provides global keyboard navigation and actions
 */
import { useEffect, useCallback } from 'react';
import { useAppContext, CurrentPage } from '../context/AppContext';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

export const useKeyboardShortcuts = () => {
  const { state, setCurrentPage, undo, redo, showToast } = useAppContext();

  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: 'l',
      ctrl: true,
      action: () => setCurrentPage('library'),
      description: 'Go to Library',
      preventDefault: true
    },
    {
      key: 's',
      ctrl: true,
      action: () => setCurrentPage('settings'),
      description: 'Go to Settings',
      preventDefault: true
    },
    {
      key: 'a',
      ctrl: true,
      action: () => setCurrentPage('add'),
      description: 'Go to Add Books',
      preventDefault: true
    },
    {
      key: 'r',
      ctrl: true,
      action: () => setCurrentPage('series'),
      description: 'Go to Series',
      preventDefault: true
    },
    {
      key: 'u',
      ctrl: true,
      action: () => setCurrentPage('authors'),
      description: 'Go to Authors',
      preventDefault: true
    },
    {
      key: 't',
      ctrl: true,
      action: () => setCurrentPage('stats'),
      description: 'Go to Statistics',
      preventDefault: true
    },
    {
      key: 'b',
      ctrl: true,
      action: () => setCurrentPage('backup'),
      description: 'Go to Backup & Restore',
      preventDefault: true
    },
    
    // Undo/Redo shortcuts
    {
      key: 'z',
      ctrl: true,
      action: () => {
        if (state.canUndo) {
          undo();
          showToast('Action undone', 'info');
        }
      },
      description: 'Undo last action',
      preventDefault: true
    },
    {
      key: 'y',
      ctrl: true,
      action: () => {
        if (state.canRedo) {
          redo();
          showToast('Action redone', 'info');
        }
      },
      description: 'Redo last action',
      preventDefault: true
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      action: () => {
        if (state.canRedo) {
          redo();
          showToast('Action redone', 'info');
        }
      },
      description: 'Redo last action (alternative)',
      preventDefault: true
    },
    
    // Search shortcuts
    {
      key: 'f',
      ctrl: true,
      action: () => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus search input',
      preventDefault: true
    },
    {
      key: 'Escape',
      action: () => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput && searchInput === document.activeElement) {
          searchInput.blur();
          searchInput.value = '';
          // Trigger change event to clear search
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      },
      description: 'Clear search and blur input',
      preventDefault: false
    },
    
    // Quick actions
    {
      key: 'n',
      ctrl: true,
      action: () => {
        setCurrentPage('add');
        // Focus the search input after navigation
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="book title"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }, 100);
      },
      description: 'New book (go to add page)',
      preventDefault: true
    },
    
    // Help shortcut
    {
      key: '?',
      shift: true,
      action: () => {
        showShortcutsHelp();
      },
      description: 'Show keyboard shortcuts help',
      preventDefault: true
    }
  ];

  const showShortcutsHelp = useCallback(() => {
    const helpText = shortcuts
      .map(shortcut => {
        const keys = [];
        if (shortcut.ctrl) keys.push('Ctrl');
        if (shortcut.alt) keys.push('Alt');
        if (shortcut.shift) keys.push('Shift');
        if (shortcut.meta) keys.push('Cmd');
        keys.push(shortcut.key.toUpperCase());
        
        return `${keys.join(' + ')}: ${shortcut.description}`;
      })
      .join('\n');
    
    // Create modal or use existing toast system
    showToast(`Keyboard Shortcuts:\n${helpText}`, 'info');
  }, [shortcuts, showToast]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle shortcuts if user is typing in an input (except for specific cases)
    const activeElement = document.activeElement;
    const isInputActive = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      activeElement.getAttribute('contenteditable') === 'true'
    );

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
      const keyMatch = event.key && event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && altMatch && shiftMatch && metaMatch && keyMatch) {
        // Special handling for certain keys even when input is active
        const allowedKeysInInput = ['Escape', 'f'];
        
        if (isInputActive && !allowedKeysInInput.includes(shortcut.key)) {
          continue;
        }

        if (shortcut.preventDefault) {
          event.preventDefault();
        }
        
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts,
    showShortcutsHelp,
  };
};

export default useKeyboardShortcuts;