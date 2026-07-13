// Integration adapter seam — deliberately inert tonight.
//
// The portal will eventually manage GitHub repository access and Vercel
// deploy visibility on the practice's behalf. That wiring is sanctioned
// ONLY as a GitHub App registered under the clinic's own organization
// AFTER the ownership transfer (see docs/INTEGRATION-ACTIVATION.md).
// No personal access token, no hand-rolled bridge, no live API calls
// exist here — the UI renders this static config and nothing else.
//
// Activating a provider later is a drop-in: implement a live
// IntegrationProvider and swap it into PORTAL_INTEGRATIONS.

export type IntegrationStatus =
  | { connected: false; reason: "awaiting_ownership_transfer" }
  | { connected: true; account: string };

export type IntegrationProvider = {
  id: "github" | "vercel";
  name: string;
  summary: string;
  /** What the connection WILL manage once activated. */
  willManage: string[];
  /** Static tonight; a live implementation replaces this per provider. */
  status: () => IntegrationStatus;
};

const DISCONNECTED: IntegrationStatus = {
  connected: false,
  reason: "awaiting_ownership_transfer",
};

export const PORTAL_INTEGRATIONS: IntegrationProvider[] = [
  {
    id: "github",
    name: "GitHub",
    summary:
      "Where the website's code lives. Connecting activates access management from this registry.",
    willManage: [
      "Who can view and change the website's code",
      "Access grants and removals recorded straight into this ledger",
      "A clear history of every code change",
    ],
    status: () => DISCONNECTED,
  },
  {
    id: "vercel",
    name: "Vercel",
    summary:
      "Where the website runs. Connecting activates deploy visibility from this registry.",
    willManage: [
      "Who can deploy and configure the website hosting",
      "Visibility into what version is live and when it changed",
      "Environment configuration, without sharing passwords",
    ],
    status: () => DISCONNECTED,
  },
];
