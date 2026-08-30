/* Slot-aware document list: a download link renders only when the registry
   actually has a file, otherwise the row routes to the on-site page or the
   staffed text line. One cell per category. */
import { DocumentList, previewDict, previewLocale } from "westchase-gi";

export function NewPatient() {
  return <DocumentList category="new-patient" locale={previewLocale} dict={previewDict} />;
}
export function ProcedurePrep() {
  return <DocumentList category="procedure-prep" locale={previewLocale} dict={previewDict} />;
}
export function DiseaseInfo() {
  return <DocumentList category="disease-info" locale={previewLocale} dict={previewDict} />;
}
