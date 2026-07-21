# Coding Standards - Website Landing Page Squad

## General Principles

1. **Clarity > Cleverness** - Write code that's easy to understand
2. **Type Safety** - Always use TypeScript, avoid `any`
3. **Testability** - Write code that's easy to test
4. **Accessibility** - WCAG 2.1 AA compliance by default
5. **Performance** - Consider performance in every decision
6. **Security** - Never trust user input, always validate

## File & Folder Structure

### React Components
```
src/
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Form.tsx
│   │   └── Modal.tsx
│   ├── sections/           # Landing page sections
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Pricing.tsx
│   │   ├── Testimonials.tsx
│   │   └── CTA.tsx
│   ├── layout/             # Layout components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Navigation.tsx
│   └── pages/              # Page components
│       ├── LandingPage.tsx
│       └── ThankYouPage.tsx
├── hooks/                  # Custom React hooks
│   ├── useForm.ts
│   ├── useLocalStorage.ts
│   └── useAnalytics.ts
├── services/               # Business logic
│   ├── apiService.ts
│   ├── leadService.ts
│   ├── emailService.ts
│   └── analyticsService.ts
├── utils/                  # Utility functions
│   ├── validation.ts
│   ├── formatting.ts
│   ├── constants.ts
│   └── helpers.ts
├── styles/                 # Global styles
│   ├── globals.css
│   └── tailwind.config.ts
├── types/                  # TypeScript interfaces
│   ├── lead.ts
│   ├── form.ts
│   └── api.ts
└── App.tsx                 # Root component
```

## Naming Conventions

### Files & Folders
- **Components**: PascalCase (e.g., `HeroSection.tsx`)
- **Hooks**: camelCase, prefix with `use` (e.g., `useForm.ts`)
- **Utils/Services**: camelCase (e.g., `apiService.ts`)
- **Types/Interfaces**: PascalCase (e.g., `Lead.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- **Folders**: kebab-case (e.g., `ui-components/`)

### Variables & Functions
- **Variables**: camelCase (e.g., `leadFormData`)
- **Functions**: camelCase (e.g., `validateEmail()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FORM_SIZE`)
- **React Components**: PascalCase (e.g., `HeroSection`)
- **Boolean variables**: prefix with `is`, `has`, `can` (e.g., `isLoading`, `hasError`)

## React Component Standards

### Component Structure
```typescript
import React from 'react';
import { someService } from '@services/someService';
import { SomeType } from '@types/SomeType';
import { SomeComponent } from './SomeComponent';
import styles from './SomeComponent.module.css';

interface SomeComponentProps {
  title: string;
  onSubmit: (data: SomeType) => void;
  optional?: string;
}

export const SomeComponent: React.FC<SomeComponentProps> = ({
  title,
  onSubmit,
  optional = 'default',
}) => {
  const [state, setState] = React.useState<string>('');

  const handleClick = () => {
    // logic
  };

  return (
    <div className="container">
      <h1>{title}</h1>
      {/* JSX */}
    </div>
  );
};
```

### Component Best Practices
- Keep components focused and single-responsibility
- Extract logic to custom hooks
- Use meaningful prop names
- Document complex logic with comments
- Memoize expensive calculations
- Use `React.memo` for expensive re-render prevention
- Keep component files under 300 lines

### Props Typing
```typescript
interface ButtonProps {
  // Required props first
  onClick: () => void;
  children: React.ReactNode;

  // Optional props with defaults
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}) => {
  // component
};
```

## TypeScript Standards

### Type Safety
```typescript
// Good: Explicit types
const userId: number = 123;
const user: User = { id: 123, name: 'John' };
const users: User[] = [];

// Bad: Using `any`
const user: any = {};
const data: any = fetchData();

// Good: Generic constraints
function getValue<T extends object>(obj: T, key: keyof T): T[key] {
  return obj[key];
}

// Bad: Unconstrained generics
function getValue<T>(obj: T, key: string): T {
  return (obj as any)[key];
}
```

### Interfaces vs Types
- Use `interface` for object shapes (especially exported types)
- Use `type` for unions, primitives, and mapped types
```typescript
// Interface: extensible, good for APIs
interface User {
  id: number;
  name: string;
}

interface AdminUser extends User {
  adminLevel: number;
}

// Type: precise unions and combinations
type Status = 'pending' | 'approved' | 'rejected';
type ApiResponse<T> = { data: T } | { error: string };
```

## Form Handling Standards

### Form Validation
```typescript
import { z } from 'zod';

const leadSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'Name too short'),
  phone: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

// Validation
const result = leadSchema.safeParse(formData);
if (!result.success) {
  console.error(result.error.errors);
}
```

### Form Component Template
```typescript
interface ContactFormProps {
  onSubmit: (data: LeadFormData) => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ onSubmit }) => {
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const result = leadSchema.safeParse(data);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(result.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

## Testing Standards

### Test File Location
- Component tests: `SomeComponent.test.tsx` (same folder as component)
- Hook tests: `useForm.test.ts` (same folder as hook)
- Service tests: `apiService.test.ts` (same folder as service)

### Test Structure
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('should render button with children', () => {
    render(<Button onClick={jest.fn()}>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <Button onClick={jest.fn()} disabled>
        Click me
      </Button>
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Coverage Targets
- **Minimum coverage**: 80%
- **Critical paths**: 100%
- **UI components**: 90%+
- **Services/Utils**: 100%

## CSS & Styling Standards

### TailwindCSS Usage
```typescript
// Good: Utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-lg font-semibold text-gray-900">Title</h2>
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Action
  </button>
</div>

// Bad: Mixing with custom CSS
<div className="custom-container" style={{ padding: '16px' }}>
  {/* avoid inline styles */}
</div>

// Good: Custom CSS for complex styles
/* styles/custom.css */
.custom-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

<div className="custom-gradient">
  {/* use custom CSS when Tailwind isn't sufficient */}
</div>
```

### Design Tokens
```typescript
// colors.ts
export const COLORS = {
  primary: 'rgb(59, 130, 246)',    // blue-500
  secondary: 'rgb(107, 114, 128)',  // gray-500
  success: 'rgb(34, 197, 94)',      // green-500
  danger: 'rgb(239, 68, 68)',       // red-500
  white: 'rgb(255, 255, 255)',
  black: 'rgb(0, 0, 0)',
};

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};
```

## API & Service Standards

### API Service Template
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const apiService = {
  async post<T = unknown>(
    endpoint: string,
    data: unknown,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  },

  async get<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    return response.json();
  },
};
```

## Accessibility Standards

### WCAG 2.1 AA Compliance
- Semantic HTML: Use proper heading hierarchy, list elements, etc.
- ARIA labels: `aria-label`, `aria-describedby` where needed
- Keyboard navigation: All interactive elements accessible via keyboard
- Color contrast: Minimum 4.5:1 for text, 3:1 for UI components
- Focus management: Visible focus indicators on interactive elements

### Accessible Component Example
```typescript
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  ariaLabel,
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="px-4 py-2 bg-blue-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      {children}
    </button>
  );
};
```

## Git & Version Control

### Commit Messages
```
feat: add hero section component
fix: correct email validation regex
docs: update README with setup instructions
style: format code with prettier
refactor: extract form validation logic
test: add tests for lead capture

Format: <type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
Scope: (optional) component, service, hook, etc.
Description: lowercase, no period, imperative mood
```

### Branch Naming
- Feature: `feature/hero-section`
- Fix: `fix/email-validation`
- Refactor: `refactor/form-logic`
- Docs: `docs/readme-update`

## Documentation

### Code Comments
- Write self-documenting code first
- Comment the "why", not the "what"
- Use JSDoc for public APIs

```typescript
/**
 * Validates email format and checks if it exists in the database
 * @param email - Email address to validate
 * @returns true if email is valid and unique, false otherwise
 */
function validateEmail(email: string): boolean {
  // Complex validation logic
}
```

### README Requirements
- Installation instructions
- Environment setup
- Running development server
- Building for production
- Available scripts
- Project structure
- Tech stack overview
- Contribution guidelines

## Performance Standards

### Bundle Size Targets
- Total bundle: < 100KB gzipped
- Main chunk: < 50KB gzipped
- Consider impact before adding dependencies

### Core Web Vitals Targets
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Optimization Practices
- Code splitting for route-based chunks
- Image optimization and lazy loading
- Tree-shaking and dead code elimination
- CSS purging with TailwindCSS
- Memoization for expensive operations
