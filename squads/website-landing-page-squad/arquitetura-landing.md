# Arquitetura da Landing Page — SPFP

**Data:** 2026-02-23
**Projeto:** SPFP - Landing Page `/transforme`
**Responsável:** Website Architect
**Status:** ✅ Aprovado para Desenvolvimento

---

## 1. DECISÕES ARQUITETURAIS

### Tech Stack

```
┌──────────────────────────────────────────┐
│ FRONTEND                                 │
├──────────────────────────────────────────┤
│ Framework:    Next.js 15 (React 19 + SSR)│
│ Language:     TypeScript                 │
│ Styling:      TailwindCSS + Shadcn       │
│ Forms:        React Hook Form + Zod      │
│ Animations:   Framer Motion               │
│ Icons:        Lucide React                │
│                                          │
│ BACKEND                                  │
├──────────────────────────────────────────┤
│ Database:     Supabase (PostgreSQL)      │
│ Auth:         Supabase Auth              │
│ API:          Next.js API Routes         │
│ Payments:     Stripe SDK                 │
│ Email:        SendGrid / Resend          │
│                                          │
│ ANALYTICS & MONITORING                   │
├──────────────────────────────────────────┤
│ Analytics:    Google Analytics 4         │
│ Session:      Hotjar (recordings)        │
│ Errors:       Sentry                     │
│ Performance:  Web Vitals monitoring      │
│                                          │
│ DEPLOYMENT                               │
├──────────────────────────────────────────┤
│ Hosting:      Vercel (Next.js optimized) │
│ Domain:       spfp.vercel.app/transforme │
│ CDN:          Vercel Edge Network        │
│ CI/CD:        GitHub Actions             │
└──────────────────────────────────────────┘
```

### Estrutura de Projeto

```
spfp/ (repositório existente)
├── src/
│   ├── pages/
│   │   ├── index.tsx (home original)
│   │   ├── app/ (dashboard app)
│   │   ├── login.tsx
│   │   └── transforme/
│   │       └── index.tsx (LANDING PAGE)
│   │
│   ├── components/
│   │   ├── landing/
│   │   │   ├── LandingLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── ValueProp.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   ├── Pricing.tsx
│   │   │   ├── FAQ.tsx
│   │   │   ├── FinalCTA.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── ui/ (reusable components)
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Accordion.tsx
│   │   │   ├── Carousel.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Form.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── Toast.tsx
│   │   │
│   │   └── forms/
│   │       ├── LeadForm.tsx
│   │       ├── CheckoutForm.tsx
│   │       └── DemoForm.tsx
│   │
│   ├── services/
│   │   ├── leads.ts (CRUD leads)
│   │   ├── stripe.ts (Stripe integration)
│   │   └── email.ts (Email sending)
│   │
│   ├── hooks/
│   │   ├── useLandingTracking.ts (analytics)
│   │   ├── useLead.ts (form state)
│   │   └── useCheckout.ts (payment state)
│   │
│   ├── types/
│   │   ├── landing.ts (types específicos landing)
│   │   └── forms.ts (form types)
│   │
│   └── styles/
│       ├── landing.css (landing-specific)
│       └── globals.css (compartilhado)
│
├── public/
│   └── landing/
│       ├── hero-video.mp4
│       ├── hero-fallback.jpg
│       ├── icons/
│       ├── avatars/
│       └── testimonials/
│
├── supabase/
│   └── migrations/
│       └── 20260223_create_landing_tables.sql
│
└── next.config.js
```

---

## 2. ESTRUTURA DE SEÇÕES

### Mapa Hierárquico

```
LandingLayout (wrapper)
├── Header
│   ├── Logo (Link)
│   ├── Nav Links
│   │   ├── Home
│   │   ├── Plataforma
│   │   ├── FAQ
│   │   └── Contato
│   └── CTA Button (Começar Agora)
│
├── Hero
│   ├── Container
│   │   ├── H1 (Headline)
│   │   ├── P (Subheadline)
│   │   ├── Dual CTA Buttons
│   │   │   ├── Button.primary (Plataforma)
│   │   │   └── Button.secondary (Demo)
│   │   └── Scroll Indicator
│   └── Background
│       ├── Video (lazy loaded)
│       └── Gradient Overlay
│
├── ValueProp
│   ├── Section Title
│   ├── TwoColumn Layout
│   │   ├── Left: Problem (Icon List)
│   │   │   ├── Problem Item (× 4)
│   │   │   │   ├── Icon
│   │   │   │   └── Text
│   │   │   └── Divider
│   │   └── Right: Solution (Icon List)
│   │       ├── Solution Item (× 4)
│   │       │   ├── Icon (checkmark)
│   │       │   └── Text
│   │       └── CTA (Learn More)
│   └── Background Color
│
├── Features
│   ├── Section Title
│   ├── Grid Layout (4 cols / 2 / 1)
│   │   ├── Feature Card (× 4)
│   │   │   ├── Large Icon
│   │   │   ├── H3 (Feature Name)
│   │   │   ├── P (Description)
│   │   │   └── Link (Explore)
│   │   └── Spacing & Animations
│   └── Section Padding
│
├── HowItWorks
│   ├── Section Title
│   ├── Timeline Container
│   │   ├── Step Card (× 3)
│   │   │   ├── Step Number
│   │   │   ├── Icon
│   │   │   ├── H3 (Title)
│   │   │   ├── P (Description)
│   │   │   └── Time Badge
│   │   ├── Connected Line (visual only)
│   │   └── Total Time
│   ├── Dual CTAs
│   │   ├── Button.primary (Começar)
│   │   └── Button.secondary (Demo)
│   └── Background
│
├── Testimonials
│   ├── Section Title
│   ├── Rating Summary
│   │   ├── Stars (4.8)
│   │   └── Count (2,341 users)
│   ├── Carousel Component
│   │   ├── Testimonial Card (× 3 visibles)
│   │   │   ├── Quote (blockquote)
│   │   │   ├── Author Name
│   │   │   ├── Author Role
│   │   │   ├── Star Rating
│   │   │   └── Avatar (optional)
│   │   ├── Controls
│   │   │   ├── Prev Button
│   │   │   ├── Dots (indicators)
│   │   │   └── Next Button
│   │   └── Auto-scroll (8s interval)
│   └── Background Color
│
├── Pricing
│   ├── Section Title
│   ├── PricingContainer
│   │   ├── Pricing Card (× 2)
│   │   │   ├── Badge ("Popular" on right)
│   │   │   ├── Plan Name (H3)
│   │   │   ├── Price (large)
│   │   │   ├── Feature List
│   │   │   │   ├── Feature Item (× 4-5)
│   │   │   │   │   ├── Checkmark Icon
│   │   │   │   │   └── Feature Text
│   │   │   │   └── No checkmarks (not included)
│   │   │   └── CTA Button
│   │   │       ├── Button.primary (Consultoria)
│   │   │       └── Button.secondary (Plataforma)
│   │   └── Comparison Visible
│   └── Trust Message (sem contrato, cancele)
│
├── FAQ
│   ├── Section Title
│   ├── AccordionContainer
│   │   ├── Accordion Item (× 6)
│   │   │   ├── Summary (Question)
│   │   │   │   └── Chevron Icon (animated)
│   │   │   └── Details (Answer)
│   │   │       └── Rich Text (p, strong, etc)
│   │   └── Single Open (default behavior)
│   ├── Support CTA (Chat ao vivo)
│   └── Search (optional)
│
├── FinalCTA
│   ├── Container (high contrast)
│   │   ├── H2 (Headline)
│   │   ├── P (Subheadline)
│   │   ├── Dual CTAs
│   │   │   ├── Button.primary (Começar)
│   │   │   └── Button.primary (Consultoria)
│   │   └── Support Link (Chat)
│   └── Background (Gradient or solid)
│
└── Footer
    ├── Content Container
    │   ├── Copyright Text
    │   ├── Links Row
    │   │   ├── Link (Home)
    │   │   ├── Link (Privacy)
    │   │   ├── Link (Terms)
    │   │   └── Link (Contact)
    │   ├── Social Icons Row
    │   │   ├── LinkedIn (icon + link)
    │   │   ├── Instagram (icon + link)
    │   │   └── Twitter (icon + link)
    │   └── Tagline
    └── Divider (top border)
```

---

## 3. COMPONENTES REACT DETALHADOS

### Landing Section Components

#### 1. LandingLayout.tsx

```typescript
interface LandingLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  ogImage?: string;
}

// Responsável por:
// - Meta tags (SEO)
// - Tracking setup (Google Analytics, Hotjar)
// - Layout wrapper (Header + main + Footer)
// - CSS variables (dark mode, theme)
// - Error boundary
```

**State Management:**
- `selectedPersona` (localStorage)
- `trackingId` (from URL params or generated)
- `showChat` (Intercom/support widget)

---

#### 2. Header.tsx

```typescript
interface HeaderProps {
  sticky?: boolean;
  variant?: 'light' | 'dark';
}

// Responsável por:
// - Sticky nav ao scroll
// - Mobile hamburger menu
// - Smooth scroll to sections
// - Active section highlighting
// - CTA button state
```

**State Management:**
- `isOpen` (mobile menu)
- `activeSection` (scroll spy)
- `isScrolled` (for sticky styling)

**Interactions:**
- Scroll listener (debounced)
- Click handlers para nav links
- Mobile menu toggle

---

#### 3. Hero.tsx

```typescript
interface HeroProps {
  personaHint?: 'empreendedor' | 'investidor' | 'executivo' | 'autonomo';
  onCtaClick: (action: 'lead' | 'demo') => void;
}

// Responsável por:
// - Conditional rendering de headlines
// - Video background (with fallback)
// - Animations (fade-in, slide)
// - CTA form modal trigger
// - Scroll indicator animation
```

**State Management:**
- `videoLoaded` (for fallback)
- `animationStep` (staggered animations)

**Interactions:**
- CTA buttons trigger form modal
- Scroll arrow scrolls to next section
- Video pause/play on demand

---

#### 4. Features.tsx

```typescript
interface FeaturesProps {
  variant?: 'grid' | 'carousel';
  itemsPerRow?: 4 | 3 | 2;
}

// Responsável por:
// - Grid layout (responsive)
// - Card hover animations
// - Icon rendering (SVG)
// - Feature data mapping
// - Learn more modal/link
```

**Data Structure:**
```typescript
type Feature = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string;
};
```

**Animations:**
- Stagger effect on scroll
- Card scale + shadow on hover
- Icon color transition

---

#### 5. Testimonials.tsx

```typescript
interface TestimonialsProps {
  autoScroll?: boolean;
  interval?: number; // ms
  itemsVisible?: 1 | 2 | 3;
}

// Responsável por:
// - Carousel/slider logic
// - Testimonial rendering
// - Navigation controls
// - Auto-scroll logic
// - Rating display
```

**Data Structure:**
```typescript
type Testimonial = {
  id: string;
  name: string;
  role: string;
  company?: string;
  quote: string;
  rating: number; // 1-5
  avatar?: string;
};
```

**State Management:**
- `currentIndex` (active slide)
- `isAutoScrolling` (pause on hover)
- `slideDirection` ('next' | 'prev')

---

#### 6. Pricing.tsx

```typescript
interface PricingProps {
  currency?: 'BRL' | 'USD';
  annual?: boolean;
  onSelectPlan: (plan: PricingPlan) => void;
}

// Responsável por:
// - Two pricing card display
// - Feature comparison
// - Popular badge positioning
// - CTA button routing
// - Price formatting
```

**Data Structure:**
```typescript
type PricingPlan = {
  id: 'platform' | 'consultoria';
  name: string;
  price: number;
  billingPeriod: 'month' | 'year';
  features: string[];
  cta: { text: string; action: 'checkout' | 'demo' };
  badge?: string; // "Popular"
};
```

**Interactions:**
- Button click → routes to checkout or demo form
- Hover → card scale
- Feature compare (optional modal)

---

#### 7. FAQ.tsx

```typescript
interface FAQProps {
  searchable?: boolean;
  defaultOpen?: string[];
  maxOpenItems?: number; // 1 = single open
}

// Responsável por:
// - Accordion management
// - Search filtering
// - Answer rendering (rich text)
// - Keyboard accessibility
```

**Data Structure:**
```typescript
type FAQItem = {
  id: string;
  question: string;
  answer: string; // can be JSX
  category?: string;
  order: number;
};
```

**State Management:**
- `openItems` (Set<string>)
- `searchQuery` (for filtering)
- `filteredFAQs` (derived state)

---

### Reusable UI Components

#### Button.tsx

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}
```

**Styling:**
- Primary: Blue bg, white text, hover scale
- Secondary: Gray bg
- Outline: Border only
- Ghost: Text only

---

#### Card.tsx

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  shadow?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

// Used in: Features, Testimonials, Pricing
```

---

#### Accordion.tsx

```typescript
interface AccordionProps {
  items: AccordionItem[];
  singleOpen?: boolean;
  onchange?: (id: string, isOpen: boolean) => void;
}

interface AccordionItem {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
}
```

---

### Form Components

#### LeadForm.tsx

```typescript
interface LeadFormProps {
  onSubmit: (data: LeadData) => Promise<void>;
  onClose: () => void;
  prefilledPersona?: Persona;
}

interface LeadData {
  name: string;
  email: string;
  phone?: string;
  personaType: Persona;
  interestType: 'platform' | 'consultoria' | 'both';
  challenge: string;
}

// Validação: Zod
// Form state: React Hook Form
// Success: Toast + Email sequence triggered
// Error: Toast + Retry
```

---

#### CheckoutForm.tsx

```typescript
interface CheckoutFormProps {
  plan: PricingPlan;
  onSuccess: (sessionId: string) => void;
}

// Integração: Stripe.js
// Flow:
// 1. Collect email/card info
// 2. Create Stripe session via API
// 3. Redirect to Stripe hosted checkout
// 4. Return to /transforme?session_id=xxx
```

---

## 4. ESTADO (STATE MANAGEMENT)

### Context API Structure

```
LandingContext
├── landingState
│   ├── selectedPersona: Persona | null
│   ├── trackingId: string
│   ├── sessionMetadata: {
│   │   ├── entryPoint: string
│   │   ├── utmSource: string
│   │   ├── utmMedium: string
│   │   └── utmCampaign: string
│   ├── scrollDepth: number (0-100%)
│   ├── timeOnPage: number (seconds)
│   └── interactions: InteractionEvent[]
│
└── actions
    ├── setSelectedPersona(persona)
    ├── trackEvent(event, data)
    ├── trackScrollDepth(percent)
    └── submitLead(data)
```

### Form State (React Hook Form + Zod)

```typescript
const leadFormSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email válido obrigatório'),
  phone: z.string().optional(),
  personaType: z.enum(['empreendedor', 'investidor', 'executivo', 'autonomo']),
  interestType: z.enum(['platform', 'consultoria', 'both']),
  challenge: z.string(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

const form = useForm<LeadFormData>({
  resolver: zodResolver(leadFormSchema),
  defaultValues: { personaType: 'empreendedor' },
});
```

### Analytics State (useEffect hooks)

```typescript
// Track page view
useEffect(() => {
  gtag.pageview({
    page_path: '/transforme',
    page_title: 'SPFP - Planeje Suas Finanças',
  });
}, []);

// Track scroll depth
useEffect(() => {
  const handleScroll = () => {
    const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    landingContext.trackScrollDepth(scrollPercent);
  };

  window.addEventListener('scroll', debounce(handleScroll, 500));
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// Track time on page
useEffect(() => {
  const interval = setInterval(() => {
    landingContext.updateTimeOnPage();
  }, 10000); // a cada 10s

  return () => clearInterval(interval);
}, []);
```

---

## 5. FLUXO DE DADOS

### User Journey - Data Flow

```
┌────────────────────────────────────────────────────────────┐
│                    VISITOR LANDS                           │
│              /transforme?utm_source=google                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Next.js renders page (SSR)                            │
│     ├─ Meta tags (SEO, OG)                                │
│     ├─ Script tags (GA, Hotjar, Sentry)                  │
│     └─ React hydration                                    │
│                                                            │
│  2. LandingContext initializes                            │
│     ├─ Generate/retrieve trackingId                       │
│     ├─ Parse URL params (utm_*)                           │
│     └─ Store in localStorage (session data)               │
│                                                            │
│  3. Analytics scripts fire                                │
│     ├─ Google Analytics: pageview event                   │
│     ├─ Hotjar: start recording                            │
│     └─ Sentry: initialize error tracking                 │
│                                                            │
│  4. Visitor interacts with page                           │
│     ├─ Clicks: "Começar Agora" button                    │
│     ├─ Scrolls: Tracking via scroll listener              │
│     └─ Views: Each section triggers analytics             │
│                                                            │
│  5. Clicks LeadForm CTA                                   │
│     ├─ Modal opens (LeadForm.tsx)                         │
│     ├─ Analytics event: "lead_form_opened"               │
│     └─ Form prefilled with persona (if detected)         │
│                                                            │
│  6. Submits form data                                     │
│     ├─ Client validation (Zod)                            │
│     ├─ POST /api/leads { name, email, persona, ... }     │
│     ├─ Backend: INSERT into leads table (Supabase)        │
│     ├─ Trigger: Email sequence (SendGrid)                │
│     ├─ Analytics event: "lead_submitted"                  │
│     └─ Response: { success, leadId }                      │
│                                                            │
│  7. Success state                                          │
│     ├─ Toast: "Obrigado! Verifique seu email"           │
│     ├─ Modal closes                                       │
│     ├─ Email sent to visitor (Day 0)                      │
│     ├─ Email sent to sales team (notification)           │
│     └─ Supabase updated (leads table)                     │
│                                                            │
│  8. Cleanup & exit                                        │
│     ├─ Page: Time on page, scroll depth recorded         │
│     ├─ Hotjar: Session recording complete                │
│     └─ Analytics: Session closed                          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Payment Flow

```
Visitor clicks "Escolher Plataforma" or "Consultoria"
    ↓
CheckoutForm opens (modal or redirect)
    ↓
POST /api/checkout-session { planId, email }
    ↓
Backend creates Stripe session
    ├─ Line items from pricing config
    ├─ Success URL: /transforme?session_id={id}
    └─ Cancel URL: /transforme?cancelled=true
    ↓
Response: { sessionUrl }
    ↓
Client redirects to Stripe hosted checkout
    ↓
Visitor enters card details (Stripe hosted)
    ↓
Payment successful
    ↓
Stripe webhook → /api/webhooks/stripe
    ├─ Create subscription in Supabase
    ├─ Create user account (if needed)
    ├─ Send confirmation email (SendGrid)
    └─ Add to CRM/mailing list
    ↓
Redirect to /transforme?session_id=xxx&status=success
    ↓
Show confirmation & dashboard access link
```

---

## 6. API ENDPOINTS

### POST /api/leads

```typescript
// Request
{
  name: string;
  email: string;
  phone?: string;
  persona: 'empreendedor' | 'investidor' | 'executivo' | 'autonomo';
  interestType: 'platform' | 'consultoria' | 'both';
  challenge: string;
  trackingId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

// Response
{
  success: boolean;
  leadId?: string;
  message: string;
  error?: string;
}

// Process
1. Validate with Zod
2. INSERT into leads table (Supabase)
3. Send welcome email (SendGrid template)
4. Send notification to sales team
5. Return { success: true, leadId }
```

### POST /api/checkout-session

```typescript
// Request
{
  planId: 'platform' | 'consultoria';
  email: string;
  trackingId?: string;
}

// Response
{
  sessionUrl: string;
  sessionId: string;
}

// Process
1. Validate email
2. Lookup pricing config
3. Create Stripe session
4. Return sessionUrl (redirect to Stripe)
```

### POST /api/webhooks/stripe

```typescript
// Webhook event: payment_intent.succeeded

{
  type: 'payment_intent.succeeded';
  data: {
    object: {
      id: string;
      email: string;
      amount: number;
      metadata: { planId, trackingId };
    };
  };
}

// Process
1. Verify webhook signature
2. Extract customer email, plan
3. Create subscription in Supabase
4. Create/update user account
5. Send confirmation email
6. Add to CRM mailing list
7. Log to analytics
```

### GET /api/testimonials

```typescript
// Response
[
  {
    id: string;
    name: string;
    role: string;
    company?: string;
    quote: string;
    rating: number;
    avatar?: string;
  }
]

// Source: Supabase testimonials table
// Cached: 1 hour (ISR)
```

---

## 7. BANCO DE DADOS (SUPABASE)

### Schema

```sql
-- Leads Table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  persona VARCHAR(50) NOT NULL,
  interest_type VARCHAR(20) NOT NULL,
  challenge TEXT,
  tracking_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Engagement
  scroll_depth NUMERIC,
  time_on_page NUMERIC,
  source TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Relationships
  user_id UUID REFERENCES auth.users(id),

  UNIQUE(email)
);

-- Subscriptions Table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  plan_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Testimonials Table
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  company TEXT,
  quote TEXT NOT NULL,
  rating NUMERIC(2, 1) NOT NULL,
  avatar_url TEXT,
  persona VARCHAR(50),
  published BOOLEAN DEFAULT true,
  order_index NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Leads are public (insert-only)
CREATE POLICY "Anyone can insert leads"
  ON leads FOR INSERT WITH CHECK (true);

-- Only authenticated users can view their own data
CREATE POLICY "Users can view own data"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 8. INTEGRAÇÃO COM STACK EXISTENTE

### Reuso de Código SPFP

```
Existing components to reuse:
├── AuthContext (autenticação)
├── Button components (Shadcn UI)
├── Form components (React Hook Form)
├── Supabase client (src/supabase.ts)
├── Error handling (errorRecovery.ts)
├── Analytics setup (Google Analytics)
└── PDF/Email services

New code specific to landing:
├── Landing layout & sections
├── Pricing/checkout logic
├── Lead capture forms
├── Testimonials carousel
├── Landing-specific analytics
└── Persona detection logic
```

### Shared Services

```typescript
// Use existing services
import { supabase } from '@/supabase';
import { withErrorRecovery } from '@/services/errorRecovery';
import { retryWithBackoff } from '@/services/retryService';

// Example: Create lead with error recovery
const createLead = async (data: LeadData) => {
  return await withErrorRecovery(
    async () => {
      const { data: lead, error } = await supabase
        .from('leads')
        .insert([data])
        .select();

      if (error) throw error;
      return lead[0];
    },
    'Create lead from landing page',
    {
      maxRetries: 3,
      userId: undefined, // Not authenticated yet
    }
  );
};
```

---

## 9. PERFORMANCE & OPTIMIZATION

### Image Optimization

```typescript
import Image from 'next/image';

// Use Next.js Image component
<Image
  src="/landing/hero-fallback.jpg"
  alt="Financial planning"
  width={1920}
  height={1080}
  priority={true} // Hero image
  quality={80}
/>

// Background video
<video
  autoPlay
  muted
  loop
  playsInline
  poster="/landing/hero-fallback.jpg"
>
  <source src="/landing/hero-video.mp4" type="video/mp4" />
</video>
```

### Code Splitting

```typescript
// Dynamic import for heavy components
const Testimonials = dynamic(() => import('@/components/landing/Testimonials'), {
  loading: () => <div>Loading...</div>,
  ssr: true,
});

// Modal forms (lazy load)
const LeadForm = dynamic(() => import('@/components/forms/LeadForm'), {
  ssr: false,
});
```

### Caching Strategy

```typescript
// Static generation (ISR)
export const revalidate = 3600; // 1 hour

// Static props
export async function getStaticProps() {
  const testimonials = await fetchTestimonials();
  return {
    props: { testimonials },
    revalidate: 3600,
  };
}
```

### Core Web Vitals Targets

```
LCP (Largest Contentful Paint): < 2.5s
FID (First Input Delay): < 100ms
CLS (Cumulative Layout Shift): < 0.1
```

---

## 10. SEGURANÇA

### Form Submission Security

```typescript
// Validate on client
import { z } from 'zod';

const leadSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
});

// Validate on server
export async function POST(req: Request) {
  const data = await req.json();
  const validated = leadSchema.parse(data); // throws if invalid

  // Sanitize
  const sanitized = {
    ...validated,
    name: sanitizeHtml(validated.name),
  };

  // Insert
  await db.insert(validated);
}
```

### CSRF Protection

```typescript
// Next.js automatic CSRF protection for API routes
// Cookies with SameSite=Strict
```

### Rate Limiting

```typescript
// Implement on API routes
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 requests per hour
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for');
  const { success } = await ratelimit.limit(ip!);

  if (!success) return new Response('Too many requests', { status: 429 });

  // Process request
}
```

---

## 11. TESTING STRATEGY

### Unit Tests (Vitest)

```typescript
// Component tests
describe('Hero', () => {
  it('renders headline and CTA buttons', () => {
    render(<Hero onCtaClick={jest.fn()} />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});

// Form validation tests
describe('LeadForm validation', () => {
  it('validates email', () => {
    const result = leadSchema.safeParse({ email: 'invalid' });
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests

```typescript
// API route tests
describe('POST /api/leads', () => {
  it('creates lead and sends email', async () => {
    const response = await fetch('/api/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
    expect(response.status).toBe(200);
    // Verify in Supabase
    // Verify email sent
  });
});
```

### E2E Tests (Playwright)

```typescript
test('Full lead capture flow', async ({ page }) => {
  await page.goto('/transforme');
  await page.click('button:has-text("Começar Agora")');
  await page.fill('[name="name"]', 'Test User');
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('[type="submit"]');
  await expect(page).toHaveURL(/session_id=/);
});
```

---

## 12. DEPLOYMENT & MONITORING

### Deployment Checklist

```
Pre-deployment:
[ ] All tests passing
[ ] Performance budget met (LCP < 2.5s)
[ ] Lighthouse score > 90
[ ] SEO meta tags verified
[ ] Analytics setup verified
[ ] Stripe credentials configured
[ ] SendGrid API key configured
[ ] Supabase RLS policies verified

Deployment:
[ ] Code reviewed
[ ] Merge to main branch
[ ] GitHub Actions CI/CD passes
[ ] Vercel deployment preview approved
[ ] Testing on staging environment

Post-deployment:
[ ] Monitor error rates (Sentry)
[ ] Monitor performance (Web Vitals)
[ ] Monitor conversion metrics
[ ] Monitor email delivery
[ ] Check Google Analytics data
```

### Monitoring

```
Real-time alerts:
- Stripe webhook failures
- Email delivery failures
- API errors > 5% rate
- Performance degradation
- High bounce rate

Daily reports:
- Leads captured
- Conversion rate
- Cost per lead
- Top traffic sources

Weekly analysis:
- Scroll depth trends
- Form abandonment rates
- A/B test results
- User feedback
```

---

## 13. ROADMAP PÓS-LAUNCH

### Fase 1: Validação (Semana 1-2)
- Monitor conversion rate
- Collect user feedback
- Fix critical issues
- Optimize high-bounce sections

### Fase 2: A/B Testing (Semana 2-4)
- Test headlines
- Test CTA copy/color
- Test form fields
- Test pricing presentation

### Fase 3: Expansion (Semana 4+)
- Add new personas
- Add testimonials
- Implement chat support
- Expand ad campaigns
- Add video content

### Fase 4: Optimization (Ongoing)
- Personalization by traffic source
- Conditional rendering per persona
- Email sequence optimization
- Landing page variants per channel

---

**Documento aprovado para desenvolvimento.**

Próxima etapa: Design Visual (Wireframes/Mockups - UX Designer)
