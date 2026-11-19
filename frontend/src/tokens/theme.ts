// Design Tokens & Visual Mappings — "Warm Editorial, Human-Made"
// Theme palette, catalogue color swatches, category silhouettes, and SVG decorations

export interface ThemeColors {
  paper: string;
  card: string;
  ink: string;
  mutedInk: string;
  hairline: string;
  terracotta: string;
  commitGreen: string;
  saffron: string;
  warningRose: string;
}

export const LIGHT_THEME: ThemeColors = {
  paper: "#FBF7F0",
  card: "#FFFDF8",
  ink: "#1E1A16",
  mutedInk: "#6B6157",
  hairline: "#E8DFD0",
  terracotta: "#D9532B",
  commitGreen: "#2F7D5B",
  saffron: "#E9A23B",
  warningRose: "#C2415D",
};

export const DARK_THEME: ThemeColors = {
  paper: "#161412",
  card: "#1E1A16",
  ink: "#FBF7F0",
  mutedInk: "#A69B8D",
  hairline: "#2E2822",
  terracotta: "#E06A45",
  commitGreen: "#48A37C",
  saffron: "#F2B258",
  warningRose: "#D95A75",
};

// Catalogue 16 Colours mapped to tasteful swatches
export const CATALOGUE_COLOURS: Record<string, { hex: string; isLight: boolean }> = {
  black: { hex: "#1C1917", isLight: false },
  white: { hex: "#F5F5F4", isLight: true },
  navy: { hex: "#1E293B", isLight: false },
  blue: { hex: "#2563EB", isLight: false },
  grey: { hex: "#78716C", isLight: false },
  green: { hex: "#2F7D5B", isLight: false },
  red: { hex: "#DC2626", isLight: false },
  brown: { hex: "#713F12", isLight: false },
  beige: { hex: "#E7E5E4", isLight: true },
  olive: { hex: "#4D533C", isLight: false },
  maroon: { hex: "#7F1D1D", isLight: false },
  pink: { hex: "#F472B6", isLight: true },
  tan: { hex: "#D6C7B2", isLight: true },
  yellow: { hex: "#EAB308", isLight: true },
  gold: { hex: "#D97706", isLight: false },
  silver: { hex: "#CBD5E1", isLight: true },
};

// Filter slot color accents (editorial soft highlights)
export const SLOT_ACCENTS: Record<string, { label: string; lightBg: string; text: string; border: string }> = {
  category: { label: "Category", lightBg: "#F0EAE1", text: "#6B4E3D", border: "#D8CEBF" },
  brand: { label: "Brand", lightBg: "#FBE9E2", text: "#9C3C1C", border: "#F2C7B8" },
  colour: { label: "Colour", lightBg: "#EBF3EE", text: "#245A42", border: "#C7DECF" },
  size: { label: "Size", lightBg: "#FCF2DE", text: "#8A5A13", border: "#F5DEC0" },
  max_price: { label: "Budget", lightBg: "#F7EDF0", text: "#872B40", border: "#EACCD4" },
  min_price: { label: "Min Price", lightBg: "#F7EDF0", text: "#872B40", border: "#EACCD4" },
};
