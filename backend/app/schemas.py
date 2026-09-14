"""Validated domain contracts shared by the Lasoph safety and AI layers."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UrgencyStatus(str, Enum):
    EMERGENCY = "EMERGENCY"
    URGENT = "URGENT"
    ROUTINE = "ROUTINE"


class Sex(str, Enum):
    FEMALE = "female"
    MALE = "male"
    INTERSEX = "intersex"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"
    UNKNOWN = "unknown"


class UserDemographics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    age: int | None = Field(default=None, ge=0, le=130)
    sex: Sex = Sex.UNKNOWN


class SymptomInput(BaseModel):
    """Patient-reported information; values are not clinical diagnoses."""

    model_config = ConfigDict(extra="forbid")

    narrative: str = Field(min_length=1, max_length=12_000)
    transcription: str | None = Field(default=None, max_length=12_000)
    duration: str | None = Field(default=None, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    severity: int | None = Field(default=None, ge=1, le=10)
    demographics: UserDemographics = Field(default_factory=UserDemographics)
    associated_symptoms: list[str] = Field(default_factory=list, max_length=40)
    pertinent_negatives: list[str] = Field(default_factory=list, max_length=40)
    answers: dict[str, str | list[str]] = Field(default_factory=dict, max_length=40)
    source: Literal["text", "voice", "image", "mixed"] = "text"

    @field_validator("associated_symptoms", "pertinent_negatives")
    @classmethod
    def normalize_terms(cls, values: list[str]) -> list[str]:
        return [value.strip() for value in values if value.strip()]


class TriggeredRule(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rule_id: str
    category: Literal["cardiac_vascular", "neurological", "trauma_surgical"]
    matched_terms: list[str] = Field(min_length=1)
    rationale: str


class EmergencyRouting(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str
    call_emergency_number: str | None = None
    nearest_er_query: str | None = None
    do_not_drive_alone: bool = True


class RedFlagCheck(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: UrgencyStatus
    triggered_rules: list[TriggeredRule] = Field(default_factory=list)
    routing: EmergencyRouting | None = None
    evaluated_text: str = Field(exclude=True)


class MedicalHPI(BaseModel):
    """Clinician-facing intake summary with explicit uncertainty."""

    model_config = ConfigDict(extra="forbid")

    chief_complaint: str
    history_of_present_illness: str
    associated_symptoms: list[str] = Field(default_factory=list)
    pertinent_negatives: list[str] = Field(default_factory=list)
    severity: int | None = Field(default=None, ge=1, le=10)
    onset: str | None = None
    location: str | None = None
    patient_concerns: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    source_quote: str | None = None


class PatientSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    explanation: str = Field(min_length=1, max_length=4_000)
    possible_categories: list[str] = Field(min_length=1, max_length=3)
    self_care_tips: list[str] = Field(default_factory=list, max_length=8)
    when_to_seek_care: list[str] = Field(min_length=1, max_length=12)
    urgency: UrgencyStatus
    disclaimer: str = (
        "Lasoph provides intake support and general education, not a diagnosis."
    )


class ClarifyingQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    question: str
    answer_type: Literal["single_choice", "multi_choice", "short_text", "scale"]
    options: list[str] = Field(default_factory=list, max_length=8)
    required: bool = True


class TriageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    red_flag_check: RedFlagCheck
    questions: list[ClarifyingQuestion]
    patient_summary: PatientSummary | None = None
    doctor_hpi: MedicalHPI | None = None
