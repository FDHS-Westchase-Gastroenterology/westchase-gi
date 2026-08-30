/* The evidence-gated first-visit language chooser.
 *
 * It auto-opens ONLY on positive evidence of a mismatch: the browser's top
 * supported language differs from the served locale and the visitor holds no
 * remembered choice. A headless browser reports en-US, so rendering the
 * ENGLISH page produces no evidence and no dialog — a blank card. Rendering
 * the SPANISH page is the real, honest way to see the open state: an
 * English-speaking visitor who landed on /es is exactly the case this
 * component exists for. */

import { LanguageChooser, previewDictEs } from "westchase-gi";

export function EvidenceOfAMismatch() {
  return <LanguageChooser locale="es" dict={previewDictEs} />;
}
