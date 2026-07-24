// The patient-education library, ported 1:1 by topic from the old site's
// 17-topic article library, plus one on-site page for every disease
// information sheet the old site offered only as a (dead) PDF. Bodies use
// original plain-language EN/ES writing (the old library was ASGE-licensed
// content that does not transfer), expanded into VI/KO/AR by machine
// translation; all translated copy awaits native-speaker review.

import type { EducationTopic } from "../types";
import { procedures } from "./procedures";
import { conditionsA } from "./conditions-a";
import { conditionsB } from "./conditions-b";

export const educationTopics: EducationTopic[] = [
  ...procedures,
  ...conditionsA,
  ...conditionsB,
];

export const educationByGroup = {
  procedures: educationTopics
    .filter((t) => t.group === "procedures")
    .sort((a, b) => a.title.en.localeCompare(b.title.en)),
  conditions: educationTopics
    .filter((t) => t.group === "conditions")
    .sort((a, b) => a.title.en.localeCompare(b.title.en)),
};

export function getTopic(slug: string): EducationTopic | undefined {
  return educationTopics.find((t) => t.slug === slug);
}

/** Education page for a disease-information-sheet document id, if one exists. */
export function topicForDocument(docId: string): EducationTopic | undefined {
  return educationTopics.find((t) => t.relatedDocId === docId);
}
