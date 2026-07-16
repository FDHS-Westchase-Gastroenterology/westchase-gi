import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

import jsQR from "jsqr";
import { PDFDocument } from "pdf-lib";
import { PNG } from "pngjs";

const TARGET_KEYS = [
  "master",
  "practice",
  "awad",
  "chang",
  "mendoza",
  "taylor",
];
const ASSET_KINDS = ["png", "svg", "pdf"];
const PROVIDER_IDS = {
  awad: "amir-awad",
  chang: "john-chang",
  mendoza: "alfredo-mendoza",
  taylor: "taylor-emmerman",
};
const manifestPath = fileURLToPath(
  new URL("../src/lib/review-targets.json", import.meta.url),
);
const assetDirectory = fileURLToPath(
  new URL("../private/review-flyers/", import.meta.url),
);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.deepEqual(Object.keys(manifest), TARGET_KEYS, "manifest target keys");

const assets = [];
for (const key of TARGET_KEYS) {
  const target = manifest[key];
  assert.equal(typeof target.destination, "string", `${key} destination`);
  assert.deepEqual(Object.keys(target.assets), ASSET_KINDS, `${key} asset kinds`);
  if (key in PROVIDER_IDS) {
    assert.equal(target.providerId, PROVIDER_IDS[key], `${key} provider ID`);
  } else {
    assert.equal("providerId" in target, false, `${key} must not have a provider ID`);
  }

  for (const kind of ASSET_KINDS) {
    const asset = target.assets[kind];
    assert.equal(basename(asset.filename), asset.filename, `${key} ${kind} filename`);
    assert.equal(extname(asset.filename), `.${kind}`, `${key} ${kind} extension`);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/, `${key} ${kind} SHA-256`);
    assets.push({ key, kind, destination: target.destination, ...asset });
  }
}

assert.equal(assets.length, 18, "manifest asset count");
assert.equal(new Set(assets.map(({ filename }) => filename)).size, 18, "unique filenames");
assert.deepEqual(
  (await readdir(assetDirectory)).sort(),
  assets.map(({ filename }) => filename).sort(),
  "private artifact directory must contain exactly the 18 manifest files",
);

for (const asset of assets) {
  const bytes = await readFile(`${assetDirectory}/${asset.filename}`);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    asset.sha256,
    `${asset.filename} hash`,
  );

  if (asset.kind === "png") {
    const png = PNG.sync.read(bytes);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    assert.equal(decoded?.data, asset.destination, `${asset.filename} QR destination`);
  }

  if (asset.kind === "pdf") {
    const pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 1, `${asset.filename} page count`);
    const { width, height } = pdf.getPage(0).getMediaBox();
    assert.deepEqual([width, height], [612, 792], `${asset.filename} media box`);
  }
}

console.log("Review flyers verified: 6 targets, 18 hashes, 6 PNG QRs, 6 one-page letter PDFs.");
