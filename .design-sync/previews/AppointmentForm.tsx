/* The patient-facing appointment request. Composes FieldGroup + Field with
   Input, NativeSelect and Textarea; patient-facing selects stay native. */
import { AppointmentForm, previewDict, previewLocale } from "westchase-gi";
export function Default() {
  return <AppointmentForm locale={previewLocale} dict={previewDict} />;
}
