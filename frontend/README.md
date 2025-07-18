# Booktarr Frontend

A React-based frontend for the Booktarr personal book library management system, inspired by Sonarr's design.

## Features

- **Dark Theme**: Sonarr-inspired dark theme with professional aesthetics
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Book Management**: View and manage your personal book library
- **Search & Filter**: Find books quickly with advanced search and filtering
- **Series Organization**: Books organized by series with progress tracking
- **Author Management**: Browse books by author
- **Status Tracking**: Track book status (owned, wanted, missing, read)
- **Dynamic Theming**: CSS custom properties for easy theme customization

## Technologies Used

- **React 18** - Modern React with hooks and context
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling with custom theme
- **Craco** - Configuration override for Create React App
- **CSS Custom Properties** - Dynamic theming system

## Project Structure

```
frontend/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── favicon.ico
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── BookCard.tsx
│   │   ├── BookList.tsx
│   │   ├── SearchBar.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorMessage.tsx
│   │   ├── Toast.tsx
│   │   ├── SidebarNavigation.tsx
│   │   └── MainLayout.tsx
│   ├── context/            # React contexts
│   │   └── ThemeContext.tsx
│   ├── styles/             # Global styles
│   │   └── tailwind.css
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   ├── App.tsx
│   └── index.tsx
├── tailwind.config.js
├── craco.config.js
├── postcss.config.js
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run lint` - Runs ESLint on the codebase
- `npm run format` - Formats code with Prettier

## Theme System

The frontend uses a sophisticated theming system based on CSS custom properties:

### Color Variables

```css
:root {
  --booktarr-bg: #1e1e1e;          /* Main background */
  --booktarr-surface: #252525;      /* Card backgrounds */
  --booktarr-text: #ffffff;         /* Primary text */
  --booktarr-accent: #f39c12;       /* Orange accent */
  /* ... more variables */
}
```

### Component Classes

- `booktarr-card` - Standard card component
- `booktarr-btn` - Button variants (primary, secondary, ghost, danger)
- `booktarr-input` - Form inputs
- `booktarr-book-grid` - Book grid layout
- `booktarr-sidebar` - Navigation sidebar

## Components

### BookCard
Displays individual book information with cover, title, author, and status.

### BookList
Displays a collection of books in grid or list view with sorting and filtering.

### SearchBar
Search input with suggestions and filter toggle.

### MainLayout
Main application layout with sidebar navigation and header.

### ThemeProvider
React context provider for theme management.

## Development

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks
- Implement proper error boundaries
- Use semantic HTML elements

### Styling Guidelines

- Use Tailwind utility classes
- Leverage CSS custom properties for theming
- Follow the established design system
- Ensure responsive design
- Maintain accessibility standards

### Component Development

1. Create TypeScript interfaces for props
2. Use proper prop validation
3. Implement loading and error states
4. Add accessibility attributes
5. Include hover and focus states

## Future Enhancements

- Backend API integration
- PWA features (offline support, push notifications)
- Advanced search and filtering
- Book barcode scanning
- Export/import functionality
- Reading progress tracking
- Book recommendations
- Social features (sharing, reviews)

## Contributing

1. Follow the existing code style
2. Write TypeScript interfaces for new components
3. Test components thoroughly
4. Ensure responsive design
5. Update documentation as needed

## License

This project is part of the Booktarr personal book library management system.