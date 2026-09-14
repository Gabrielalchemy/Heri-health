export type AnswerValue = string | string[];

export type TriageQuestion = {
  id: string;
  question: string;
  answer_type: "single_choice" | "multi_choice" | "short_text" | "scale";
  options: string[];
  required: boolean;
};

export type TriagePayload = {
  narrative: string;
  transcription?: string | null;
  duration?: string | null;
  location?: string | null;
  severity?: number | null;
  associated_symptoms: string[];
  pertinent_negatives: string[];
  answers: Record<string, AnswerValue>;
  source: "text" | "voice" | "image" | "mixed";
};

export type TriageResponse = {
  red_flag_check: {
    status: "EMERGENCY" | "URGENT" | "ROUTINE";
    triggered_rules: Array<{
      rule_id: string;
      category: "cardiac_vascular" | "neurological" | "trauma_surgical";
      matched_terms: string[];
      rationale: string;
    }>;
    routing: {
      message: string;
      call_emergency_number: string;
      nearest_er_query: string;
      do_not_drive_alone: boolean;
    } | null;
  };
  questions: TriageQuestion[];
  patient_summary: {
    explanation: string;
    possible_categories: string[];
    self_care_tips: string[];
    when_to_seek_care: string[];
    urgency: "EMERGENCY" | "URGENT" | "ROUTINE";
    disclaimer: string;
  } | null;
  doctor_hpi: {
    chief_complaint: string;
    history_of_present_illness: string;
    associated_symptoms: string[];
    pertinent_negatives: string[];
    severity: number | null;
    onset: string | null;
    location: string | null;
    patient_concerns: string[];
    missing_information: string[];
    source_quote: string | null;
  } | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function triage(payload: TriagePayload): Promise<TriageResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/v1/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("We could not reach Heri Health. Check your connection and try again.");
  }

  if (!response.ok) {
    let detail = "Heri Health could not process this intake.";
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Keep the user-facing message stable when the server does not return JSON.
    }
    throw new Error(detail);
  }

  return (await response.json()) as TriageResponse;
}
