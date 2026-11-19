// Enhanced Mock API — realistic simulator of the Anticipatory Commerce Agent
// Accurately simulates extraction, confidence scoring, early commits, and finish relaxation

import type {
  StartResponse,
  ObserveResponse,
  FinishResponse,
  ProductSummary,
  FilterState,
} from "../types/api";

export const MOCK_CATALOGUE: ProductSummary[] = [
  {
    product_id: "P0063",
    title: "Pacevo Drift Running Shoes, Black",
    brand: "Pacevo",
    category: "running shoes",
    colour: "black",
    size: "9",
    price: 3899,
  },
  {
    product_id: "P0086",
    title: "Loomsy Suede 4 Sneakers, Navy",
    brand: "Loomsy",
    category: "sneakers",
    colour: "navy",
    size: "7",
    price: 4449,
  },
  {
    product_id: "P0109",
    title: "Loomsy Court Sneakers, Green",
    brand: "Loomsy",
    category: "sneakers",
    colour: "green",
    size: "8",
    price: 2049,
  },
  {
    product_id: "P0171",
    title: "Urbanyx Trek 2 Sandals, Olive",
    brand: "Urbanyx",
    category: "sandals",
    colour: "olive",
    size: "6",
    price: 699,
  },
  {
    product_id: "P0206",
    title: "Strydo Strap Sandals, Black",
    brand: "Strydo",
    category: "sandals",
    colour: "black",
    size: "9",
    price: 699,
  },
  {
    product_id: "P0389",
    title: "Loomsy Poplin Shirt, Navy",
    brand: "Loomsy",
    category: "shirts",
    colour: "navy",
    size: "XS",
    price: 1599,
  },
  {
    product_id: "P0553",
    title: "Tanaro A-Line Kurta, Maroon",
    brand: "Tanaro",
    category: "kurtas",
    colour: "maroon",
    size: "XS",
    price: 1049,
  },
  {
    product_id: "P0732",
    title: "Urbanyx Puffer Jacket, Black",
    brand: "Urbanyx",
    category: "jackets",
    colour: "black",
    size: "M",
    price: 3099,
  },
  {
    product_id: "P0982",
    title: "Sonquil Wireless On-Ear Headphones, Blue",
    brand: "Sonquil",
    category: "headphones",
    colour: "blue",
    size: "",
    price: 6799,
  },
];

const INITIAL_FILTERS: FilterState = {
  category: null,
  colour: null,
  size: null,
  brand: null,
  max_price: null,
  min_price: null,
  residual_tokens: [],
  version: 0,
};

let currentFilters: FilterState = { ...INITIAL_FILTERS };
let wordsBuffer: string[] = [];
let committedProduct: ProductSummary | null = null;
let searchesPerformed = 0;
let lastCorrectionWord: number | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function mockStart(request_id: string): Promise<StartResponse> {
  await delay(30);
  currentFilters = {
    category: null,
    colour: null,
    size: null,
    brand: null,
    max_price: null,
    min_price: null,
    residual_tokens: [],
    version: 0,
  };
  wordsBuffer = [];
  committedProduct = null;
  searchesPerformed = 0;
  lastCorrectionWord = null;
  return { status: "ready", request_id };
}

// Extraction dictionaries
const BRAND_MAP: Record<string, string> = {
  pacevo: "Pacevo",
  loomsy: "Loomsy",
  urbanyx: "Urbanyx",
  strydo: "Strydo",
  tanaro: "Tanaro",
  sonquil: "Sonquil",
  kudova: "Kudova",
  zentrail: "Zentrail",
  horavo: "Horavo",
  wavlo: "Wavlo",
};

const CATEGORY_MAP: Record<string, string> = {
  sneakers: "sneakers",
  sneaker: "sneakers",
  sandals: "sandals",
  sandal: "sandals",
  slides: "sandals",
  floaters: "sandals",
  kurta: "kurtas",
  kurtas: "kurtas",
  kurti: "kurtas",
  jacket: "jackets",
  jackets: "jackets",
  headphones: "headphones",
  headphone: "headphones",
  shirt: "shirts",
  shirts: "shirts",
  tee: "t-shirts",
  tshirt: "t-shirts",
  "t-shirt": "t-shirts",
  shoes: "sneakers", // default shoes to sneakers or running shoes
};

const COLOUR_MAP: Record<string, string> = {
  black: "black",
  white: "white",
  navy: "navy",
  blue: "blue",
  green: "green",
  olive: "olive",
  maroon: "maroon",
  red: "red",
  kaala: "black",
  kala: "black",
  safed: "white",
  neela: "blue",
  nila: "blue",
  hara: "green",
  laal: "red",
  lal: "red",
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  teen: 3,
  chaar: 4,
  paanch: 5,
  chhe: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
};

const CORRECTION_MARKERS = new Set([
  "oops",
  "sorry",
  "wait",
  "actually",
  "instead",
  "nahi",
]);

export async function mockObserve(
  word: string,
  word_index: number,
): Promise<ObserveResponse> {
  await delay(15 + Math.random() * 25);
  wordsBuffer.push(word);

  const clean = word.toLowerCase().replace(/[,.\-!?;:'"]/g, "");
  const prevClean =
    wordsBuffer.length >= 2
      ? wordsBuffer[wordsBuffer.length - 2].toLowerCase().replace(/[,.\-!?;:'"]/g, "")
      : "";

  let updated = false;

  // 1. Correction check
  if (CORRECTION_MARKERS.has(clean)) {
    lastCorrectionWord = word_index;
    currentFilters.version += 1;
  }

  // 2. Brand check
  if (BRAND_MAP[clean]) {
    currentFilters.brand = {
      value: BRAND_MAP[clean],
      confidence: 0.98,
      word_index,
      provenance: [word],
    };
    updated = true;
  }

  // 3. Category check (including 2-gram like "running shoes")
  if (prevClean === "running" && clean === "shoes") {
    currentFilters.category = {
      value: "running shoes",
      confidence: 0.99,
      word_index,
      provenance: [wordsBuffer[wordsBuffer.length - 2], word],
    };
    updated = true;
  } else if (CATEGORY_MAP[clean] && currentFilters.category?.value !== "running shoes") {
    currentFilters.category = {
      value: CATEGORY_MAP[clean],
      confidence: 0.95,
      word_index,
      provenance: [word],
    };
    updated = true;
  }

  // 4. Colour check
  if (COLOUR_MAP[clean]) {
    currentFilters.colour = {
      value: COLOUR_MAP[clean],
      confidence: 0.96,
      word_index,
      provenance: [word],
    };
    updated = true;
  }

  // 5. Size check: explicit size word or clothing sizes (XS, S, M, L, XL, XXL) or footwear sizes (6-11)
  const isClothingSize = /^(xs|s|m|l|xl|xxl)$/i.test(clean);
  const isNumericSize = (prevClean === "size" || prevClean === "uk") && (/^\d+$/.test(clean) || NUMBER_WORDS[clean]);

  if (isClothingSize) {
    currentFilters.size = {
      value: clean.toUpperCase(),
      confidence: 0.95,
      word_index,
      provenance: [word],
    };
    updated = true;
  } else if (isNumericSize) {
    const val = /^\d+$/.test(clean) ? clean : String(NUMBER_WORDS[clean]);
    currentFilters.size = {
      value: val,
      confidence: 0.97,
      word_index,
      provenance: [prevClean, word],
    };
    updated = true;
  } else if (prevClean === "size" && NUMBER_WORDS[clean]) {
    currentFilters.size = {
      value: String(NUMBER_WORDS[clean]),
      confidence: 0.97,
      word_index,
      provenance: [prevClean, word],
    };
    updated = true;
  }

  // 6. Price / Budget check
  const numClean = clean.replace(/[₹,]/g, "");
  if (/^\d{3,5}$/.test(numClean) && !isNumericSize) {
    const priceVal = parseInt(numClean, 10);
    currentFilters.max_price = {
      value: priceVal,
      confidence: 0.92,
      word_index,
      provenance: [word],
    };
    updated = true;
  } else if (clean === "hundred" || clean === "hazaar" || clean === "thousand") {
    // Multipliers like "forty five hundred" or "saadhe teen hazaar"
    let computedPrice: number | null = null;
    const windowStr = wordsBuffer.slice(-4).join(" ").toLowerCase();
    if (windowStr.includes("forty five hundred")) computedPrice = 4500;
    else if (windowStr.includes("seven hundred")) computedPrice = 700;
    else if (windowStr.includes("four thousand")) computedPrice = 4000;
    else if (windowStr.includes("saadhe teen hazaar")) computedPrice = 3500;

    if (computedPrice) {
      currentFilters.max_price = {
        value: computedPrice,
        confidence: 0.96,
        word_index,
        provenance: [word],
      };
      updated = true;
    }
  } else if (clean === "0.8k") {
    currentFilters.max_price = {
      value: 800,
      confidence: 0.95,
      word_index,
      provenance: [word],
    };
    updated = true;
  }

  // 7. Residual content tokens
  if (["casual", "formal", "wireless", "hooded", "drift", "suede"].includes(clean)) {
    if (!currentFilters.residual_tokens.includes(clean)) {
      currentFilters.residual_tokens = [...currentFilters.residual_tokens, clean];
    }
  }

  // Filter candidates from catalogue
  const candidates = MOCK_CATALOGUE.filter((p) => {
    if (currentFilters.category && p.category !== currentFilters.category.value) return false;
    if (currentFilters.colour && p.colour !== currentFilters.colour.value) return false;
    if (currentFilters.brand && p.brand !== currentFilters.brand.value) return false;
    if (currentFilters.size && p.size && p.size !== currentFilters.size.value) return false;
    if (currentFilters.max_price && p.price > Number(currentFilters.max_price.value)) return false;
    return true;
  });

  // Confidence computation
  let confidence = 0.2;
  let populatedCount = 0;
  for (const k of ["category", "colour", "brand", "size", "max_price"] as const) {
    if (currentFilters[k] !== null) {
      populatedCount += 1;
      confidence += 0.16;
    }
  }

  if (candidates.length === 1 && populatedCount >= 3) {
    confidence = Math.max(confidence, 0.95);
  } else if (candidates.length > 3) {
    confidence = Math.min(confidence, 0.85);
  }

  // Correction cooldown (4 words)
  const inCorrectionCooldown =
    lastCorrectionWord !== null && word_index - lastCorrectionWord < 4;

  if (inCorrectionCooldown) {
    confidence = Math.min(confidence, 0.65);
  }

  // Trigger speculative search if gate conditions met
  if (updated && populatedCount >= 3 && searchesPerformed < 4) {
    searchesPerformed += 1;
  }

  // Early commit decision: confidence >= 0.94, candidate == 1, not in cooldown, commit-once
  let commitId: string | null = null;
  if (
    !committedProduct &&
    candidates.length === 1 &&
    confidence >= 0.94 &&
    !inCorrectionCooldown &&
    word_index >= 7
  ) {
    committedProduct = candidates[0];
    commitId = committedProduct.product_id;
  }

  return {
    commit: commitId,
    committed_product: commitId ? committedProduct : null,
    top_candidates: candidates.slice(0, 4),
    filters: { ...currentFilters },
    confidence: Math.min(1.0, Math.round(confidence * 100) / 100),
    searches_used: Math.max(1, searchesPerformed),
    searches_remaining: Math.max(0, 4 - Math.max(1, searchesPerformed)),
    reason: commitId
      ? `High-confidence unique match: ${committedProduct?.title} (${committedProduct?.product_id})`
      : inCorrectionCooldown
        ? `Correction cooldown active (${4 - (word_index - lastCorrectionWord!)} words remaining)`
        : candidates.length === 1
          ? `Unique match found, verifying stability`
          : candidates.length > 1
            ? `${candidates.length} candidates match current filters`
            : "No exact match, relaxing filters",
  };
}

export async function mockFinish(): Promise<FinishResponse> {
  await delay(60);

  // Filter candidates
  let candidates = MOCK_CATALOGUE.filter((p) => {
    if (currentFilters.category && p.category !== currentFilters.category.value) return false;
    if (currentFilters.colour && p.colour !== currentFilters.colour.value) return false;
    if (currentFilters.brand && p.brand !== currentFilters.brand.value) return false;
    if (currentFilters.size && p.size && p.size !== currentFilters.size.value) return false;
    if (currentFilters.max_price && p.price > Number(currentFilters.max_price.value)) return false;
    return true;
  });

  // Relaxation ladder if 0 candidates
  if (candidates.length === 0) {
    // Drop max_price
    candidates = MOCK_CATALOGUE.filter((p) => {
      if (currentFilters.category && p.category !== currentFilters.category.value) return false;
      if (currentFilters.colour && p.colour !== currentFilters.colour.value) return false;
      return true;
    });
  }

  const final = committedProduct || candidates[0] || MOCK_CATALOGUE[0];

  return {
    product_id: final.product_id,
    product: final,
    filters: { ...currentFilters },
    confidence: 0.98,
    searches_used: Math.max(1, searchesPerformed),
  };
}

export async function mockGetProduct(product_id: string): Promise<ProductSummary> {
  await delay(20);
  const p = MOCK_CATALOGUE.find((p) => p.product_id === product_id);
  if (!p) throw new Error(`Product ${product_id} not found`);
  return p;
}
