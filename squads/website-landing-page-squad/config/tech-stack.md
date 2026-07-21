# Tech Stack - Website Landing Page Squad

## Frontend Stack

### Core
- **React** 19.x
- **TypeScript** 5.x
- **Vite** 5.x (build tool)
- **Node.js** 18+ (runtime)

### Styling & UI
- **TailwindCSS** 3.x
- **PostCSS** for processing
- **Headless UI** for unstyled components
- **Radix UI** for accessible primitives

### Routing & Navigation
- **React Router** v7

### State Management
- React Context API (built-in)
- localStorage for client-side persistence

### Forms & Validation
- **React Hook Form** for efficient form handling
- **Zod** for runtime type validation
- **Field-level and form-level** validation

### Performance & Optimization
- **Image optimization** (next/image patterns)
- **Code splitting** via Vite
- **Tree-shaking** for bundle size
- **Core Web Vitals** optimization
- **Lazy loading** for off-screen content

### Testing
- **Vitest** - Unit and integration tests
- **React Testing Library** - Component testing
- **JSDOM** - DOM simulation
- **Playwright** - E2E testing

### Development Tools
- **ESLint** for code quality
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Source maps** for debugging

## Backend Stack

### Core
- **Node.js** 18+ runtime
- **TypeScript** 5.x
- **Express.js** or **Hono** (optional for HTTP)

### Database
- **Supabase** (PostgreSQL wrapper)
- **PostgreSQL** 14+ (underlying DB)
- **Supabase Client** for queries
- **Migrations** via SQL scripts

### Authentication
- **Supabase Auth**
- **JWT** for session management
- **OAuth** support (Google, GitHub, etc.)

### APIs & Integration
- **REST APIs** for lead capture
- **Webhook handling** for external services
- **Email integration** (SendGrid, Mailchimp)
- **Payment processing** (Stripe API)

### Environment & Configuration
- **.env.local** for secrets
- Environment variable management
- Type-safe config via TypeScript

## Design & Prototyping

### Design Tools
- **Figma** for design and prototyping
- **Design tokens** for consistency
- **Component library** documentation

### Design System
- **Atomic Design** methodology
- **Component hierarchy** (atoms, molecules, organisms)
- **Design tokens** (colors, typography, spacing)
- **Accessibility** guidelines (WCAG 2.1 AA)

## DevOps & Deployment

### Version Control
- **Git** for source control
- **GitHub** for repository hosting

### CI/CD
- **GitHub Actions** for automated testing
- **Automated deployments** on merge

### Hosting
- **Vercel** (recommended for React/Vite)
- **Netlify** (alternative)
- **Self-hosted** on VPS (if needed)

### Database Hosting
- **Supabase Cloud** (recommended)
- **Self-hosted PostgreSQL** (alternative)

### CDN & Static Assets
- **Vercel Edge Network** or **Cloudflare**
- Image optimization and serving

## Analytics & Monitoring

### Frontend Analytics
- **Google Analytics 4**
- **Session recording** (Hotjar, Microsoft Clarity)
- **Heatmap tracking** (Hotjar, Microsoft Clarity)
- **Event tracking** for conversions

### Performance Monitoring
- **Google Lighthouse** (local and CI)
- **Web Vitals** tracking
- **Error tracking** (optional: Sentry)

### SEO Tools
- **Google Search Console**
- **Google PageSpeed Insights**
- **Schema markup validation**

## Email & Communication

### Email Services
- **Mailchimp** (email marketing)
- **SendGrid** (transactional email)
- **Resend** (React-friendly email)

### Webhooks & Integration
- **Zapier** for no-code integrations
- **Make** (formerly Integromat)
- **Custom webhooks** for direct integration

## Development Environment

### Editor
- **VS Code** (recommended)
- **TypeScript support** built-in
- **Extensions for React, TailwindCSS**

### Package Manager
- **npm** (included with Node.js)
- **pnpm** or **yarn** (alternatives)

### Scripts & Commands

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "lint": "eslint src",
  "format": "prettier --write 'src/**/*.{ts,tsx,css}'",
  "type-check": "tsc --noEmit"
}
```

## Coding Standards

See `coding-standards.md` for:
- File naming conventions
- Component structure
- Naming conventions
- Code organization
- Git workflow

## Browser Support

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+
- **Mobile browsers** (latest versions)

## Performance Targets

- **Lighthouse Score**: 90+
- **Core Web Vitals**:
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1
- **Bundle Size**: < 100KB gzipped
- **Time to Interactive**: < 3.5s on 4G

## Dependencies Management

### Security
- **npm audit** for vulnerability scanning
- **Dependabot** for automatic updates
- **SNYK** for continuous security monitoring

### Maintenance
- **Keep dependencies updated**
- **Regular vulnerability scans**
- **Test coverage before updates**
- **Semantic versioning** adherence

## Additional Tools

### Documentation
- **Storybook** for component documentation
- **Typedoc** for API documentation
- **Markdown** for guides and docs

### Code Quality
- **SonarQube** (optional for enterprise)
- **CodeClimate** (optional)

### Accessibility
- **axe DevTools** for automated accessibility testing
- **Lighthouse** for accessibility scoring
- **Manual testing** with screen readers
