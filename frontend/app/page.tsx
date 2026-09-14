"use client";

import { useState } from "react";

import { triage, type AnswerValue, type TriageResponse } from "../api/triage";
import { HeriHealthIntake } from "../components/HeriHealthIntake";

export default function HomePage() {
  const [narrative, setNarrative] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [response, setResponse] = useState<TriageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAnswer = (id: string, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [id]: value }));
  };

  const buildPayload = (currentNarrative: string, currentAnswers: Record<string, AnswerValue>) => {
    const extraAnswers = Object.entries(currentAnswers)
      .filter(([id]) => !["onset", "location", "severity", "associated"].includes(id))
      .map(([id, value]) => `${id}: ${Array.isArray(value) ? value.join(", ") : value}`)
      .join("\n");

    return {
      narrative: extraAnswers ? `${currentNarrative}\n\nAdditional intake answers:\n${extraAnswers}` : currentNarrative,
      duration: typeof currentAnswers.onset === "string" ? currentAnswers.onset : null,
      location: typeof currentAnswers.location === "string" ? currentAnswers.location : null,
      severity: typeof currentAnswers.severity === "string" ? Number(currentAnswers.severity) : null,
      associated_symptoms: Array.isArray(currentAnswers.associated)
        ? currentAnswers.associated
        : currentAnswers.associated
          ? [currentAnswers.associated]
          : [],
      pertinent_negatives: [],
      answers: currentAnswers,
      source: "text" as const,
    };
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await triage(buildPayload(narrative, answers));
      setResponse(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setNarrative("");
    setAnswers({});
    setResponse(null);
    setError(null);
    setLoading(false);
  };

  return (
    <HeriHealthIntake
      questions={response?.questions ?? []}
      brief={response?.doctor_hpi}
      response={response}
      narrative={narrative}
      answers={answers}
      loading={loading}
      error={error}
      onNarrativeChange={setNarrative}
      onAnswer={updateAnswer}
      onSubmit={submit}
      onReset={resetState}
    />
  );
}
