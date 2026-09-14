"""Provider-neutral orchestration with the safety layer as the first gate."""

from .safety import check_red_flags
from .llm import build_clinician_hpi
from .schemas import (
    ClarifyingQuestion,
    MedicalHPI,
    PatientSummary,
    SymptomInput,
    TriageResponse,
    UrgencyStatus,
)


def build_clarifying_questions(input_data: SymptomInput) -> list[ClarifyingQuestion]:
    """Create deterministic fallback questions when an LLM provider is absent."""

    questions: list[ClarifyingQuestion] = []
    answered = input_data.answers
    if not input_data.duration and "onset" not in answered:
        questions.append(
            ClarifyingQuestion(
                id="onset",
                question="When did this start, and did it begin suddenly or gradually?",
                answer_type="short_text",
            )
        )
    if not input_data.location and "location" not in answered:
        questions.append(
            ClarifyingQuestion(
                id="location",
                question="Where exactly do you feel it?",
                answer_type="short_text",
            )
        )
    if input_data.severity is None and "severity" not in answered:
        questions.append(
            ClarifyingQuestion(
                id="severity",
                question="How strong is it right now, from 1 (mild) to 10 (worst)?",
                answer_type="scale",
            )
        )
    if not input_data.associated_symptoms and "associated" not in answered:
        questions.append(
            ClarifyingQuestion(
                id="associated",
                question="Which of these are also happening?",
                answer_type="multi_choice",
                options=["Fever", "Vomiting", "Dizziness", "Breathing trouble", "None of these"],
            )
        )
    if len(questions) < 3 and "progression" not in answered:
        questions.append(
            ClarifyingQuestion(
                id="progression",
                question="Is it getting better, worse, or staying about the same?",
                answer_type="single_choice",
                options=["Better", "Worse", "About the same"],
            )
        )
    return questions[:5]


def build_source_traceable_summary(
    input_data: SymptomInput,
    urgency: UrgencyStatus,
) -> tuple[PatientSummary, MedicalHPI]:
    """Create a conservative summary from patient-provided fields only."""

    answers = input_data.answers
    onset = input_data.duration or _answer_text(answers.get("onset"))
    location = input_data.location or _answer_text(answers.get("location"))
    severity = input_data.severity or _answer_int(answers.get("severity"))
    associated = input_data.associated_symptoms or _answer_list(answers.get("associated"))
    progression = _answer_text(answers.get("progression"))
    missing_information = [
        label
        for label, value in (
            ("Onset", onset),
            ("Location", location),
            ("Severity", severity),
            ("Associated symptoms", associated),
            ("Progression", progression),
        )
        if not value
    ]
    history_parts = [input_data.narrative.strip()]
    if onset:
        history_parts.append(f"Onset: {onset}.")
    if location:
        history_parts.append(f"Location: {location}.")
    if severity:
        history_parts.append(f"Reported severity: {severity}/10.")
    if associated:
        history_parts.append(f"Associated symptoms: {', '.join(associated)}.")
    if progression:
        history_parts.append(f"Progression: {progression}.")

    hpi = MedicalHPI(
        chief_complaint=input_data.narrative.strip(),
        history_of_present_illness=" ".join(history_parts),
        associated_symptoms=associated,
        pertinent_negatives=input_data.pertinent_negatives,
        severity=severity,
        onset=onset,
        location=location,
        missing_information=missing_information,
        source_quote=input_data.narrative.strip(),
    )
    summary = PatientSummary(
        explanation=(
            "Heri Health organized the information you provided for review. "
            "This is not a diagnosis or a substitute for professional care."
        ),
        possible_categories=["Reported symptoms require clinical context"],
        self_care_tips=[],
        when_to_seek_care=[
            "Seek urgent help if symptoms become severe, suddenly worsen, or you feel unsafe.",
            "Use the recommended level of care if your symptoms do not improve.",
        ],
        urgency=urgency,
    )
    return summary, hpi


def _answer_text(value: str | list[str] | None) -> str | None:
    if isinstance(value, list):
        return ", ".join(value) or None
    return value.strip() if isinstance(value, str) and value.strip() else None


def _answer_list(value: str | list[str] | None) -> list[str]:
    if isinstance(value, list):
        return [item.strip() for item in value if item.strip()]
    return [value.strip()] if isinstance(value, str) and value.strip() else []


def _answer_int(value: str | list[str] | None) -> int | None:
    text = _answer_text(value)
    if not text:
        return None
    try:
        number = int(text)
    except ValueError:
        return None
    return number if 1 <= number <= 10 else None


def triage_input(input_data: SymptomInput) -> TriageResponse:
    """Run the non-LLM safety gate and return the next safe workflow step."""

    red_flags = check_red_flags(input_data)
    summary = None
    doctor_hpi = None
    if not red_flags.triggered_rules:
        summary, doctor_hpi = build_source_traceable_summary(input_data, red_flags.status)
        doctor_hpi = build_clinician_hpi(input_data) or doctor_hpi
    return TriageResponse(
        red_flag_check=red_flags,
        questions=[] if red_flags.triggered_rules else build_clarifying_questions(input_data),
        patient_summary=summary,
        doctor_hpi=doctor_hpi,
    )
