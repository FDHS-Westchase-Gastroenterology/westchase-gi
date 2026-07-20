import reviewTargets from "./review-targets.json";
import { nursePractitioners, physicians } from "./providers";

const REVIEW_TARGET_KEYS = [
  "master",
  "practice",
  "awad",
  "chang",
  "mendoza",
  "taylor",
] as const;

export type ReviewTargetKey = (typeof REVIEW_TARGET_KEYS)[number];
export type ReviewAssetKind = "png" | "svg" | "pdf";

export type ReviewFlyerAsset = {
  filename: string;
  sha256: string;
  kind: ReviewAssetKind;
  contentType: string;
};

export type ReviewFlyer = {
  key: ReviewTargetKey;
  destination: string;
  title: string;
  credentials: string | null;
  description: string;
  askEn: string;
  askEs: string;
  scanEn: string;
  scanEs: string;
  roleEn: string | null;
  roleEs: string | null;
  showLanguages: boolean;
  assets: Record<ReviewAssetKind, ReviewFlyerAsset>;
};

const CONTENT_TYPES: Record<ReviewAssetKind, string> = {
  png: "image/png",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

const physicianById = new Map(physicians.map((provider) => [provider.id, provider]));
const nurseById = new Map(
  nursePractitioners.individuals.map((provider) => [provider.id, provider]),
);

function providerCopy(key: ReviewTargetKey, providerId: string) {
  const physician = physicianById.get(providerId);
  const nurse = nurseById.get(providerId);
  const provider = physician ?? nurse;
  if (!provider) throw new Error(`Unknown review provider: ${providerId}`);

  const displayName = physician ? `Dr. ${provider.name}` : provider.name;
  const shortName = physician
    ? `Dr. ${provider.name.split(" ").at(-1)}`
    : provider.name;
  const shortNameEs = physician
    ? `el Dr. ${provider.name.split(" ").at(-1)}`
    : provider.name;
  const reviewNameEs = physician
    ? `al Dr. ${provider.name.split(" ").at(-1)}`
    : `a ${provider.name}`;

  return {
    title: displayName,
    credentials: provider.credentials,
    description:
      key === "mendoza"
        ? `Opens ${shortName}’s direct Google review form. This replaces the earlier interim code.`
        : `Opens ${shortName}’s own Google review form.`,
    askEn: `How was your visit with ${shortName}?`,
    askEs: `¿Cómo fue su visita con ${shortNameEs}?`,
    scanEn: `Scan with your phone camera to leave ${shortName} a Google review`,
    scanEs: `Escanee con la cámara de su teléfono para dejarle una reseña en Google ${reviewNameEs}`,
    roleEn: provider.role.en,
    roleEs: provider.role.es,
  };
}

function targetCopy(key: ReviewTargetKey, providerId: string | null) {
  if (providerId) return providerCopy(key, providerId);
  if (key === "master") {
    return {
      title: "Master code — review hub",
      credentials: null,
      description:
        "Opens the practice review hub in English, Spanish, Vietnamese, Korean, or Arabic. Printed copies remain valid while this hub URL is maintained, even if its review destinations change.",
      askEn: "How was your visit?",
      askEs: "¿Cómo fue su visita?",
      scanEn: "Scan with your phone camera to leave us a review",
      scanEs: "Escanee con la cámara de su teléfono para dejarnos una reseña",
      roleEn: null,
      roleEs: null,
    };
  }
  return {
    title: "Whole practice — straight to Google",
    credentials: null,
    description:
      "Opens the Google review form for FDHS Westchase Gastroenterology directly, with no extra tap.",
    askEn: "How was your visit?",
    askEs: "¿Cómo fue su visita?",
    scanEn: "Scan with your phone camera to leave us a Google review",
    scanEs:
      "Escanee con la cámara de su teléfono para dejarnos una reseña en Google",
    roleEn: null,
    roleEs: null,
  };
}

export const reviewFlyers: ReviewFlyer[] = REVIEW_TARGET_KEYS.map((key) => {
  const target = reviewTargets[key];
  const providerId = "providerId" in target ? target.providerId : null;
  const copy = targetCopy(key, providerId);
  const assets = Object.fromEntries(
    (Object.entries(target.assets) as Array<
      [ReviewAssetKind, { filename: string; sha256: string }]
    >).map(([kind, asset]) => [
      kind,
      { ...asset, kind, contentType: CONTENT_TYPES[kind] },
    ]),
  ) as Record<ReviewAssetKind, ReviewFlyerAsset>;

  return {
    key,
    destination: target.destination,
    ...copy,
    showLanguages: key === "master",
    assets,
  };
});

export const reviewFlyerAssetByFilename = new Map(
  reviewFlyers.flatMap((flyer) =>
    Object.values(flyer.assets).map((asset) => [asset.filename, asset] as const),
  ),
);
