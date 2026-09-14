# Heri Health

Heri Health is an empathetic, multimodal triage copilot that turns health-related
panic into calm, understandable next steps for patients and a structured intake
brief for clinicians.

## Product promise

When someone feels unwell, Heri Health should:

1. Help the person describe what is happening without amplifying fear.
2. Identify urgency and direct them to an appropriate level of care.
3. Separate observed symptoms from online diagnoses and assumptions.
4. Produce a concise, clinically useful summary that a physician can review.

Heri Health is a triage and intake-support tool, not a diagnostic service. It must
not present a diagnosis as fact, replace emergency services, or delay urgent
care.

## Initial patient flow

1. **Start safely** — explain the tool's limits and check for immediate danger
   signals.
2. **Describe** — collect symptoms in the user's own words, with optional
   voice, image, and document input.
3. **Clarify** — ask only high-value follow-up questions: onset, location,
   severity, progression, associated symptoms, relevant history, medications,
   and risk context.
4. **Triage** — communicate a plain-language urgency recommendation:
   emergency care now, same-day care, prompt appointment, or self-monitoring
   with explicit return precautions.
5. **Prepare** — generate a clinician brief for user review and sharing.

## Clinician brief

The generated brief should distinguish:

- **Patient-reported:** direct observations and quotations.
- **Structured facts:** timing, severity, measurements, medications, allergies,
  and relevant history.
- **Red flags:** symptoms that affect urgency.
- **Uncertainty:** missing, ambiguous, or conflicting information.
- **Patient concerns:** diagnoses or explanations the patient is worried about,
  clearly labeled as concerns rather than findings.

The brief must never silently invent facts or convert a possibility into a
diagnosis.

## MVP scope

- Text-based intake with a calm, accessible conversational interface.
- Red-flag screening and explicit emergency escalation.
- Structured symptom extraction and clinician-brief generation.
- User confirmation before a brief is shared or exported.
- Audit-friendly record of source answers and generated fields.

Multimodal input, clinician integrations, accounts, and longitudinal history
should be added only after the safety-critical text flow is reliable.

## Safety principles

- Use supportive, non-alarming language without false reassurance.
- Ask for location before displaying emergency contact guidance.
- Treat uncertainty conservatively when a red flag cannot be ruled out.
- Keep triage guidance separate from diagnosis.
- Make the source of every clinician-brief field traceable.
- Minimize sensitive health data and obtain explicit consent for sharing.
- Provide an immediate path to human or emergency help at all times.

## Suggested next implementation slice

Build the text intake vertical slice first:

`conversation -> validated symptom facts -> red-flag assessment -> user-reviewed clinician brief`

## Implemented foundation

The repository now includes:

- `backend/app/schemas.py`: strict Pydantic contracts for symptoms, safety
  results, HPI briefs, patient summaries, and clarifying questions.
- `backend/app/safety.py`: deterministic emergency rules that run before model
  orchestration.
- `backend/app/prompts.py`: versioned prompt contracts for extraction, question
  generation, patient language, and clinician documentation.
- `backend/app/orchestrator.py`: provider-neutral safety-first workflow with a
  deterministic question fallback.
- `backend/app/sanitize.py`: patient-output diagnosis-language guardrail.
- `frontend/components/HeriHealthIntake.tsx`: mobile-first intake, questionnaire,
  dual view, and emergency overlay components.
- `frontend/lib/exportBrief.tsx`: QR payload and PDF download helpers.

Run the backend locally:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Run the frontend locally:

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000`. The page includes the calm intake screen,
question cards, the patient/doctor toggle, and clinician-brief export. Browser
voice dictation is opt-in where speech recognition is supported.

This is a safety-oriented engineering foundation, not a clinically validated
or legally cleared medical device. Before patient deployment, the red-flag
rules, prompts, escalation copy, privacy controls, identity/access model,
audit logging, retention, hosting, and clinical outputs require review by
qualified clinicians, security professionals, and applicable regulators.

This gives Heri Health a testable safety boundary before adding model orchestration,
multimodal processing, or external clinical integrations.

## Current privacy and model behavior

- Intake state is held in browser memory only; it is not written to
  `localStorage` or `sessionStorage`.
- Browser voice dictation is opt-in and only available where the browser exposes
  speech recognition. The browser or its speech provider may process audio;
  users are told this before starting it.
- The API returns `Cache-Control: no-store` and does not echo its internal copy
  of the evaluated narrative in the response.
- Emergency routing does not assume a country or use a hard-coded emergency
  number. A production location-routing service requires clinical review.
- Optional OpenAI assistance is disabled by default. When explicitly enabled,
  it produces a schema-validated **clinician-facing draft only**, after the
  deterministic emergency gate, with provider response storage disabled. See
  `backend/.env.example`.

## Release status

This repository is suitable for controlled engineering and clinician-led test
environments, not autonomous patient deployment. The mandatory remaining work
is tracked in [RELEASE_GATE.md](RELEASE_GATE.md).
# Heri-health
