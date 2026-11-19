"""Tunable parameters for the e-commerce search agent."""

# --- Confidence & Commit ---
COMMIT_THRESHOLD = 0.94          # min confidence to commit a filter value

# --- Search limits ---
MAX_SEARCHES = 4                 # max catalogue searches per turn

# --- Correction handling ---
CORRECTION_COOLDOWN = 4          # word-index gap before a same-slot write is auto-correction

# --- Fuzzy matching ---
FUZZY_MIN_LEN = 5               # tokens shorter than this skip fuzzy matching

# --- Price ---
PRICE_AROUND_MARGIN = 0.15      # ±15 % band for "around X" price queries
