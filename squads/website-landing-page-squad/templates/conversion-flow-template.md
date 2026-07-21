# Template: Conversion Flow

**Template ID:** conversion-flow-template
**Version:** 1.0
**Purpose:** Standardized conversion flow design and documentation for landing pages

## Overview

A conversion flow maps the path a user takes from landing on the page to completing a desired action (signup, purchase, download, etc.). This template provides structure for designing and documenting optimal conversion flows.

---

## 1. Conversion Flow Structure

### Basic Flow
```
Landing
  ↓
Interest (Hero + Value Prop)
  ↓
Consideration (Features, Social Proof)
  ↓
Decision (Pricing, CTA)
  ↓
Action (Form/Purchase)
  ↓
Confirmation (Email, Follow-up)
```

### Extended Flow
```
Landing
  ↓
Problem Recognition
  ↓
Solution Education
  ↓
Product Demonstration
  ↓
Social Proof
  ↓
Objection Handling
  ↓
Value Justification
  ↓
Call-to-Action
  ↓
Lead Capture Form
  ↓
Confirmation & Follow-up
```

---

## 2. Funnel Stages

### Stage 1: Awareness
**Goal:** Grab attention and communicate value proposition

**Elements:**
- Hero section headline
- Value proposition statement
- Compelling imagery/video
- Primary benefit statement

**Conversion Metric:** Page load rate

**Optimization Focus:**
- Headline clarity and relevance
- Visual appeal
- Time to understand value

---

### Stage 2: Interest
**Goal:** Generate curiosity and engagement

**Elements:**
- Problem statement (validate pain point)
- Solution preview
- Key features overview
- Engagement CTA ("Learn More", "See Demo")

**Conversion Metric:** Scroll depth, section engagement time

**Optimization Focus:**
- Relevance of problem statement
- Clarity of solution
- Visual engagement

---

### Stage 3: Consideration
**Goal:** Build confidence and compare options

**Elements:**
- Detailed feature explanations
- Customer testimonials
- Use case examples
- Competitor comparison (optional)
- Risk reversal (guarantee, free trial)

**Conversion Metric:** Feature section engagement, scroll to testimonials

**Optimization Focus:**
- Specific benefit articulation
- Authentic testimonials
- Addressing objections

---

### Stage 4: Decision
**Goal:** Move toward action with confidence

**Elements:**
- Pricing (if applicable)
- Feature comparison
- Limited-time offers
- Money-back guarantee
- Clear CTA button
- Final objection handling (FAQ)

**Conversion Metric:** CTA click rate, form initiation rate

**Optimization Focus:**
- Pricing clarity
- Urgency messaging
- CTA button prominence

---

### Stage 5: Action
**Goal:** Complete the conversion

**Elements:**
- Lead capture form (minimal fields)
- Purchase form (if applicable)
- Secure checkout
- Alternative actions (e.g., "Schedule Demo")

**Conversion Metric:** Form submission rate, completion rate

**Optimization Focus:**
- Form field optimization
- Reduced friction
- Trust signals

---

### Stage 6: Confirmation
**Goal:** Reinforce decision and begin relationship

**Elements:**
- Confirmation message
- Confirmation email
- Follow-up sequence
- Onboarding materials
- Next steps communication

**Conversion Metric:** Email open rate, follow-up engagement

**Optimization Focus:**
- Email deliverability
- Personalization
- Clear next steps

---

## 3. Funnel Metrics

### Key Performance Indicators (KPIs)

| Stage | Metric | Target | Formula |
|-------|--------|--------|---------|
| Awareness | Page views | — | Sessions landing on page |
| Awareness | Bounce rate | <50% | (Sessions with 1 event / Total sessions) × 100 |
| Interest | Scroll depth | 50%+ | (Users scrolling past hero) / Total users |
| Interest | Time on page | 20-60s | Average session duration |
| Consideration | Features engagement | 70%+ | Users viewing features section |
| Consideration | Social proof views | 60%+ | Users scrolling to testimonials |
| Decision | CTA clicks | 5-10% | CTA clicks / Total page views |
| Decision | Form starts | 2-5% | Form initiations / Total page views |
| Action | Form completions | 30-50% | Completed submissions / Form starts |
| Conversion | Overall conversion | 1-5% | Conversions / Total page views |

---

## 4. Conversion Form Structure

### Minimal Form (High Conversion)
```
Email *
[input field]

[Get Started Button]

"We'll never share your email"
```

**Advantages:**
- High completion rate
- Lower friction
- Easier to collect complete data

**Disadvantages:**
- Limited initial data
- Must qualify leads in follow-up

---

### Standard Form (Balanced)
```
Full Name *
[input field]

Email *
[input field]

Company (optional)
[input field]

[Get Started Button]

"We respect your privacy"
```

**Advantages:**
- Moderate completion rate
- Useful initial data
- Balanced qualification

---

### Detailed Form (Lead Qualification)
```
First Name *
[input field]

Last Name *
[input field]

Email *
[input field]

Company *
[input field]

Company Size *
[dropdown: 1-10 / 11-50 / 51-200 / 200+]

What's your main challenge?
[dropdown: cost / time / quality / scalability / other]

Budget Range
[dropdown: <$1k / $1-5k / $5-10k / $10k+]

Timeline
[dropdown: ASAP / This month / This quarter / This year]

[Get Started Button]

[+] View privacy policy
```

**Advantages:**
- Complete lead qualification
- Better segmentation
- Higher quality leads

**Disadvantages:**
- Lower completion rate
- Higher friction
- May lose interested leads

---

## 5. Form Field Best Practices

### Field Types & Usage

**Text Input**
```html
<input type="text" name="full_name"
  placeholder="Your full name"
  required>
```
- Use for: Name, company, URL, etc.
- Validation: Non-empty, reasonable length
- Hint text: "First and Last Name"

**Email Input**
```html
<input type="email" name="email"
  placeholder="you@company.com"
  required>
```
- Use for: Email addresses only
- Validation: Valid email format
- Hint text: "We'll use this for confirmations"

**Number Input**
```html
<input type="number" name="phone"
  placeholder="(555) 555-1234">
```
- Use for: Phone, quantity, etc.
- Validation: Numeric only

**Dropdown/Select**
```html
<select name="company_size" required>
  <option value="">-- Select One --</option>
  <option value="1-10">1-10 employees</option>
  <option value="11-50">11-50 employees</option>
  <option value="50+">50+ employees</option>
</select>
```
- Use for: Pre-defined options (< 7 options)
- Validation: One option selected
- Limit options to 5-7 for clarity

**Radio Buttons**
```html
<label>
  <input type="radio" name="product" value="starter">
  Starter Plan
</label>
```
- Use for: Mutually exclusive options (< 5)
- Validation: One selected
- Examples: Plan selection, audience, time frame

**Checkboxes**
```html
<label>
  <input type="checkbox" name="interests" value="email">
  Email updates
</label>
```
- Use for: Multiple selections allowed
- Validation: At least one selected (if required)
- Examples: Interests, products, features

**Textarea**
```html
<textarea name="message"
  placeholder="Tell us more..."
  rows="4"></textarea>
```
- Use for: Multi-line input (feedback, questions)
- Validation: Max length, reasonable input

---

### Field Validation

**Real-Time Validation (As User Types)**
- ✓ Check email format
- ✓ Validate phone format
- ✓ Count character length
- ✓ Warn on special characters

**On Submit Validation**
- ✓ Required fields not empty
- ✓ Email format valid
- ✓ Phone format valid
- ✓ Password strength (if applicable)

**Error Messages (Friendly)**
- ✗ Bad: "Email invalid"
- ✓ Good: "Please enter a valid email (name@company.com)"

- ✗ Bad: "Required field"
- ✓ Good: "Please enter your company name"

---

## 6. CTA Button Strategy

### Primary CTA Button
```
Copy Variations:
- "Get Started"
- "Start Free Trial"
- "Sign Up Now"
- "Create Account"
- "Book Demo"
- "Download Now"

Best Practice:
- Action-oriented verb
- Clear benefit ("Start Free" vs "Submit")
- 16px+ font size
- 44px+ height
- High contrast color
- Active/hover state clearly visible
```

### Secondary CTA Button
```
Copy Variations:
- "Schedule Demo"
- "View Pricing"
- "Learn More"
- "Contact Sales"

Positioning:
- Below primary CTA
- Different color (lower contrast)
- Alternative path for hesitant visitors
```

### Button Placement
```
Hero Section:
- Position: Below subheadline or on right side (desktop)
- Size: Large, prominent
- Frequency: 1-2 buttons

Features Section:
- Position: At end of section or per feature card
- Size: Medium
- Frequency: 1-2 buttons

Testimonials:
- Position: End of section or floating
- Size: Medium
- Frequency: 1 button

Pricing:
- Position: Within each pricing tier
- Size: Medium, distinct
- Frequency: Per tier (2-3 total)

Final CTA Section:
- Position: Above footer
- Size: Large, prominent
- Frequency: 2 buttons (primary + alternative)

Mobile:
- Full width or near full width
- 44px+ height
- Sufficient spacing (12px+) above/below
```

---

## 7. Trust Elements & Objection Handling

### Trust Signals (Distributed Throughout)
```
1. Security/Privacy
   - "SSL Secure"
   - "256-bit Encryption"
   - "GDPR Compliant"
   - Privacy policy link

2. Social Proof
   - Customer testimonials
   - Number of users ("10,000+ happy users")
   - Star ratings (4.9/5)
   - Customer logos

3. Credibility
   - Industry certifications
   - Awards and recognition
   - Media mentions
   - Partnerships

4. Risk Reversal
   - Money-back guarantee
   - Free trial (no credit card)
   - No long-term contract
   - Satisfaction guarantee
```

### Common Objections & Responses
```
Objection: "It's too expensive"
Response: Value comparison, ROI calculator, flexible plans

Objection: "I don't have time to implement"
Response: Easy setup, migration help, onboarding support

Objection: "I'm not sure it will work for my use case"
Response: Use case examples, free consultation, pilot program

Objection: "What about customer support?"
Response: Support options, response times, success stories

Objection: "How does it compare to competitors?"
Response: Feature comparison, migration assistance, trial
```

---

## 8. Email Follow-Up Sequence

### Immediate (0 hours)
```
Subject: Welcome! [First Name]
Content:
- Thank you message
- Confirm email/account created
- Link to onboarding
- Contact support info
```

### Short-term (1-24 hours)
```
Subject: Getting started with [Product Name]
Content:
- Quick start guide
- Tutorial video
- Main features overview
- Scheduling demo/call
```

### Nurture (Days 3, 7, 14)
```
Day 3: Feature highlight #1
Day 7: Customer success story
Day 14: Product tip or case study

Content:
- Specific feature deep-dive
- Real customer example
- How-to guide
- CTA for next step
```

### Reengagement (30+ days)
```
Subject: You're missing out on [Benefit]
Content:
- Usage statistics (if activated)
- Feature recommendations
- Success story
- Limited offer or incentive
- Reactivation CTA
```

---

## 9. Mobile Conversion Optimization

### Mobile-Specific Considerations
```
1. Form Optimization
   - One field per line
   - Large input fields (44px+ height)
   - Appropriate keyboard (email@, number, tel)
   - Auto-fill enabled

2. CTA Buttons
   - Full width or near full width
   - 44x44px minimum
   - Spacing: 12px+ above/below
   - Easy to tap without scrolling

3. Form Placement
   - Sticky CTA on scroll
   - Below fold doesn't require scroll for initial submit
   - Optional fields marked clearly
   - Progress indicator for multi-step

4. Performance
   - Fast loading (< 2s)
   - Minimal redirects
   - Reduce images/video
   - Optimize third-party scripts

5. Trust
   - Security badge visible
   - Privacy policy accessible
   - Phone number clickable
   - Chat support visible
```

### Mobile Form Example
```
Hero Section [Full height on mobile]
↓
Short intro + Email only
[Get Started Button] [Full width]
↓
Features Section [Stacked vertically]
↓
Testimonials [Card format, scrollable]
↓
Final CTA [Sticky, full width]
↓
Footer [Mobile navigation]
```

---

## 10. Conversion Rate Benchmarks

### By Industry
```
SaaS:
- Average: 2-3%
- Target: 3-5%
- Excellent: 5%+

E-commerce:
- Average: 1-3%
- Target: 3-5%
- Excellent: 5%+

B2B Services:
- Average: 1-3%
- Target: 3-7%
- Excellent: 7%+

Lead Generation:
- Average: 5-10%
- Target: 10-20%
- Excellent: 20%+
```

### Improvement Targets
```
Month 1: Establish baseline
Month 2: +10% improvement
Month 3: +15% improvement
Month 4-6: +20-30% total improvement

After initial wins, expect diminishing returns
```

---

## 11. A/B Testing Conversion Elements

### High-Impact Tests (Test First)
1. Primary CTA copy/button
2. Form fields (reduce/reorder)
3. Hero section headline
4. Value proposition clarity
5. Pricing visibility

### Medium-Impact Tests
1. Social proof placement
2. Testimonial format (video vs text)
3. Feature section order
4. Section spacing
5. Image changes

### Lower-Impact Tests
1. Button colors (similar shades)
2. Font sizes (within same scale)
3. Icon styles
4. Microinteractions
5. Footer styling

---

## 12. Conversion Funnel Visualization

```json
{
  "funnel": {
    "stage_1_landing": {
      "users": 1000,
      "percentage": "100%",
      "label": "Visitors"
    },
    "stage_2_interest": {
      "users": 750,
      "percentage": "75%",
      "drop": "25%",
      "label": "Scrolled past hero"
    },
    "stage_3_consideration": {
      "users": 600,
      "percentage": "60%",
      "drop": "15%",
      "label": "Viewed features"
    },
    "stage_4_decision": {
      "users": 400,
      "percentage": "40%",
      "drop": "20%",
      "label": "Viewed pricing/CTA"
    },
    "stage_5_action": {
      "users": 60,
      "percentage": "6%",
      "drop": "34%",
      "label": "Form submissions"
    },
    "stage_6_conversion": {
      "users": 30,
      "percentage": "3%",
      "drop": "3%",
      "label": "Confirmed leads"
    }
  }
}
```

---

## 13. Example Conversion Flows

### SaaS Landing Page Flow
```
1. Hero (Value Prop + CTA)
2. Problem Recognition
3. Solution Benefits
4. Feature Deep-Dive
5. Social Proof
6. Pricing Plans
7. FAQ (Objection Handling)
8. Final CTA
9. Footer
```

### E-commerce Product Flow
```
1. Hero (Product Image + Price)
2. Product Description
3. Key Benefits
4. Feature Details
5. Customer Reviews
6. Sizing/Options
7. FAQ
8. Add to Cart CTA
9. Related Products
```

### Lead Generation Flow
```
1. Hero (Benefit + Form)
2. Problem/Pain Point
3. Solution Overview
4. What You'll Get
5. Testimonials
6. Contact Form (Detailed)
7. Form Confirmation
8. Thank You Email
```

---

## 14. Conversion Optimization Checklist

### Before Launch
- [ ] All CTAs prominent and clear
- [ ] Forms tested and functional
- [ ] All links working
- [ ] Trust elements visible
- [ ] Mobile optimized
- [ ] Conversion tracking configured
- [ ] Email followup ready
- [ ] Performance optimized
- [ ] Accessibility validated
- [ ] Copy tested for clarity

### Weekly Monitoring
- [ ] Conversion rate tracked
- [ ] Form abandonment monitored
- [ ] Email performance reviewed
- [ ] Mobile vs desktop compared
- [ ] Error logs reviewed
- [ ] Traffic sources analyzed

### Monthly Analysis
- [ ] Funnel bottlenecks identified
- [ ] A/B test results reviewed
- [ ] User feedback analyzed
- [ ] Segment performance compared
- [ ] Improvement prioritized

---

## 15. Tools & Resources

- **Analytics:** Google Analytics, Mixpanel, Amplitude
- **A/B Testing:** Optimizely, VWO, Convert
- **Session Recording:** Hotjar, Clarity, FullStory
- **Forms:** Typeform, Unbounce, Leadpages
- **Email:** Mailchimp, ConvertKit, HubSpot
- **Heatmaps:** Hotjar, Crazy Egg, Microsoft Clarity

---

## Usage Instructions

1. Map your specific conversion goal
2. Identify which funnel stage is your bottleneck
3. Design flow using this template
4. Implement elements in order (hero → features → cta)
5. Set up conversion tracking
6. Test and optimize each stage
7. Review weekly for changes needed
8. Iterate based on data
