// Curated sample queries from dev.jsonl representing all test matrix patterns
// Useful for one-click testing, automated playback, and judge demos

export interface SampleQuery {
  id: string;
  title: string;
  tag: "plain" | "correction" | "late_constraint" | "code_mixed";
  tagLabel: string;
  tagColor: string;
  text: string;
  expectedTarget: string;
  expectedFilters: {
    category?: string;
    colour?: string;
    size?: string;
    brand?: string;
    max_price?: number;
  };
}

export const SAMPLE_QUERIES: SampleQuery[] = [
  {
    id: "dev-0001",
    title: "Navy Sneakers (Number words)",
    tag: "plain",
    tagLabel: "Plain",
    tagColor: "#3b82f6",
    text: "hi, I want Loomsy navy blue casual sneakers within forty five hundred, size 7 if you have it",
    expectedTarget: "P0086",
    expectedFilters: {
      category: "sneakers",
      colour: "navy",
      size: "7",
      brand: "Loomsy",
      max_price: 4500,
    },
  },
  {
    id: "dev-0003",
    title: "Kurta with Mid-Stream Correction",
    tag: "correction",
    tagLabel: "Correction",
    tagColor: "#f59e0b",
    text: "show me maroon size M, oops, XS Tanaro kurta max 1500 for a wedding",
    expectedTarget: "P0553",
    expectedFilters: {
      category: "kurtas",
      colour: "maroon",
      size: "XS",
      brand: "Tanaro",
      max_price: 1500,
    },
  },
  {
    id: "dev-0006",
    title: "Headphones with Late Constraint",
    tag: "late_constraint",
    tagLabel: "Late Constraint",
    tagColor: "#8b5cf6",
    text: "show me Sonquil headphones under 7,500, also, in blue for my brother",
    expectedTarget: "P0982",
    expectedFilters: {
      category: "headphones",
      colour: "blue",
      brand: "Sonquil",
      max_price: 7500,
    },
  },
  {
    id: "dev-0024",
    title: "Hinglish Shoes (Code-Mixed)",
    tag: "code_mixed",
    tagLabel: "Hinglish",
    tagColor: "#10b981",
    text: "mujhe Loomsy green casual shoes size eight chahiye please",
    expectedTarget: "P0109",
    expectedFilters: {
      category: "sneakers",
      colour: "green",
      size: "8",
      brand: "Loomsy",
    },
  },
  {
    id: "dev-0042",
    title: "Pacevo Running Shoes (Early Commit)",
    tag: "plain",
    tagLabel: "Plain",
    tagColor: "#3b82f6",
    text: "I'm looking for black Pacevo running shoes size nine under four thousand please",
    expectedTarget: "P0063",
    expectedFilters: {
      category: "running shoes",
      colour: "black",
      size: "9",
      brand: "Pacevo",
      max_price: 4000,
    },
  },
  {
    id: "dev-0068",
    title: "Hindi Fractional Budget (saadhe teen hazaar)",
    tag: "code_mixed",
    tagLabel: "Hinglish + Fraction",
    tagColor: "#ec4899",
    text: "mujhe like kaala Urbanyx jacket budget saadhe teen hazaar, M size milega?",
    expectedTarget: "P0732",
    expectedFilters: {
      category: "jackets",
      colour: "black",
      size: "M",
      brand: "Urbanyx",
      max_price: 3500,
    },
  },
];
