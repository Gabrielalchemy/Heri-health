from app.safety import check_red_flags
from app.schemas import SymptomInput, UrgencyStatus
from app.orchestrator import build_clarifying_questions, triage_input


def test_chest_pain_with_arm_radiation_is_emergency() -> None:
    result = check_red_flags(
        SymptomInput(narrative="I have chest pain going into my left arm.")
    )
    assert result.status is UrgencyStatus.EMERGENCY
    assert result.triggered_rules[0].rule_id == "cardiac_chest_pain_radiation"
    assert result.routing is not None


def test_plain_migraine_story_does_not_trigger_emergency_rule() -> None:
    result = check_red_flags(
        SymptomInput(narrative="A throbbing headache with light sensitivity since this morning.")
    )
    assert result.status is UrgencyStatus.ROUTINE
    assert result.triggered_rules == []


def test_right_lower_quadrant_acute_pain_is_emergency() -> None:
    result = check_red_flags(
        SymptomInput(narrative="Severe acute pain in the right lower abdomen.")
    )
    assert result.status is UrgencyStatus.EMERGENCY
    assert result.triggered_rules[0].rule_id == "acute_right_lower_quadrant_pain"


def test_sanitizer_removes_definitive_language() -> None:
    from app.sanitize import sanitize_patient_output

    result = sanitize_patient_output("You have gastritis. Diagnosis: dehydration.")
    assert "You have" not in result
    assert "Diagnosis:" not in result
    assert "may fit patterns" in result


def test_answered_follow_up_is_not_returned_again() -> None:
    questions = build_clarifying_questions(
        SymptomInput(
            narrative="A mild headache since this morning.",
            answers={"progression": "Worse"},
        )
    )
    assert all(question.id != "progression" for question in questions)


def test_non_emergency_triage_returns_source_traceable_summary() -> None:
    result = triage_input(
        SymptomInput(
            narrative="Mild headache since this morning.",
            answers={"progression": "Worse"},
        )
    )
    assert result.patient_summary is not None
    assert result.doctor_hpi is not None
    assert result.doctor_hpi.source_quote == "Mild headache since this morning."
    assert "Progression: Worse." in result.doctor_hpi.history_of_present_illness


def test_internal_screening_text_is_not_serialized_to_the_browser() -> None:
    result = check_red_flags(SymptomInput(narrative="A mild headache since this morning."))
    assert "evaluated_text" not in result.model_dump()


def test_emergency_routing_does_not_assume_a_country_number() -> None:
    result = check_red_flags(SymptomInput(narrative="Chest pain going into my left arm."))
    assert result.routing is not None
    assert result.routing.call_emergency_number is None
    assert "local emergency number" in result.routing.message
