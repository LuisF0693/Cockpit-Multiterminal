# Workflow: Optimization Cycle

**ID:** optimization-cycle
**Version:** 1.0
**Type:** Iterative Improvement Workflow
**Squad:** website-landing-page-squad

## Overview

Continuous improvement workflow for landing pages post-launch. Focuses on data-driven optimization, A/B testing, and incremental conversion improvements.

## Trigger Points

This workflow starts when:
1. Landing page is live (after landing-page-creation workflow)
2. Minimum 2 weeks of analytics data available
3. At least 50+ conversions captured
4. Team requests optimization sprint
5. Performance metrics plateau

## Optimization Cycle Phases

### Phase 1: Data Collection & Analysis (3-5 days)

**Lead Agent:** ux-researcher, qa-analyst

**Tasks:**
1. Gather analytics data from all sources
   - Google Analytics conversion funnel
   - Email click-through rates
   - Form completion rates
   - User session recordings (Hotjar/Clarity)
   - Bounce rates per section

2. Analyze user behavior patterns
   - Scroll depth analysis
   - Click heatmaps
   - Flow analysis
   - Drop-off points
   - Device/segment differences

3. Calculate baseline metrics
   - Overall conversion rate
   - CTA click rates
   - Form abandonment rate
   - Average session duration
   - Cost per lead/conversion

4. Identify optimization opportunities
   - Sections with low engagement
   - High-friction points
   - Mobile vs desktop disparities
   - Traffic source performance
   - Audience segment insights

5. Document findings
   - Create analysis report
   - Visualize key metrics
   - Rank opportunities by impact/effort

**Output:**
- `optimization-report.md` - Detailed analysis
- `opportunity-matrix.json` - Ranked opportunities (impact vs effort)
- `baseline-metrics.json` - Current performance metrics

**Decision Point:**
- **High-Impact Opportunities Found?** → Proceed to Phase 2
- **No Clear Opportunities?** → Wait 1 week, re-analyze, or escalate

---

### Phase 2: Hypothesis Development (2-3 days)

**Lead Agent:** ux-researcher, copywriter

**Tasks:**
1. Generate hypotheses for top opportunities
   - "Changing CTA copy from [X] to [Y] will increase clicks by 15%"
   - "Moving testimonials above fold will reduce bounce by 10%"
   - "Adding urgency messaging will improve conversion by 20%"

2. For each hypothesis:
   - State the change
   - Predict impact percentage
   - Estimate effort (hours)
   - Identify risk level
   - Define success metric

3. Conduct research validation
   - Review user research findings
   - Check competitor approach
   - Validate with A/B testing best practices
   - Get stakeholder input

4. Prioritize hypotheses
   - Score by: (Predicted Impact × Confidence) / Effort
   - Select top 2-3 for immediate testing
   - Backlog remainder for future cycles

5. Design experiments
   - Define control (current version)
   - Define variant (proposed change)
   - Set sample size needed
   - Define duration (minimum 1 week)
   - Identify statistical significance threshold (95%)

**Output:**
- `hypothesis-list.json` - Ranked test hypotheses
- `experiment-plan.md` - Detailed test plans
- `test-success-criteria.md` - Metrics to measure

**Decision Point:**
- **Valid Hypotheses Defined?** → Proceed to Phase 3
- **Need More Data?** → Request additional analytics
- **Major Redesign Needed?** → Escalate to design team

---

### Phase 3: Implementation & Testing (7-14 days per iteration)

**Lead Agents:** frontend-developer, copywriter, ux-designer

**Tasks:**

**For Quick Wins (< 2 hours):**
1. Copy changes
   - Update headlines
   - Modify CTA text
   - Adjust messaging
   - Implement immediately (no formal A/B test)
   - Monitor impact daily

2. Minor design tweaks
   - Button color/position changes
   - Form field reordering
   - Section visibility adjustments
   - Implement immediately
   - Monitor impact daily

**For Standard Tests (2-40 hours):**
1. Implement variant
   - Create new version (A/B test tool or feature flag)
   - Ensure control/variant are identical except test element
   - Validate implementation
   - Deploy to production (limited audience first)

2. Configure tracking
   - Setup event tracking for variant
   - Verify analytics capturing data
   - Set up cohort assignment (50/50 split)
   - Create dashboard for monitoring

3. Run test for minimum duration
   - Minimum 1 week, or until ~100 conversions per variant
   - Monitor daily for issues
   - Watch for statistical significance
   - Document observations

4. Collect results
   - Measure conversion rate change
   - Analyze by segment (device, traffic source, etc.)
   - Calculate confidence interval
   - Determine winner (if significant)

**For Major Changes (40+ hours):**
1. Design new version
   - Create prototype/mockup
   - User test with UX researcher
   - Get approval before development

2. Develop variant
   - Build new version
   - Thorough QA testing
   - Performance testing

3. Soft launch (limited audience)
   - Deploy to 10-20% of traffic
   - Monitor for bugs/errors
   - Gather initial feedback

4. Full test launch
   - Deploy to 50% of traffic
   - Run for minimum duration
   - Collect comprehensive data

**Output:**
- Modified landing page component/section
- A/B test configured and live
- `test-log.json` - Test configuration and tracking
- Daily monitoring reports

**Decision Point:**
- **Test Complete & Significant?** → Proceed to Phase 4A (Winner)
- **Test Complete & Not Significant?** → Proceed to Phase 4B (Inconclusive)
- **Test Failed/Issue Found?** → Halt, investigate, iterate

---

### Phase 4A: Winning Test Finalization (2-3 days)

**Lead Agent:** qa-analyst, copywriter

**Tasks:**
1. Confirm winner
   - Verify statistical significance
   - Check confidence interval (>95%)
   - Analyze by segment
   - Ensure no anomalies in data

2. Promote to production
   - Make winning variant permanent
   - Remove control version
   - Clean up testing code
   - Update documentation

3. Analyze impact
   - Calculate actual uplift
   - Quantify business impact (leads/revenue)
   - Update baseline metrics
   - Document learnings

4. Share findings
   - Create winner case study
   - Present to stakeholders
   - Update team playbook
   - Archive test results

**Output:**
- Updated landing page with winning version
- `test-results.md` - Winner analysis and impact
- `playbook-update.md` - Learnings documented
- Updated baseline metrics

**Next:** Proceed to Phase 5 (Iterate) or Phase 1 (New Cycle)

---

### Phase 4B: Inconclusive Test Analysis (2-3 days)

**Lead Agent:** ux-researcher, qa-analyst

**Tasks:**
1. Analyze inconclusive result
   - Check for statistical power issues
   - Review confidence intervals
   - Analyze by segment
   - Look for partial positives (mobile vs desktop)

2. Decide on path
   - **Option A:** Run test longer (extend to 2-4 weeks)
   - **Option B:** Implement anyway (if positive trend)
   - **Option C:** Abandon and return to control
   - **Option D:** Iterate variant based on user feedback

3. Document learnings
   - Why test was inconclusive
   - Factors that may have affected result
   - Changes for future similar tests

4. Archive results
   - Store test data
   - Maintain for historical analysis
   - Use for future sample size calculations

**Output:**
- `inconclusive-analysis.md` - Detailed analysis
- Decision on next action
- Learnings documented

**Next:** Proceed per decision (A/B/C/D)

---

### Phase 5: Iterate & Next Cycle (Continuous)

**Cycle Decision:**
1. **Continue with High-Impact Opportunities?**
   - Return to Phase 1 (New Cycle)
   - Focus on next ranked opportunity
   - Minimum 1-week break between tests (data freshness)

2. **Need Design/Major Changes?**
   - Escalate to full design team
   - Consider design sprints
   - May return to landing-page-creation workflow for major redesign

3. **Convergence Plateau Reached?**
   - All quick wins implemented
   - Diminishing returns on A/B tests
   - Schedule quarterly review
   - Plan larger optimization initiatives

4. **Business Context Changed?**
   - Market shift
   - Product change
   - Audience shift
   - Return to landing-page-creation workflow for refresh

**Output:**
- Decision documented
- Next cycle planned
- Resources allocated

---

## Optimization Matrix & Prioritization

### Quick Wins (Implement Immediately)
- Copy/CTA text changes
- Button colors/positioning
- Form field reordering
- Trust element additions
- Urgency messaging tweaks

**Effort:** < 2 hours
**Confidence:** Medium-High
**Risk:** Low

### Standard A/B Tests
- Headline variations
- CTA button text (major change)
- Section reordering
- Image/video changes
- Form field changes (type/order)

**Effort:** 2-40 hours
**Testing Duration:** 1-2 weeks
**Sample Size:** ~100-500 conversions per variant

### Major Optimizations
- Section redesign
- Complete form redesign
- New content section
- Navigation restructure
- Value proposition pivot

**Effort:** 40+ hours
**Testing Duration:** 2-4 weeks
**Sample Size:** 500+ conversions per variant
**Requires:** Design + UX research validation

---

## Continuous Monitoring Dashboard

**Key Metrics to Track Weekly:**
- Conversion rate (%)
- Cost per lead/conversion (if paid traffic)
- CTA click rate (%)
- Form completion rate (%)
- Average session duration (seconds)
- Bounce rate (%)
- Mobile vs Desktop conversion difference
- Email open rate (%)
- Email click-through rate (%)

**Alerting Thresholds:**
- Conversion rate drops > 20%: Investigate immediately
- Form submission errors: Debug immediately
- Page load time > 3s: Performance investigation
- Mobile conversion < 50% of desktop: Review design

---

## Tools & Technologies

| Function | Tools |
|----------|-------|
| A/B Testing | Optimizely, VWO, Google Optimize, or custom flag system |
| Analytics | Google Analytics, Segment, Amplitude |
| Session Recording | Hotjar, Clarity, or FullStory |
| Heatmaps | Hotjar, Crazy Egg, Microsoft Clarity |
| User Feedback | Typeform, Qualtrics, or inline surveys |
| Experimentation Planning | Confluence, Notion, or shared docs |

---

## Frequency & Cadence

### Recommended Optimization Schedule

**Ongoing:**
- Daily: Monitor key metrics for red flags
- Weekly: Team sync on experiment results and next priorities
- Bi-weekly: Implement quick wins and launch new tests

**Periodic:**
- Monthly: Comprehensive performance review
- Quarterly: Major optimization planning and prioritization
- Semi-annually: Consider larger redesigns or value proposition changes
- Annually: Complete performance audit and strategy refresh

---

## Success Metrics Over Time

### Month 1 (Post-Launch)
- Establish baseline metrics
- Implement 3-5 quick wins
- Launch 2-3 A/B tests
- Target: 10-15% conversion improvement

### Month 2-3
- Run 4-6 A/B tests
- Implement winning variations
- Analyze segmentation patterns
- Target: Additional 5-10% improvement

### Month 4-6
- Deeper segmentation analysis
- Test major variations
- Consider audience-specific variants
- Target: Converging on optimal state

### Ongoing (Post Month 6)
- Incremental improvements via testing
- Address seasonal/trend-based changes
- Focus on retention and email optimization
- Target: 20-30% total improvement from baseline

---

## Escalation Path

**When to Escalate:**

1. **To Design Team:**
   - Major hypothesis requires redesign
   - Multiple tests affecting same section
   - Need for new content/messaging
   - User research reveals fundamental issues

2. **To Copywriter:**
   - Messaging needs refresh
   - Value proposition not resonating
   - Tone/voice inconsistency
   - User feedback indicates confusion

3. **To Backend/DevOps:**
   - Technical infrastructure needed
   - Form/database changes required
   - Integration improvements
   - Scaling/performance issues

4. **To Leadership:**
   - Business model change needed
   - Product pivot affecting positioning
   - Budget for major redesign
   - Market conditions warrant strategy review

---

## Rollback Procedures

If a test or change causes issues:

1. **Immediate Issues:**
   - Revert to previous version immediately
   - Document the issue
   - Investigate root cause
   - Plan fix before re-implementing

2. **Data Issues:**
   - Stop the test
   - Exclude affected data from analysis
   - Verify tracking implementation
   - Resume with fixed tracking

3. **Performance Issues:**
   - Revert change
   - Optimize before re-implementing
   - Load test before full launch
   - Monitor closely after re-launch

---

## Documentation & Learning

### Maintain Optimization Playbook

- **Winning strategies** documented and reusable
- **Failed hypotheses** archived with learnings
- **Segmentation insights** captured
- **Channel-specific optimizations** noted
- **Seasonal patterns** documented

### Team Knowledge Sharing

- Weekly optimization updates
- Monthly playbook reviews
- Quarterly learnings presentations
- Annual best practices documentation

---

## Success Criteria for Optimization Cycle

✓ Baseline metrics established and monitored
✓ Hypotheses developed from data
✓ A/B tests properly configured and executed
✓ Statistical rigor maintained (95% confidence)
✓ Winning variations promoted to production
✓ Learnings documented and shared
✓ Continuous improvement culture established
✓ Conversion rate improves 20%+ over 6 months
