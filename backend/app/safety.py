"""Deterministic red-flag screening.

This layer intentionally runs before any LLM call. It is a conservative
screening mechanism, not a diagnostic engine. Matching a rule escalates the
case; it never downgrades care based on missing information.
"""

import re

from .schemas import (
    EmergencyRouting,
    RedFlagCheck,
    SymptomInput,
    TriggeredRule,
    UrgencyStatus,
)


def _text_for(input_data: SymptomInput) -> str:
    parts = [
        input_data.narrative,
        input_data.transcription or "",
        input_data.location or "",
        " ".join(input_data.associated_symptoms),
        " ".join(input_data.pertinent_negatives),
    ]
    return " ".join(parts).lower()


def _has(text: str, patterns: tuple[str, ...]) -> list[str]:
    return [pattern for pattern in patterns if re.search(pattern, text, re.IGNORECASE)]


def check_red_flags(input_data: SymptomInput) -> RedFlagCheck:
    """Return an immediate emergency result when a high-risk pattern is present.

    Rules use phrase-level regular expressions and combinations rather than
    relying on an LLM. A positive match should interrupt normal generation and
    show emergency instructions. False positives are safer than reassuring a
    person who may be in danger; local clinical governance must review these
    rules before deployment.
    """

    text = _text_for(input_data)
    rules: list[TriggeredRule] = []

    chest = _has(text, (r"\bchest\s+pain\b", r"\bpressure\s+in\s+(?:my|the)\s+chest\b"))
    radiation = _has(
        text,
        (
            r"\b(?:left\s+)?arm\b",
            r"\bshoulder\b",
            r"\bjaw\b",
            r"\bneck\b",
            r"\bback\b",
        ),
    )
    if chest and radiation:
        rules.append(
            TriggeredRule(
                rule_id="cardiac_chest_pain_radiation",
                category="cardiac_vascular",
                matched_terms=chest + radiation,
                rationale="Chest discomfort with radiation to an arm, jaw, neck, shoulder, or back can be an emergency.",
            )
        )

    dyspnea = _has(
        text,
        (
            r"\bsudden(?:ly)?\s+(?:severe\s+)?shortness\s+of\s+breath\b",
            r"\b(?:can't|cannot)\s+breathe\b",
            r"\bsevere\s+trouble\s+breathing\b",
        ),
    )
    if dyspnea:
        rules.append(
            TriggeredRule(
                rule_id="sudden_severe_dyspnea",
                category="cardiac_vascular",
                matched_terms=dyspnea,
                rationale="Sudden severe breathing difficulty needs immediate emergency assessment.",
            )
        )

    stroke = _has(
        text,
        (
            r"\b(?:facial|face)\s+droop(?:ing)?\b",
            r"\bslurred\s+speech\b",
            r"\bcan't\s+(?:move|raise)\s+(?:my\s+)?(?:arm|leg)\b",
            r"\bsudden\s+(?:weakness|numbness)\b",
        ),
    )
    if stroke:
        rules.append(
            TriggeredRule(
                rule_id="acute_neurologic_deficit",
                category="neurological",
                matched_terms=stroke,
                rationale="Sudden facial, speech, strength, or sensation changes can signal a time-sensitive emergency.",
            )
        )

    thunderclap = _has(
        text,
        (
            r"\bworst\s+headache\s+of\s+(?:my|the)\s+life\b",
            r"\bthunderclap\s+headache\b",
            r"\bsudden\s+(?:severe|爆裂)\s+headache\b",
        ),
    )
    if thunderclap:
        rules.append(
            TriggeredRule(
                rule_id="thunderclap_headache",
                category="neurological",
                matched_terms=thunderclap,
                rationale="A sudden, maximal-intensity headache requires emergency assessment.",
            )
        )

    meningismus = _has(text, (r"\bstiff\s+neck\b", r"\bneck\s+stiffness\b"))
    fever = _has(text, (r"\bhigh\s+fever\b", r"\b(?:fever|temperature)\s+(?:of\s+)?(?:39|40|41)\b"))
    if meningismus and fever:
        rules.append(
            TriggeredRule(
                rule_id="meningismus",
                category="neurological",
                matched_terms=meningismus + fever,
                rationale="Fever with neck stiffness can be a medical emergency.",
            )
        )

    rlq = _has(
        text,
        (
            r"\bright\s+lower\s+(?:quadrant|side)\b",
            r"\bright\s+lower\s+abdomen\b",
            r"\blower\s+right\s+(?:abdomen|belly|stomach)\b",
        ),
    )
    acute = _has(text, (r"\b(?:sudden|acute|severe|worsening)\b", r"\bstarted\s+(?:today|suddenly)\b"))
    abdominal_pain = _has(text, (r"\b(?:abdominal|belly|stomach)\s+pain\b", r"\bbelly\s+hurts?\b"))
    if rlq and (acute or abdominal_pain):
        rules.append(
            TriggeredRule(
                rule_id="acute_right_lower_quadrant_pain",
                category="trauma_surgical",
                matched_terms=rlq + acute + abdominal_pain,
                rationale="Acute right lower abdominal pain needs prompt in-person evaluation for surgical causes.",
            )
        )

    bleeding = _has(
        text,
        (
            r"\buncontrolled\s+bleeding\b",
            r"\bbleeding\s+(?:won't|will not|doesn't)\s+stop\b",
            r"\bspurting\s+blood\b",
            r"\bsoaking\s+through\s+(?:a\s+)?(?:bandage|dressings?)\b",
        ),
    )
    if bleeding:
        rules.append(
            TriggeredRule(
                rule_id="uncontrolled_bleeding",
                category="trauma_surgical",
                matched_terms=bleeding,
                rationale="Bleeding that cannot be controlled with firm pressure needs emergency help.",
            )
        )

    routing = (
        EmergencyRouting(
            message=(
                "Call your local emergency number now. Do not wait for an online "
                "explanation. If possible, have someone stay with you."
            )
        )
        if rules
        else None
    )
    return RedFlagCheck(
        status=UrgencyStatus.EMERGENCY if rules else UrgencyStatus.ROUTINE,
        triggered_rules=rules,
        routing=routing,
        evaluated_text=text,
    )
