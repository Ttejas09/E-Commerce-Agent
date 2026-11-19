"""Streaming Incremental Extractor for anticipatory e-commerce shopping queries."""

import sys
from pathlib import Path

# Ensure paths
_AGENT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _AGENT_DIR.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
if str(_AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(_AGENT_DIR))

try:
    from agent.catalogue_index import (
        CATEGORIES, BRANDS_LOWER, COLOURS, ALL_SIZES, CATEGORY_SIZES
    )
    from agent.filters import FilterState, FilterValue
    from agent.config import CORRECTION_COOLDOWN
except (ImportError, ModuleNotFoundError):
    from catalogue_index import (
        CATEGORIES, BRANDS_LOWER, COLOURS, ALL_SIZES, CATEGORY_SIZES
    )
    from filters import FilterState, FilterValue
    from config import CORRECTION_COOLDOWN

import re
from typing import Optional, List, Dict, Tuple, Set

# Number maps
ENGLISH_NUMBERS = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
}

HINDI_NUMBERS = {
    'ek': 1, 'do': 2, 'teen': 3, 'tin': 3,
    'chaar': 4, 'char': 4, 'paanch': 5, 'panch': 5,
    'chhah': 6, 'chhe': 6, 'che': 6,
    'saat': 7, 'sat': 7, 'aath': 8, 'ath': 8,
    'nau': 9, 'das': 10, 'gyarah': 11, 'baarah': 12, 'barah': 12,
    'pandrah': 15, 'pandra': 15, 'satrah': 17, 'satra': 17,
    'bees': 20, 'tees': 30, 'chaalis': 40, 'pachaas': 50,
    'saath': 60, 'sattar': 70, 'assi': 80, 'nabbe': 90,
    'sau': 100, 'so': 100, 'hazaar': 1000, 'hazar': 1000,
}

MULTI_WORD_CATEGORIES = [
    (['casual', 'shoes'], 'sneakers'),
    (['running', 'shoes'], 'running shoes'),
    (['running', 'sneakers'], 'running shoes'),
    (['jogging', 'shoes'], 'running shoes'),
    (['casual', 'sneakers'], 'sneakers'),
    (['track', 'pants'], 'track pants'),
    (['track', 'pant'], 'track pants'),
    (['hooded', 'sweatshirt'], 'hoodies'),
    (['pair', 'of', 'jeans'], 'jeans'),
    (['wrist', 'watch'], 'watches'),
    (['t', 'shirt'], 't-shirts'),
    (['t', 'shirts'], 't-shirts'),
    (['bag', 'pack'], 'backpacks'),
    (['bag', 'packs'], 'backpacks'),
]

SINGLE_WORD_CATEGORIES = {
    'sneakers': 'sneakers', 'sneaker': 'sneakers',
    'sandals': 'sandals', 'sandal': 'sandals', 'slides': 'sandals', 'floaters': 'sandals', 'chappal': 'sandals',
    'hoodies': 'hoodies', 'hoodie': 'hoodies', 'sweatshirt': 'hoodies',
    'jackets': 'jackets', 'jacket': 'jackets',
    'jeans': 'jeans', 'jean': 'jeans', 'denims': 'jeans', 'denim': 'jeans',
    'kurtas': 'kurtas', 'kurta': 'kurtas', 'kurti': 'kurtas',
    'dresses': 'dresses', 'dress': 'dresses',
    'caps': 'caps', 'cap': 'caps',
    'backpacks': 'backpacks', 'backpack': 'backpacks', 'rucksack': 'backpacks', 'baig': 'backpacks', 'bag': 'backpacks',
    'wallets': 'wallets', 'wallet': 'wallets',
    'watches': 'watches', 'watch': 'watches', 'wristwatch': 'watches', 'ghadi': 'watches',
    'headphones': 'headphones', 'headphone': 'headphones', 'headset': 'headphones',
    'shirts': 'shirts', 'shirt': 'shirts',
    'trackpants': 'track pants', 'joggers': 'track pants', 'lower': 'track pants',
    'tshirt': 't-shirts', 'tshirts': 't-shirts', 'tee': 't-shirts', 'tees': 't-shirts',
    't-shirt': 't-shirts', 't-shirts': 't-shirts',
    'runners': 'running shoes',
}

MULTI_WORD_BRANDS = [
    (['kesar', 'loom'], 'Kesar Loom'),
]

COMPOUND_COLOURS = [
    (['navy', 'blue'], 'navy'),
    (['olive', 'green'], 'olive'),
]

COLOUR_MAP = {
    'gray': 'grey',
    'golden': 'gold',
    'kaala': 'black', 'kala': 'black',
    'safed': 'white',
    'neela': 'blue', 'nila': 'blue',
    'laal': 'red', 'lal': 'red',
    'hara': 'green',
    'peela': 'yellow', 'pila': 'yellow',
    'bhoora': 'brown', 'bhura': 'brown',
    'gulabi': 'pink',
}

SIZE_WORDS = {
    'extra small': 'XS', 'extra-small': 'XS', 'xs': 'XS',
    'small': 'S', 's': 'S',
    'medium': 'M', 'm': 'M',
    'large': 'L', 'l': 'L',
    'extra large': 'XL', 'extra-large': 'XL', 'xl': 'XL',
    'double extra large': 'XXL', 'double xl': 'XXL', '2xl': 'XXL', 'xxl': 'XXL',
    'xxs': 'XXS',
}

CLOSURE_WORDS = {
    'wedding', 'office', 'week', 'dad', 'gym', 'brother', 'gift',
    'flashy', 'thanks', 'thank', 'please', 'chahiye', 'milega', 'dikhao'
}

CLOSURE_PHRASES = [
    ['have', 'it'],
    ['hai', 'kya'],
    ['this', 'week'],
    ['my', 'dad'],
    ['the', 'gym'],
    ['my', 'brother'],
    ['a', 'gift'],
    ['too', 'flashy'],
    ['thank', 'you'],
    ['a', 'wedding'],
    ['for', 'office'],
    ['for', 'a'],
    ['for', 'my'],
    ['for', 'the'],
    ['if', 'you'],
    ['need', 'it'],
    ['nothing', 'too'],
    ['as', 'a'],
]

CORRECTION_SIGNALS = {
    'oops', 'sorry', 'wait', 'actually', 'instead', 'nahi', 'galti',
    'mean', 'meant', 'change', 'rather', 'matlab', 'make', 'badal'
}

STOPWORDS = {
    'i', 'me', 'my', 'the', 'a', 'an', 'is', 'it', 'in', 'to', 'for', 'of', 'and', 'or',
    'do', 'you', 'have', 'any', 'can', 'find', 'get', 'want', 'need', 'show', 'looking',
    'something', 'one', 'with', 'that', 'this', 'some', 'if', 'too', 'also', 'just',
    'like', 'im', "i'm", 'hey', 'hi', 'hello', 'nothing', 'your', 'please', 'thanks',
    'thank', 'chahiye', 'milega', 'mil', 'jayega', 'kya', 'aapke', 'paas', 'mujhe',
    'mera', 'mere', 'liye', 'hai', 'ho', 'dikhao', 'dikhaiye', 'batao', 'wala', 'wali',
    'mein', 'me', 'ka', 'ki', 'ke', 'ek', 'bhaiya', 'na', 'aur', 'haan', 'baat',
    'as', 'gift', 'office', 'wedding', 'gym', 'brother', 'dad', 'week', 'day', 'days',
    'uh', 'hmm', 'has', 'be', 'from', 'by', 'brand', 'only', 'more', 'than', 'rupees', 'rs'
}


def clean_token(t: str) -> str:
    """Normalize a raw token."""
    t = t.lower()
    t = re.sub(r'^[^\w₹\-]+|[^\w\-]+$', '', t)
    return t


def parse_price_phrase(tokens: List[str], i: int) -> Optional[Tuple[int, int]]:
    """Try to parse a price starting at index i.
    Returns (price_value, end_index) or None.
    """
    n = len(tokens)
    if i >= n:
        return None

    if tokens[i] in ('saadhe', 'saade') and i + 2 < n:
        next_tok = tokens[i+1]
        digit = ENGLISH_NUMBERS.get(next_tok) or HINDI_NUMBERS.get(next_tok)
        if digit and tokens[i+2] in ('hazaar', 'hazar', 'thousand'):
            return (int((digit + 0.5) * 1000), i + 3)
        if digit and tokens[i+2] in ('sau', 'so', 'hundred'):
            return (int((digit + 0.5) * 100), i + 3)

    if tokens[i] in ('dhai', 'dhaiya') and i + 1 < n and tokens[i+1] in ('hazaar', 'hazar', 'thousand'):
        return (2500, i + 2)

    if tokens[i] == 'dedh' and i + 1 < n and tokens[i+1] in ('hazaar', 'hazar', 'thousand'):
        return (1500, i + 2)

    if tokens[i] in ('pandrah', 'pandra') and i + 1 < n and tokens[i+1] in ('sau', 'so', 'hundred'):
        return (1500, i + 2)
    if tokens[i] in ('satrah', 'satra') and i + 1 < n and tokens[i+1] in ('sau', 'so', 'hundred'):
        return (1700, i + 2)

    if tokens[i] in ('twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'):
        tens = ENGLISH_NUMBERS[tokens[i]]
        if i + 2 < n and tokens[i+1] in ENGLISH_NUMBERS and tokens[i+2] in ('hundred', 'sau', 'so'):
            ones = ENGLISH_NUMBERS[tokens[i+1]]
            return ((tens + ones) * 100, i + 3)
        if i + 1 < n and tokens[i+1] in ('hundred', 'sau', 'so'):
            return (tens * 100, i + 2)

    if tokens[i] in ('eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'):
        teens = ENGLISH_NUMBERS[tokens[i]]
        if i + 1 < n and tokens[i+1] in ('hundred', 'sau', 'so'):
            return (teens * 100, i + 2)

    num1 = ENGLISH_NUMBERS.get(tokens[i]) or HINDI_NUMBERS.get(tokens[i])
    if num1 is not None and i + 1 < n and tokens[i+1] in ('thousand', 'hazaar', 'hazar'):
        val = num1 * 1000
        if i + 3 < n:
            num2 = ENGLISH_NUMBERS.get(tokens[i+2]) or HINDI_NUMBERS.get(tokens[i+2])
            if num2 is not None and tokens[i+3] in ('hundred', 'sau', 'so'):
                return (val + num2 * 100, i + 4)
        return (val, i + 2)

    if num1 is not None and i + 1 < n and tokens[i+1] in ('hundred', 'sau', 'so'):
        return (num1 * 100, i + 2)

    tok = tokens[i].replace(',', '')
    if tok.startswith('₹'):
        tok = tok[1:]
    if tok.endswith('k'):
        try:
            val = float(tok[:-1]) * 1000
            return (int(val), i + 1)
        except ValueError:
            pass

    if tok.isdigit():
        val = int(tok)
        if val >= 200:
            return (val, i + 1)

    return None


class IncrementalExtractor:
    """Maintains token sequence and incrementally extracts FilterState."""

    def __init__(self, catalogue_index=None):
        self.cat_idx = catalogue_index
        self.raw_words: List[str] = []
        self.tokens: List[str] = []
        self.state = FilterState()
        self.last_correction_word: Optional[int] = None
        self.words_since_last_slot_change = 0
        self.boundary_cue_seen = False
        self.is_code_mixed = False
        self.correction_seen = False
        self.pending_number: Optional[Tuple[int, int]] = None

    def process_word(self, raw_word: str, word_index: int) -> FilterState:
        """Process one incoming word and return the updated FilterState."""
        self.raw_words.append(raw_word)
        token = clean_token(raw_word)
        if token:
            self.tokens.append(token)

        if token in HINDI_NUMBERS or token in COLOUR_MAP or token in ('chahiye', 'milega', 'dikhao', 'kya', 'hai'):
            self.is_code_mixed = True

        if token in CORRECTION_SIGNALS:
            self.correction_seen = True
            self.last_correction_word = word_index

        self._extract_all_slots(word_index)
        return self.state

    def _extract_all_slots(self, current_word_index: int) -> None:
        """Extract structured filters from the sequence of tokens seen so far."""
        tokens = self.tokens
        n = len(tokens)
        slots_found: Dict[str, Tuple[any, int, str]] = {}

        i = 0
        while i < n:
            tok = tokens[i]

            matched_brand = None
            for phrase, brand_name in MULTI_WORD_BRANDS:
                plen = len(phrase)
                if tokens[i:i+plen] == phrase:
                    matched_brand = brand_name
                    slots_found['brand'] = (matched_brand, i + 1, "multi_brand")
                    i += plen
                    break
            if matched_brand:
                continue

            if tok in BRANDS_LOWER:
                slots_found['brand'] = (BRANDS_LOWER[tok], i + 1, "brand")
                i += 1
                continue

            matched_cat = None
            for phrase, cat_name in MULTI_WORD_CATEGORIES:
                plen = len(phrase)
                if tokens[i:i+plen] == phrase:
                    matched_cat = cat_name
                    slots_found['category'] = (matched_cat, i + 1, "multi_cat")
                    i += plen
                    break
            if matched_cat:
                continue

            if tok in SINGLE_WORD_CATEGORIES:
                slots_found['category'] = (SINGLE_WORD_CATEGORIES[tok], i + 1, "cat")
                i += 1
                continue

            matched_col = None
            for phrase, col_name in COMPOUND_COLOURS:
                plen = len(phrase)
                if tokens[i:i+plen] == phrase:
                    matched_col = col_name
                    slots_found['colour'] = (matched_col, i + 1, "compound_colour")
                    i += plen
                    break
            if matched_col:
                continue

            if tok in COLOURS:
                slots_found['colour'] = (tok, i + 1, "colour")
                i += 1
                continue
            if tok in COLOUR_MAP:
                slots_found['colour'] = (COLOUR_MAP[tok], i + 1, "colour_map")
                i += 1
                continue

            p_res = parse_price_phrase(tokens, i)
            if p_res:
                val, end_idx = p_res
                slots_found['max_price'] = (val, i + 1, "price")
                i = end_idx
                continue

            if tokens[i:i+2] == ['extra', 'large']:
                slots_found['size'] = ('XL', i + 1, "size_phrase")
                i += 2
                continue
            if tokens[i:i+2] == ['extra', 'small']:
                slots_found['size'] = ('XS', i + 1, "size_phrase")
                i += 2
                continue
            if tokens[i:i+3] == ['double', 'extra', 'large']:
                slots_found['size'] = ('XXL', i + 1, "size_phrase")
                i += 3
                continue
            if tokens[i:i+2] == ['double', 'xl']:
                slots_found['size'] = ('XXL', i + 1, "size_phrase")
                i += 2
                continue
            if tok in ('small', 'medium', 'large', 'xs', 'xl', 'xxl', '2xl'):
                slots_found['size'] = (SIZE_WORDS.get(tok, tok.upper()), i + 1, "size_word")
                i += 1
                continue

            if tok in ('size', 'uk', 'waist') and i + 1 < n:
                next_t = tokens[i+1]
                num = ENGLISH_NUMBERS.get(next_t) or HINDI_NUMBERS.get(next_t)
                if num is not None and str(num) in ALL_SIZES:
                    slots_found['size'] = (str(num), i + 1, "size_cue")
                    i += 2
                    continue
                elif next_t in ALL_SIZES:
                    slots_found['size'] = (next_t.upper() if next_t.isalpha() else next_t, i + 1, "size_cue")
                    i += 2
                    continue
                elif next_t.upper() in ALL_SIZES:
                    slots_found['size'] = (next_t.upper(), i + 1, "size_cue")
                    i += 2
                    continue

            if i + 1 < n and tokens[i+1] in ('uk', 'waist', 'size', 'number'):
                num = ENGLISH_NUMBERS.get(tok) or HINDI_NUMBERS.get(tok)
                if num is not None and str(num) in ALL_SIZES:
                    slots_found['size'] = (str(num), i + 1, "size_post_cue")
                    i += 2
                    continue
                elif tok in ALL_SIZES:
                    slots_found['size'] = (tok.upper() if tok.isalpha() else tok, i + 1, "size_post_cue")
                    i += 2
                    continue

            if tok in ('actually', 'sorry', 'oops') and i + 1 < n:
                next_t = tokens[i+1]
                num = ENGLISH_NUMBERS.get(next_t) or HINDI_NUMBERS.get(next_t)
                if num is not None and str(num) in ALL_SIZES:
                    slots_found['size'] = (str(num), i + 1, "corr_size")
                    i += 2
                    continue
                elif next_t in ALL_SIZES or next_t.upper() in ALL_SIZES:
                    slots_found['size'] = (next_t.upper() if next_t.isalpha() else next_t, i + 1, "corr_size")
                    i += 2
                    continue

            i += 1

        for slot in ('category', 'colour', 'brand', 'size', 'max_price'):
            if slot in slots_found:
                val, w_idx, prov = slots_found[slot]
                current_fv = getattr(self.state, slot)
                if current_fv is None or current_fv.value != val:
                    self.state.set_filter(
                        slot=slot,
                        value=val,
                        confidence=0.98,
                        word_index=w_idx,
                        provenance=[prov],
                        source_lang="hi" if self.is_code_mixed else "en"
                    )
                    self.words_since_last_slot_change = 0
            else:
                setattr(self.state, slot, None)

        self.words_since_last_slot_change += 1

    def has_closure_cue(self) -> bool:
        """Check if recent tokens match any closure word or anticipatory phrase."""
        tokens = self.tokens
        if not tokens:
            return False

        if tokens[-1] in CLOSURE_WORDS or (len(tokens) >= 2 and tokens[-2] in CLOSURE_WORDS):
            return True

        for cp in CLOSURE_PHRASES:
            cplen = len(cp)
            if len(tokens) >= cplen and tokens[-cplen:] == cp:
                return True

        return False

    def is_in_cooldown(self, current_word_index: int) -> bool:
        """Returns True if agent is within CORRECTION_COOLDOWN words of last correction."""
        if self.last_correction_word is None:
            return False
        return (current_word_index - self.last_correction_word) < CORRECTION_COOLDOWN

    def get_residual_query(self) -> str:
        """Return non-filter, non-stopword tokens for descriptive search ranking."""
        tokens = self.tokens
        filter_vals = {
            str(getattr(self.state, s).value).lower()
            for s in ('category', 'colour', 'brand', 'size', 'max_price')
            if getattr(self.state, s) is not None
        }
        res_tokens = [
            t for t in tokens
            if t not in STOPWORDS and t not in filter_vals and t not in CLOSURE_WORDS
        ]
        self.state.residual_tokens = res_tokens
        return " ".join(res_tokens)

    def flush(self) -> FilterState:
        """Flush buffer and finalize state."""
        self._extract_all_slots(len(self.tokens))
        self.get_residual_query()
        return self.state
