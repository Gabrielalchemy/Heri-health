# Heri Health clinical-AI strategy

## Product decision

Heri Health should not search arbitrary websites for each patient prompt or
claim that an LLM gives “accurate” medical feedback. Search rankings are not a
clinical evidence process, pages can change without review, and generated text
can be incomplete, inaccurate, or biased.

The initial Kenya product should instead be a **clinician-governed symptom
intake and care-navigation system**. It may explain only evidence retrieved
from a versioned, approved knowledge base; it must not diagnose, prescribe, or
replace emergency services or a clinician.

## Recommended architecture

```text
Patient input
  -> deterministic emergency gate
  -> structured fact extraction
  -> approved-source retrieval (RAG)
  -> constrained open-weight LLM
  -> citation / claim validator
  -> patient explanation + clinician brief
```

### 1. Emergency gate

The existing deterministic red-flag rules remain first. A positive result
stops LLM generation and presents immediate local emergency guidance. The LLM
cannot reduce or override urgency.

### 2. Curated knowledge base, not live web search

Ingest only clinician-approved, versioned sources, starting with Kenya Ministry
of Health material and WHO guidance. Each document needs an owner, source URL,
publication date, review date, jurisdiction, language, and clinical sign-off.

The user sees the source title and a link for every health-information claim.
If retrieval finds no approved evidence, Heri Health says so and recommends an
appropriate human-care path rather than generating an answer from memory.

### 3. Open-weight model

Use a self-hosted model so patients are not charged and health narratives do
not need to be sent to a general hosted AI API. “Free to users” still requires
funding for secure compute, operations, clinical review, and support.

**Initial technical candidate: Qwen2.5-7B-Instruct.** Its published model card
lists an Apache-2.0 licence and it is practical as a controlled text-generation
component. It should be used for plain-language rewriting, structured facts,
and citation-bound summaries—not for diagnostic inference.

**Do not select a medical model merely because it is labelled medical.**
MedGemma is an open medical model family, but its own documentation says it is
a starting point and that its outputs are not intended to directly inform
clinical diagnosis, management, or treatment without independent validation.

### 4. Output controls

- Require structured JSON: reported facts, missing information, evidence IDs,
  uncertainty, and next-step category.
- Reject an answer if a claim has no retrieved evidence ID.
- Block diagnoses, prescriptions, dosage advice, definitive reassurance, and
  unsupported probabilities from patient-facing text.
- Use templates, rather than the LLM, for emergency and crisis messaging.
- Log model version, knowledge-base version, retrieval IDs, rule decisions, and
  reviewer corrections without storing unnecessary health data.

### 5. Human and clinical governance

Before any public pilot, appoint a Kenyan clinical lead and a data-protection
owner. Establish a medical-content review board, report-a-problem path, incident
runbook, rollback process, and clinician review workflow for escalated or
uncertain cases.

## Kenya launch requirements

Health information is sensitive personal data under Kenya’s Data Protection
Act. The Act limits processing of health data to healthcare-provider
responsibility or a person subject to professional secrecy, subject to the
Act’s conditions. The Digital Health Act requires consent, confidentiality,
and reasonable administrative, technical, and physical safeguards for sensitive
health data.

Before handling real patient information, obtain Kenyan legal advice and engage
the Office of the Data Protection Commissioner on controller/processor status,
registration, data-protection impact assessment, cross-border transfer, and
retention. The exact obligations depend on Heri Health’s legal entity, care
model, partners, and data flows.

## Global expansion approach

Do not launch the Kenya rules worldwide. Expand country by country, with a
separate clinical owner, privacy assessment, emergency-routing dataset,
approved content set, language/accessibility review, and regulatory assessment
for each jurisdiction.

## Validation before patient use

1. Define precise intended use and exclusions (for example, adults only during
   the first pilot).
2. Build a de-identified clinician-authored evaluation set covering emergencies,
   routine symptoms, pregnancy, children, mental-health risk, ambiguous language,
   Swahili/English, and adversarial inputs.
3. Test the safety gate, retrieval coverage, citations, claim validator, model
   refusal behaviour, and clinician-brief factuality on every release.
4. Run a supervised pilot with partner clinicians and measure missed
   escalations, unsupported claims, comprehension, equity, latency, and patient
   outcomes. Stop or roll back on predefined safety thresholds.

## Sources

1. World Health Organization. [Ethics and governance of artificial intelligence
   for health: guidance on large multi-modal models](https://www.who.int/publications/b/70584),
   2024.
2. World Health Organization. [WHO releases AI ethics and governance guidance
   for large multi-modal models](https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models),
   2024.
3. Kenya Law. [Data Protection Act (Cap. 411C), sections 45–46](https://new.kenyalaw.org/akn/ke/act/2019/24/eng%402022-12-31/source).
4. Kenya Law. [Digital Health Act, 2023, sections 31–34](https://new.kenyalaw.org/akn/ke/act/2023/15/eng%402023-11-24/source).
5. Office of the Data Protection Commissioner. [Registration FAQs](https://www.odpc.go.ke/faqs/).
6. Qwen. [Qwen2.5-7B-Instruct model card](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct).
7. Google DeepMind. [MedGemma](https://deepmind.google/models/gemma/medgemma/).
