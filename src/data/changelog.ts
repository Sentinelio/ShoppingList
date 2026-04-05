export type ChangeType = "feat" | "fix" | "refactor" | "style" | "chore" | "ci" | "docs";

export interface ChangelogEntry {
  hash: string;
  date: string; // YYYY-MM-DD
  type: ChangeType;
  title: string;
  details?: string[];
}

// Newest first. Update with each meaningful change.
export const CHANGELOG: ChangelogEntry[] = [
  {
    hash: "01fe231",
    date: "2026-04-05",
    type: "ci",
    title: "Auto-deploy to GitHub Pages on push",
    details: [
      "GitHub Actions workflow builds and publishes dist/ to gh-pages",
      "Triggered on push to main or feature branch",
    ],
  },
  {
    hash: "47d3bf7",
    date: "2026-04-05",
    type: "feat",
    title: "Bulk generate / clear in Catalog",
    details: [
      "Global 50/50 buttons: Generate all · Clear all",
      "Per store type 50/50 buttons: Generate all · Clear all",
      "Dictionary fetch now paginates (no 500 item cap)",
    ],
  },
  {
    hash: "4550909",
    date: "2026-04-05",
    type: "refactor",
    title: "Inline clear button inside search input",
    details: ["Replaces the global Clear Dictionary button"],
  },
  {
    hash: "97dc798",
    date: "2026-04-04",
    type: "feat",
    title: "Clean Catalog UI + persistent store collapse",
    details: ["Store type collapse state saved to localStorage"],
  },
  {
    hash: "6bb2aaf",
    date: "2026-04-04",
    type: "fix",
    title: "Collapse state persists across list navigation",
  },
  {
    hash: "de3b1c5",
    date: "2026-04-04",
    type: "feat",
    title: "Clear category products button in Catalog",
  },
  {
    hash: "14475e3",
    date: "2026-04-04",
    type: "feat",
    title: "Unified Catalog tab",
    details: ["Merged Dictionary, Categories and Builder into single tab"],
  },
  {
    hash: "62460ac",
    date: "2026-04-04",
    type: "feat",
    title: "Simpler store/category forms with color picker",
  },
  {
    hash: "5f6c187",
    date: "2026-04-04",
    type: "feat",
    title: "Hierarchical store types → categories",
    details: ["Admin can add/remove custom store types and categories"],
  },
  {
    hash: "84fa5bc",
    date: "2026-04-04",
    type: "feat",
    title: "Admin: clear dictionary (all or by category)",
  },
  {
    hash: "2caee8c",
    date: "2026-04-04",
    type: "fix",
    title: "Translate Edge Function uses all 58 categories",
  },
  {
    hash: "2030f3e",
    date: "2026-04-04",
    type: "feat",
    title: "Admin delete lists + inactive list cleanup roadmap",
  },
  {
    hash: "8f6f5b1",
    date: "2026-04-04",
    type: "feat",
    title: "Collapse persistence, remove members, admin delete users",
  },
  {
    hash: "807ebb0",
    date: "2026-04-04",
    type: "fix",
    title: "Important persists via localStorage",
    details: ["Admin back goes to stats tab"],
  },
  {
    hash: "92fe935",
    date: "2026-04-04",
    type: "feat",
    title: "List rename save, member approve refresh, item importance flag",
  },
  {
    hash: "322a3aa",
    date: "2026-04-04",
    type: "feat",
    title: "Full photo support on items",
    details: ["Add / change / remove photos", "Fullscreen zoom", "URL-only storage"],
  },
];
