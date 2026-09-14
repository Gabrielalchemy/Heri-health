"""Patient-facing output guardrails."""

import re


_DIAGNOSIS_PATTERNS = (
    re.compile(r"\b(?:you|this)\s+(?:have|has)\s+([^.?!]+)", re.IGNORECASE),
    re.compile(r"\bdiagnosis\s*:\s*([^.?!]+)", re.IGNORECASE),
    re.compile(r"\byou\s+are\s+suffering\s+from\s+([^.?!]+)", re.IGNORECASE),
    re.compile(r"\bthis\s+is\s+(?:definitely|certainly)\s+([^.?!]+)", re.IGNORECASE),
)


def sanitize_patient_output(text: str) -> str:
    """Rewrite definitive diagnostic phrasing without hiding the original topic."""

    sanitized = text.strip()
    for pattern in _DIAGNOSIS_PATTERNS:
        sanitized = pattern.sub(
            lambda match: f"Your symptoms may fit patterns seen with {match.group(1).strip()}, but only a qualified clinician can assess the cause",
            sanitized,
        )
    return sanitized
