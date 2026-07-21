# Source Tree Structure - Website Landing Page Squad

## Project Directory Structure

```
website-landing-page-squad/
├── squad.yaml                      # Squad configuration
├── README.md                       # Squad overview and documentation
│
├── agents/                         # Agent definitions
│   ├── website-architect.md
│   ├── ux-designer.md
│   ├── copywriter.md
│   ├── seo-specialist.md
│   ├── frontend-developer.md
│   ├── backend-developer.md
│   ├── qa-analyst.md
│   ├── ux-researcher.md
│   └── storyteller.md
│
├── tasks/                          # Task definitions
│   ├── Architect Tasks
│   │   ├── architect-estrategia-landing.md
│   │   ├── architect-estrutura-site.md
│   │   └── architect-mapa-conversao.md
│   │
│   ├── Designer Tasks
│   │   ├── designer-prototipo-mobile.md
│   │   ├── designer-prototipo-desktop.md
│   │   ├── designer-design-system.md
│   │   └── designer-guia-visual.md
│   │
│   ├── Copywriter Tasks
│   │   ├── copywriter-copy-principal.md
│   │   ├── copywriter-microcopy.md
│   │   └── copywriter-cta-messaging.md
│   │
│   ├── SEO Specialist Tasks
│   │   ├── seo-otimizacao-on-page.md
│   │   ├── seo-keywords-research.md
│   │   └── seo-meta-tags.md
│   │
│   ├── Frontend Developer Tasks
│   │   ├── frontend-setup-projeto.md
│   │   ├── frontend-implementar-design.md
│   │   └── frontend-otimizar-performance.md
│   │
│   ├── Backend Developer Tasks
│   │   ├── backend-setup-api.md
│   │   ├── backend-lead-capture.md
│   │   └── backend-integracao-email.md
│   │
│   ├── QA Analyst Tasks
│   │   ├── qa-testes-funcionalidade.md
│   │   ├── qa-analise-conversao.md
│   │   └── qa-relatorio-performance.md
│   │
│   ├── UX Researcher Tasks
│   │   ├── researcher-pesquisa-usuario.md
│   │   ├── researcher-teste-usabilidade.md
│   │   └── researcher-analise-comportamento.md
│   │
│   └── Storyteller Tasks
│       ├── storyteller-narrativa-marca.md
│       ├── storyteller-conteudo-emocional.md
│       └── storyteller-sequencia-comunicacao.md
│
├── templates/                      # Reusable templates
│   ├── landing-page-blueprint.md   # Complete landing page template
│   ├── design-system-template.md   # Design system structure
│   └── conversion-flow-template.md # Lead capture flow template
│
├── config/                         # Configuration files
│   ├── coding-standards.md         # Code standards and guidelines
│   ├── tech-stack.md              # Technology stack details
│   └── source-tree.md             # This file
│
├── scripts/                        # Helper scripts (optional)
│   ├── setup.sh
│   ├── build.sh
│   └── deploy.sh
│
└── docs/                           # Additional documentation
    ├── workflows.md               # Squad workflows
    ├── integration-guide.md       # How to integrate with other systems
    └── troubleshooting.md         # Common issues and solutions
```

## Frontend Project Structure (Implementation)

When implementing a landing page project using this squad:

```
landing-page-project/
├── public/                         # Static assets
│   ├── favicon.ico
│   ├── robots.txt
│   └── sitemap.xml
│
├── src/
│   ├── assets/                    # Images, fonts, videos
│   │   ├── images/
│   │   │   ├── hero-banner.jpg
│   │   │   ├── feature-1.png
│   │   │   └── testimonials/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── components/                # React components
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Form.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Tabs.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── sections/             # Landing page sections
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Pricing.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   ├── FAQ.tsx
│   │   │   ├── CTA.tsx
│   │   │   ├── ContactForm.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/               # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── pages/                # Page components
│   │       ├── LandingPage.tsx
│   │       ├── ThankYouPage.tsx
│   │       └── ErrorPage.tsx
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useForm.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useAnalytics.ts
│   │   ├── useIntersectionObserver.ts
│   │   └── index.ts
│   │
│   ├── services/                 # Business logic
│   │   ├── apiService.ts         # API client
│   │   ├── leadService.ts        # Lead capture
│   │   ├── emailService.ts       # Email integration
│   │   ├── analyticsService.ts   # Google Analytics
│   │   ├── storageService.ts     # Local storage
│   │   └── index.ts
│   │
│   ├── utils/                    # Utility functions
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   └── index.ts
│   │
│   ├── types/                    # TypeScript interfaces
│   │   ├── lead.ts
│   │   ├── form.ts
│   │   ├── api.ts
│   │   ├── analytics.ts
│   │   └── index.ts
│   │
│   ├── styles/                   # Global styles
│   │   ├── globals.css
│   │   ├── variables.css
│   │   ├── tailwind.css
│   │   └── animations.css
│   │
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # Entry point
│   └── index.html               # HTML template
│
├── tests/                        # Test files
│   ├── components/
│   │   └── Button.test.tsx
│   ├── hooks/
│   │   └── useForm.test.ts
│   ├── services/
│   │   └── apiService.test.ts
│   ├── utils/
│   │   └── validation.test.ts
│   └── setup.ts
│
├── .github/                     # GitHub configuration
│   └── workflows/
│       ├── ci.yml              # Continuous integration
│       └── deploy.yml          # Deployment workflow
│
├── .env.example                # Environment variables template
├── .env.local                  # Local environment (git ignored)
├── .eslintrc.json              # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite configuration
├── vitest.config.ts            # Vitest configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
├── package.json                # Node.js dependencies
├── package-lock.json           # Dependency lock file
├── README.md                   # Project documentation
└── .gitignore                  # Git ignore file
```

## Backend Project Structure (Implementation)

When implementing API backend:

```
landing-page-api/
├── src/
│   ├── routes/                 # API routes
│   │   ├── leads.ts
│   │   ├── forms.ts
│   │   ├── webhooks.ts
│   │   └── health.ts
│   │
│   ├── controllers/            # Request handlers
│   │   ├── leadController.ts
│   │   └── formController.ts
│   │
│   ├── services/               # Business logic
│   │   ├── leadService.ts
│   │   ├── emailService.ts
│   │   └── webhookService.ts
│   │
│   ├── middleware/             # Express middleware
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   ├── errorHandler.ts
│   │   └── cors.ts
│   │
│   ├── db/                     # Database
│   │   ├── migrations/         # SQL migrations
│   │   ├── seeds/              # Seed data
│   │   └── schema.ts           # Database schema
│   │
│   ├── types/                  # TypeScript types
│   │   ├── lead.ts
│   │   ├── form.ts
│   │   └── api.ts
│   │
│   ├── utils/                  # Utilities
│   │   ├── logger.ts
│   │   ├── validator.ts
│   │   └── email.ts
│   │
│   ├── config/                 # Configuration
│   │   ├── database.ts
│   │   ├── email.ts
│   │   └── constants.ts
│   │
│   └── index.ts                # Entry point
│
├── tests/                      # Test files
│   ├── routes/
│   ├── services/
│   └── setup.ts
│
├── migrations/                 # Database migrations
├── .env.example                # Environment variables
├── .eslintrc.json             # ESLint config
├── tsconfig.json              # TypeScript config
├── vitest.config.ts           # Vitest config
├── package.json               # Dependencies
└── README.md                  # Documentation
```

## Database Schema Structure

```
database/
├── migrations/
│   ├── 001_create_leads_table.sql
│   ├── 002_create_forms_table.sql
│   ├── 003_add_analytics_tracking.sql
│   └── 004_add_indexes.sql
│
└── seeds/
    └── initial_data.sql

Tables:
├── leads
│   ├── id (UUID)
│   ├── email (TEXT, unique)
│   ├── name (TEXT)
│   ├── phone (TEXT, nullable)
│   ├── source (TEXT)
│   ├── status (ENUM: new, contacted, converted, rejected)
│   ├── metadata (JSONB)
│   ├── created_at (TIMESTAMP)
│   └── updated_at (TIMESTAMP)
│
├── form_submissions
│   ├── id (UUID)
│   ├── lead_id (UUID, FK)
│   ├── form_type (TEXT)
│   ├── form_data (JSONB)
│   ├── created_at (TIMESTAMP)
│   └── updated_at (TIMESTAMP)
│
└── analytics_events
    ├── id (UUID)
    ├── event_type (TEXT)
    ├── user_id (TEXT, nullable)
    ├── properties (JSONB)
    ├── created_at (TIMESTAMP)
    └── url (TEXT)
```

## File Naming Conventions

### React Components
- `ComponentName.tsx` - Component file
- `ComponentName.test.tsx` - Component tests
- `ComponentName.module.css` - Component styles (if needed)

### Services/Utilities
- `serviceNameService.ts` - Service files
- `customHookName.ts` - Custom hooks
- `utilityName.ts` - Utility functions

### Types
- `TypeName.ts` - Type definitions
- `index.ts` - Barrel exports for directories

### Config Files
- `.env` - Environment variables
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind configuration

## Import Path Aliases

In `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@services/*": ["./src/services/*"],
      "@utils/*": ["./src/utils/*"],
      "@types/*": ["./src/types/*"],
      "@hooks/*": ["./src/hooks/*"]
    }
  }
}
```

Usage:
```typescript
import { Button } from '@components/ui/Button';
import { apiService } from '@services/apiService';
import { validateEmail } from '@utils/validation';
import { User } from '@types/user';
import { useForm } from '@hooks/useForm';
```

## Asset Organization

### Images
- `public/images/` - Public static images
- `src/assets/images/` - Component-specific images
- Naming: `kebab-case-description.ext`
- Supported: `.jpg`, `.png`, `.webp`, `.svg`

### Icons
- `src/assets/icons/` - SVG icons
- Naming: `icon-name.svg`
- Consider using icon libraries (e.g., Heroicons)

### Fonts
- `src/assets/fonts/` - Custom fonts
- Include in `styles/globals.css`
- Use `@font-face` declarations

## Documentation Structure

```
docs/
├── ARCHITECTURE.md          # System architecture
├── SETUP.md                 # Setup instructions
├── DEPLOYMENT.md            # Deployment guide
├── API.md                   # API documentation
├── COMPONENTS.md            # Component guide
├── CONTRIBUTING.md          # Contributing guidelines
└── TROUBLESHOOTING.md       # Troubleshooting guide
```

## Git Ignore Patterns

```
# Dependencies
node_modules/
.pnp

# Environment
.env.local
.env.*.local

# Build outputs
dist/
build/
.next/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage/
.nyc_output/

# Misc
.cache/
.eslintcache
```
