# Booktarr Theme Implementation Guide

This guide provides comprehensive instructions for recreating the Booktarr UI theme and styling system.

## Overview
Booktarr uses a Sonarr-inspired dark theme with a sophisticated theming system that supports multiple color schemes. The design emphasizes readability, visual hierarchy, and a professional media management aesthetic.

## Core Design Principles
1. **Dark-first design** with light theme support
2. **Consistent spacing** and visual rhythm
3. **Subtle animations** for enhanced UX
4. **Accessible color contrasts**
5. **Responsive from mobile to desktop**

## Theme Configuration

### CSS Variables System
The theme uses CSS custom properties for dynamic theming. Define these in your root CSS:

```css
:root[data-theme="dark"] {
  /* Background Colors */
  --booktarr-bg: #1e1e1e;          /* Main background */
  --booktarr-surface: #252525;      /* Card backgrounds */
  --booktarr-surface2: #2f2f2f;     /* Elevated surfaces */
  --booktarr-surface3: #3a3a3a;     /* Interactive elements */
  --booktarr-border: #3a3a3a;       /* Border color */
  
  /* Text Colors */
  --booktarr-text: #ffffff;         /* Primary text */
  --booktarr-textSecondary: #cccccc; /* Secondary text */
  --booktarr-textMuted: #999999;    /* Muted text */
  --booktarr-textDisabled: #666666; /* Disabled text */
  
  /* Accent & Status Colors */
  --booktarr-accent: #f39c12;       /* Orange primary accent */
  --booktarr-success: #27ae60;      /* Success green */
  --booktarr-warning: #f39c12;      /* Warning orange */
  --booktarr-error: #e74c3c;        /* Error red */
  --booktarr-info: #3498db;         /* Info blue */
  
  /* Semantic Colors */
  --booktarr-wanted: #e67e22;       /* Wanted items */
  --booktarr-monitored: #27ae60;    /* Monitored items */
  --booktarr-unmonitored: #95a5a6; /* Unmonitored items */
  
  /* Shadows */
  --booktarr-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  --booktarr-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --booktarr-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

### Typography
```css
/* Import Inter font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: var(--booktarr-text);
  background-color: var(--booktarr-bg);
}

/* Font sizes */
.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.875rem; }
.text-base { font-size: 1rem; }
.text-lg { font-size: 1.125rem; }
.text-xl { font-size: 1.25rem; }
.text-2xl { font-size: 1.5rem; }
.text-3xl { font-size: 1.875rem; }
.text-4xl { font-size: 2.25rem; }
```

## Component Styles

### Cards
```css
.booktarr-card {
  background-color: var(--booktarr-surface);
  border: 1px solid var(--booktarr-border);
  border-radius: 0.5rem;
  box-shadow: var(--booktarr-shadow);
  overflow: hidden;
  transition: all 0.2s ease;
}

.booktarr-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--booktarr-shadow-lg);
}

.booktarr-card-header {
  background: linear-gradient(to right, var(--booktarr-surface2), var(--booktarr-surface));
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--booktarr-border);
}

.booktarr-card-body {
  padding: 1.5rem;
}
```

### Buttons
```css
.booktarr-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-weight: 500;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  gap: 0.5rem;
}

.booktarr-btn-primary {
  background-color: var(--booktarr-accent);
  color: white;
}

.booktarr-btn-primary:hover {
  background-color: #e67e22;
  transform: translateY(-1px);
}

.booktarr-btn-secondary {
  background-color: var(--booktarr-surface2);
  color: var(--booktarr-text);
  border: 1px solid var(--booktarr-border);
}

.booktarr-btn-ghost {
  background-color: transparent;
  color: var(--booktarr-textSecondary);
}

.booktarr-btn-ghost:hover {
  background-color: var(--booktarr-surface2);
  color: var(--booktarr-text);
}
```

### Form Elements
```css
.booktarr-form-input {
  width: 100%;
  padding: 0.5rem 1rem;
  background-color: var(--booktarr-surface2);
  border: 1px solid var(--booktarr-border);
  border-radius: 0.375rem;
  color: var(--booktarr-text);
  transition: all 0.2s ease;
}

.booktarr-form-input:focus {
  outline: none;
  border-color: var(--booktarr-accent);
  box-shadow: 0 0 0 3px rgba(243, 156, 18, 0.1);
}

.booktarr-form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--booktarr-textSecondary);
}
```

### Navigation Sidebar
```css
.booktarr-sidebar {
  width: 250px;
  background-color: var(--booktarr-surface);
  border-right: 1px solid var(--booktarr-border);
  height: 100vh;
  overflow-y: auto;
}

.booktarr-sidebar-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: var(--booktarr-textSecondary);
  text-decoration: none;
  transition: all 0.2s ease;
  gap: 0.75rem;
}

.booktarr-sidebar-item:hover {
  background-color: var(--booktarr-surface2);
  color: var(--booktarr-text);
}

.booktarr-sidebar-item.active {
  background-color: var(--booktarr-accent);
  color: white;
}
```

### Book Grid & Cards
```css
.booktarr-book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
}

@media (min-width: 768px) {
  .booktarr-book-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (min-width: 1024px) {
  .booktarr-book-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

.booktarr-book-card {
  position: relative;
  aspect-ratio: 2/3;
  overflow: hidden;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.booktarr-book-card:hover {
  transform: scale(1.05);
  box-shadow: var(--booktarr-shadow-lg);
}

.booktarr-book-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Missing book cover effect */
.booktarr-book-card.missing img {
  filter: grayscale(100%) opacity(0.5);
}
```

### Status Badges
```css
.booktarr-status-indicator {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  gap: 0.375rem;
}

.booktarr-status-success {
  background-color: rgba(39, 174, 96, 0.1);
  color: var(--booktarr-success);
  border: 1px solid rgba(39, 174, 96, 0.2);
}

.booktarr-status-warning {
  background-color: rgba(243, 156, 18, 0.1);
  color: var(--booktarr-warning);
  border: 1px solid rgba(243, 156, 18, 0.2);
}

.booktarr-status-error {
  background-color: rgba(231, 76, 60, 0.1);
  color: var(--booktarr-error);
  border: 1px solid rgba(231, 76, 60, 0.2);
}
```

## Icons
The application uses custom SVG icons with consistent styling:

```jsx
// Example icon component structure
<svg 
  className="w-6 h-6" 
  fill="none" 
  stroke="currentColor" 
  viewBox="0 0 24 24" 
  strokeWidth={2}
>
  <path strokeLinecap="round" strokeLinejoin="round" d="..." />
</svg>
```

Common icons needed:
- **Book**: Open book icon for library
- **Series**: Stack/collection icon
- **Authors**: User/person icon
- **Settings**: Gear/cog icon
- **Search**: Magnifying glass
- **Add**: Plus circle
- **Remove**: X or trash icon
- **Sync**: Refresh/arrows icon
- **Export/Import**: Download/upload arrows
- **Camera**: For barcode scanner
- **Check**: Checkmark for success
- **Warning**: Triangle exclamation
- **Info**: Information circle

## Animations
```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { 
    transform: translateY(10px);
    opacity: 0;
  }
  to { 
    transform: translateY(0);
    opacity: 1;
  }
}

/* Scale in */
@keyframes scaleIn {
  from { 
    transform: scale(0.95);
    opacity: 0;
  }
  to { 
    transform: scale(1);
    opacity: 1;
  }
}

/* Apply animations */
.animate-fadeIn { animation: fadeIn 0.3s ease-out; }
.animate-slideUp { animation: slideUp 0.3s ease-out; }
.animate-scaleIn { animation: scaleIn 0.2s ease-out; }
```

## Responsive Breakpoints
```css
/* Mobile: < 640px */
/* Tablet: 640px - 1024px */
/* Desktop: > 1024px */

@media (max-width: 640px) {
  .booktarr-sidebar { width: 60px; }
  .booktarr-sidebar-item span { display: none; }
}
```

## Special Effects

### Glass Morphism (Optional)
```css
.glass-effect {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Loading States
```css
.booktarr-skeleton {
  background: linear-gradient(90deg, 
    var(--booktarr-surface2) 25%, 
    var(--booktarr-surface3) 50%, 
    var(--booktarr-surface2) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

## Implementation Notes

1. **Theme Context**: Implement a theme provider that manages theme state and applies the appropriate data-theme attribute to the root element.

2. **Color Consistency**: Always use CSS variables for colors to maintain theme consistency.

3. **Focus States**: Ensure all interactive elements have visible focus states using the accent color.

4. **Dark Mode First**: Design with dark mode as the default, then adapt for light themes.

5. **Contrast Ratios**: Maintain WCAG AA compliance for text contrast.

6. **Smooth Transitions**: Add subtle transitions to interactive elements for polished feel.

7. **Mobile Responsiveness**: Test thoroughly on mobile devices, especially the book grid and navigation.

## Component Structure
Each component should follow this pattern:
1. Semantic HTML structure
2. BEM-style class naming (booktarr-component-element)
3. CSS variables for theming
4. Responsive design considerations
5. Accessibility attributes (ARIA labels, roles)

This guide provides everything needed to recreate the Booktarr UI theme and maintain consistency across the application.