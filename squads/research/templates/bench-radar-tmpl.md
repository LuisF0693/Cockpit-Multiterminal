# Technology Radar: {RADAR_TITLE}

**Type:** {COMPARISON_TYPE}  
**Date:** {DATE}  
**Subjects:** {SUBJECT_COUNT}

---

## Radar Legend

- **Adopt**: tecnologia madura e recomendada para uso imediato
- **Trial**: forte candidata para experimentação guiada
- **Assess**: promissora, mas ainda requer validação adicional
- **Hold**: manter distância por enquanto ou usar só em casos restritos

## Ring Definitions

| Ring | Meaning | Decision Rule |
|---|---|---|
| Adopt | alta maturidade e alto fit | score elevado + risco operacional controlado |
| Trial | valor claro com risco moderado | vale piloto estruturado |
| Assess | sinais positivos ainda incompletos | precisa mais evidência antes de adoção |
| Hold | baixo fit ou risco elevado | não priorizar no roadmap atual |

## Radar Summary

| Subject | Ring | Why |
|---|---|---|
{FOR_EACH_SUBJECT}
| {SUBJECT_NAME} | {RADAR_RING} | {RADAR_JUSTIFICATION} |
{END_FOR}

## Detailed Analysis

{FOR_EACH_RING}
### {RING_NAME}

{FOR_EACH_SUBJECT_IN_RING}
#### {SUBJECT_NAME}

**Positioning rationale**
{POSITIONING_RATIONALE}

**Signals**
{FOR_EACH_SIGNAL}
- {SIGNAL}
{END_FOR}

**Implications**
{FOR_EACH_IMPLICATION}
- {IMPLICATION}
{END_FOR}

{END_FOR}
{END_FOR}

## Recommended Actions

{FOR_EACH_SUBJECT}
### {SUBJECT_NAME}
- **Immediate move:** {IMMEDIATE_ACTION}
- **Validation needed:** {VALIDATION_ACTION}
- **Watch item:** {WATCH_ITEM}
{END_FOR}
