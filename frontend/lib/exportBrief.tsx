import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import type { ReactElement } from "react";

export type MedicalHPI = {
  chief_complaint: string;
  history_of_present_illness: string;
  associated_symptoms: string[];
  pertinent_negatives: string[];
  severity?: number | null;
  onset?: string | null;
  location?: string | null;
  missing_information?: string[];
  source_quote?: string | null;
};

export function briefPayload(brief: MedicalHPI): string {
  return JSON.stringify({ version: 1, type: "lasoph-clinic-brief", brief });
}

export async function createBriefQrDataUrl(brief: MedicalHPI): Promise<string> {
  const payload = briefPayload(brief);
  if (payload.length > 2_000) {
    throw new Error("Brief is too large for a reliable QR payload; use a temporary hosted link.");
  }
  return QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 2 });
}

export async function downloadBriefPdf(
  brief: MedicalHPI,
): Promise<void> {
  const blob = await pdf(<BriefPdfDocument brief={brief} />).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `lasoph-clinic-brief-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", color: "#0f172a" },
  title: { fontSize: 20, marginBottom: 18 },
  section: { marginBottom: 14 },
  label: { fontSize: 9, color: "#475569", marginBottom: 4 },
  value: { fontSize: 11, lineHeight: 1.4 },
});

function PdfField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function BriefPdfDocument({ brief }: { brief: MedicalHPI }): ReactElement {
  return (
    <Document title="Lasoph clinician brief">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Lasoph clinician brief</Text>
        <PdfField label="Chief complaint" value={brief.chief_complaint} />
        <PdfField label="History of present illness" value={brief.history_of_present_illness} />
        <PdfField label="Associated symptoms" value={brief.associated_symptoms.join(", ") || "Not reported"} />
        <PdfField label="Pertinent negatives" value={brief.pertinent_negatives.join(", ") || "Not reported"} />
        <PdfField label="Onset" value={brief.onset || "Not reported"} />
        <PdfField label="Location" value={brief.location || "Not reported"} />
        <PdfField label="Severity" value={brief.severity ? `${brief.severity}/10` : "Not reported"} />
        {brief.missing_information && brief.missing_information.length > 0 && (
          <PdfField label="Missing information" value={brief.missing_information.join(", ")} />
        )}
        {brief.source_quote && <PdfField label="Patient quote" value={`“${brief.source_quote}”`} />}
        <Text style={styles.label}>Generated from patient-provided information. Not a diagnosis.</Text>
      </Page>
    </Document>
  );
}
