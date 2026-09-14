"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, Mic, PhoneCall, ShieldAlert, Sparkles, Stethoscope } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { AnswerValue, TriageQuestion, TriageResponse } from "../api/triage";
import { downloadBriefPdf } from "../lib/exportBrief";

type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};
type SpeechConstructor = new () => BrowserSpeechRecognition;

type Brief = NonNullable<TriageResponse["doctor_hpi"]>;

type Props = {
  questions: TriageQuestion[];
  brief?: Brief | null;
  response?: TriageResponse | null;
  narrative: string;
  answers: Record<string, AnswerValue>;
  loading: boolean;
  error: string | null;
  onNarrativeChange: (value: string) => void;
  onAnswer: (id: string, value: AnswerValue) => void;
  onSubmit: () => void;
  onDemoLoad: () => void;
  onReset: () => void;
};

function statusLabel(status: TriageResponse["red_flag_check"]["status"]) {
  return status === "EMERGENCY" ? "Emergency" : status === "URGENT" ? "Urgent" : "Routine";
}

export function VoiceIntakeHero({ onStartListening, listening, speechSupported }: { onStartListening: () => void; listening: boolean; speechSupported: boolean }) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-sky-50 to-teal-50 p-6 shadow-sm">
      <p className="mb-2 text-sm font-semibold text-teal-700">Start safely</p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Tell Lasoph what is going on.</h1>
      <p className="mt-2 max-w-md text-slate-600">Share what you are experiencing in your own words. Lasoph helps organize your story without diagnosing you.</p>
      <button type="button" onClick={onStartListening} disabled={!speechSupported || listening} className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-200 disabled:cursor-not-allowed disabled:opacity-60" aria-label={listening ? "Listening" : "Start voice input"}>
        <Mic className="h-8 w-8" />
      </button>
      <p className="mt-4 text-center text-sm text-slate-600">{speechSupported ? (listening ? "Listening… stop in your browser when you are done." : "Tap the microphone to dictate. Your browser may use a speech service to process audio.") : "Voice input is not supported by this browser. You can type below."}</p>
    </section>
  );
}

export function QuestionCard({
  question,
  value,
  onAnswer,
}: {
  question: TriageQuestion;
  value?: AnswerValue;
  onAnswer: (value: AnswerValue) => void;
}) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const select = (next: string) => {
    if (question.answer_type === "multi_choice") {
      onAnswer(selected.includes(next) ? selected.filter((item) => item !== next) : [...selected, next]);
    } else {
      onAnswer(next);
    }
  };

  return (
    <motion.article initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-medium text-slate-900">{question.question}</h2>
      {question.answer_type === "scale" ? (
        <div className="mt-5">
          <input aria-label={question.question} type="range" min="1" max="10" value={typeof value === "string" && value ? value : "1"} onChange={(event) => onAnswer(event.target.value)} className="w-full accent-teal-600" />
          <div className="mt-2 flex justify-between text-xs text-slate-500"><span>1 Mild</span><span aria-live="polite">{value || 1}</span><span>10 Worst</span></div>
        </div>
      ) : question.options.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {question.options.map((option) => (
            <button key={option} type="button" aria-pressed={selected.includes(option)} onClick={() => select(option)} className={`rounded-full border px-4 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${selected.includes(option) ? "border-teal-700 bg-teal-50 text-teal-900" : "border-slate-300 text-slate-700 hover:border-teal-500"}`}>
              {option}
            </button>
          ))}
        </div>
      ) : (
        <input aria-label={question.question} value={typeof value === "string" ? value : ""} onChange={(event) => onAnswer(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-300 p-3 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600" placeholder="Type your answer" />
      )}
    </motion.article>
  );
}

export function DualView({ brief, summary }: { brief: Brief; summary: NonNullable<TriageResponse["patient_summary"]> | null }) {
  const [mode, setMode] = useState<"patient" | "doctor">("patient");
  const [consent, setConsent] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportBrief = async () => {
    if (!consent) return;
    setExporting(true);
    setExportError(null);
    try {
      await downloadBriefPdf(brief);
    } catch {
      setExportError("We could not create the PDF. Your information has not been shared.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-5 flex rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => setMode("patient")} className={`flex-1 rounded-lg px-3 py-2 text-sm ${mode === "patient" ? "bg-white font-semibold shadow-sm" : "text-slate-600"}`}><Sparkles className="mr-1 inline h-4 w-4" />Patient view</button>
        <button type="button" onClick={() => setMode("doctor")} className={`flex-1 rounded-lg px-3 py-2 text-sm ${mode === "doctor" ? "bg-white font-semibold shadow-sm" : "text-slate-600"}`}><Stethoscope className="mr-1 inline h-4 w-4" />Doctor brief</button>
      </div>
      {mode === "patient" ? (
        <div>
          <h2 className="text-xl font-semibold">Your intake is ready to review</h2>
          <p className="mt-3 leading-7 text-slate-700">{summary?.explanation || "This summary organizes what you told us. It is not a diagnosis."}</p>
          {summary && <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><strong>When to seek care:</strong><ul className="mt-2 list-disc space-y-1 pl-5">{summary.when_to_seek_care.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        </div>
      ) : (
        <dl className="space-y-4 text-sm">
          <h2 className="text-xl font-semibold text-slate-900">Clinical intake brief</h2>
          <Field label="Chief Complaint" value={brief.chief_complaint} />
          <Field label="History of Present Illness" value={brief.history_of_present_illness} />
          <Field label="Associated Symptoms" value={brief.associated_symptoms.join(", ") || "Not reported"} />
          <Field label="Pertinent Negatives" value={brief.pertinent_negatives.join(", ") || "Not reported"} />
          <Field label="Onset / Severity" value={`${brief.onset || "Not reported"} / ${brief.severity ?? "Not reported"}`} />
          {brief.missing_information.length > 0 && <Field label="Missing Information" value={brief.missing_information.join(", ")} />}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex gap-3 text-sm text-slate-700">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-teal-700" />
              <span>I reviewed this brief and consent to downloading this health information to this device.</span>
            </label>
            <button type="button" disabled={!consent || exporting} onClick={() => void exportBrief()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
              {exporting ? "Creating PDF..." : "Download clinician brief"}
            </button>
            <p className="mt-2 text-xs text-slate-500">Lasoph does not upload the PDF. It is created in your browser.</p>
            {exportError && <p role="alert" className="mt-2 text-sm text-red-700">{exportError}</p>}
          </div>
        </dl>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-semibold text-slate-500">{label}</dt><dd className="mt-1 text-slate-900">{value}</dd></div>;
}

export function EmergencyOverlay({ response, onClose }: { response: TriageResponse; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button, a[href]");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const routing = response.red_flag_check.routing;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-4 sm:items-center sm:justify-center" role="presentation">
      <div ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="emergency-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl focus:outline-none">
        <ShieldAlert className="h-10 w-10 text-red-700" aria-hidden="true" />
        <h2 id="emergency-title" className="mt-3 text-2xl font-bold text-slate-900">Get emergency help now</h2>
        <p className="mt-2 text-slate-700">{routing?.message || "Some symptoms may need immediate in-person assessment. Do not wait for an online explanation."}</p>
        {response.red_flag_check.triggered_rules.length > 0 && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-900">{response.red_flag_check.triggered_rules[0].rationale}</p>}
        {routing?.call_emergency_number ? <a href={`tel:${routing.call_emergency_number}`} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"><PhoneCall className="h-5 w-5" aria-hidden="true" />Call {routing.call_emergency_number}</a> : <p className="mt-6 rounded-xl bg-red-700 px-4 py-3 text-center font-semibold text-white"><PhoneCall className="mr-2 inline h-5 w-5" aria-hidden="true" />Call your local emergency number now</p>}
        <button type="button" onClick={onClose} className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600">I understand</button>
      </div>
    </div>
  );
}

export function LasophIntake({ questions, brief, response, narrative, answers, loading, error, onNarrativeChange, onAnswer, onSubmit, onDemoLoad, onReset }: Props) {
  const [step, setStep] = useState<"narrative" | "questions" | "summary">("narrative");
  const [showEmergency, setShowEmergency] = useState(true);
  const [listening, setListening] = useState(false);
  const isEmergency = response?.red_flag_check.status === "EMERGENCY";
  const canContinue = narrative.trim().length > 0;
  const speechConstructor = typeof window === "undefined" ? undefined : ((window as Window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: SpeechConstructor }).webkitSpeechRecognition);
  const startListening = () => {
    if (!speechConstructor) return;
    const recognition = new speechConstructor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => onNarrativeChange(`${narrative}${narrative ? " " : ""}${event.results[0][0].transcript}`.trim());
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-5 bg-slate-50 p-4 text-slate-900">
      <VoiceIntakeHero onStartListening={startListening} listening={listening} speechSupported={Boolean(speechConstructor)} />
      <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">For your privacy, Lasoph does not save this intake in this browser after you leave this page. Do not use it for emergencies; call your local emergency number instead.</p>
      <nav aria-label="Intake progress" className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span className={step === "narrative" ? "text-teal-700" : ""}>1. Describe</span><span className={step === "questions" ? "text-teal-700" : ""}>2. Clarify</span><span className={step === "summary" ? "text-teal-700" : ""}>3. Review</span>
      </nav>
      {response && !isEmergency && <div className={`flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${response.red_flag_check.status === "URGENT" ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`} role="status"><CheckCircle2 className="h-5 w-5" />Urgency: {statusLabel(response.red_flag_check.status)}</div>}
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-900"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />{error}</div>}
      <AnimatePresence mode="wait">
        {step === "narrative" && (
          <motion.section key="narrative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label htmlFor="narrative" className="font-medium">What is happening?</label>
            <textarea id="narrative" value={narrative} onChange={(event) => onNarrativeChange(event.target.value)} rows={6} maxLength={12000} className="mt-3 w-full rounded-xl border border-slate-300 p-3 leading-6 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600" placeholder="Describe your symptoms, when they started, and what concerns you most." />
            <button type="button" disabled={!canContinue || loading} onClick={() => { setStep("questions"); onSubmit(); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">{loading && <Loader2 className="h-5 w-5 animate-spin" />}Continue safely</button>
          </motion.section>
        )}
        {step === "questions" && (
          <motion.section key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {questions.map((question) => <QuestionCard key={question.id} question={question} value={answers[question.id]} onAnswer={(value) => onAnswer(question.id, value)} />)}
            <button type="button" disabled={loading} onClick={onSubmit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{loading && <Loader2 className="h-5 w-5 animate-spin" />}Update triage</button>
            {response && <button type="button" onClick={() => setStep("summary")} className="w-full rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700">Review summary</button>}
          </motion.section>
        )}
        {step === "summary" && brief && <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><DualView brief={brief} summary={response?.patient_summary ?? null} /></motion.div>}
      </AnimatePresence>
      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={() => { onDemoLoad(); setStep("questions"); }} className="mx-auto block text-xs text-slate-500 underline hover:text-teal-700">Load demo scenario</button>
        <button type="button" onClick={onReset} className="text-xs font-medium text-slate-500 underline hover:text-red-700">Clear session</button>
      </div>
      {isEmergency && showEmergency && response && <EmergencyOverlay response={response} onClose={() => setShowEmergency(false)} />}
    </main>
  );
}
