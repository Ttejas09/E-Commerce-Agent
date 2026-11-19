"""Streaming Incremental Extractor with safe fuzzy matching, expanded synonyms,
catalogue grounding (category-brand & category-size mutual inference),
and generalized structural closure detection.
"""

import sys
from pathlib import Path
import re
from typing import Optional, List, Dict, Tuple, Set, Any

_AGENT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _AGENT_DIR.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
if str(_AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(_AGENT_DIR))

try:
    from agent.catalogue_index import (
        CATEGORIES, BRANDS, BRANDS_LOWER, COLOURS, ALL_SIZES, CATEGORY_SIZES,
        BRAND_CATEGORIES, BRAND_EXCLUSIVE_CATEGORY, SIZE_EXCLUSIVE_CATEGORY
    )
    from agent.filters import FilterState, FilterValue
    from agent.config import CORRECTION_COOLDOWN, FUZZY_MIN_LEN
except (ImportError, ModuleNotFoundError):
    from catalogue_index import (
        CATEGORIES, BRANDS, BRANDS_LOWER, COLOURS, ALL_SIZES, CATEGORY_SIZES,
        BRAND_CATEGORIES, BRAND_EXCLUSIVE_CATEGORY, SIZE_EXCLUSIVE_CATEGORY
    )
    from filters import FilterState, FilterValue
    from config import CORRECTION_COOLDOWN, FUZZY_MIN_LEN


def levenshtein_1(s1: str, s2: str) -> bool:
    """Returns True if edit distance between s1 and s2 is <= 1."""
    if s1 == s2:
        return True
    l1, l2 = len(s1), len(s2)
    if abs(l1 - l2) > 1:
        return False
    if l1 == l2:
        return sum(1 for a, b in zip(s1, s2) if a != b) <= 1
    if l1 > l2:
        s1, s2 = s2, s1
        l1, l2 = l2, l1
    i = j = diffs = 0
    while i < l1 and j < l2:
        if s1[i] == s2[j]:
            i += 1
            j += 1
        else:
            diffs += 1
            if diffs > 1:
                return False
            j += 1
    return True


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
    (['formal', 'shoes'], 'sneakers'),
    (['formal', 'shoe'], 'sneakers'),
    (['running', 'shoes'], 'running shoes'),
    (['running', 'sneakers'], 'running shoes'),
    (['running', 'shoe'], 'running shoes'),
    (['jogging', 'shoes'], 'running shoes'),
    (['sport', 'shoes'], 'running shoes'),
    (['sports', 'shoes'], 'running shoes'),
    (['casual', 'sneakers'], 'sneakers'),
    (['track', 'pants'], 'track pants'),
    (['track', 'pant'], 'track pants'),
    (['hooded', 'sweatshirt'], 'hoodies'),
    (['pair', 'of', 'jeans'], 'jeans'),
    (['wrist', 'watch'], 'watches'),
    (['wrist', 'accessory'], 'watches'),
    (['t', 'shirt'], 't-shirts'),
    (['t', 'shirts'], 't-shirts'),
    (['bag', 'pack'], 'backpacks'),
    (['bag', 'packs'], 'backpacks'),
    (['flip', 'flops'], 'sandals'),
    (['ethnic', 'wear'], 'kurtas'),
]

SINGLE_WORD_CATEGORIES = {
    'sneakers': 'sneakers', 'sneaker': 'sneakers', 'kicks': 'sneakers', 'trainers': 'sneakers', 'trainer': 'sneakers', 'loafers': 'sneakers', 'loafer': 'sneakers', 'cleats': 'running shoes',
    'sandals': 'sandals', 'sandal': 'sandals', 'slides': 'sandals', 'floaters': 'sandals', 'chappal': 'sandals', 'chappals': 'sandals', 'slippers': 'sandals', 'flip-flops': 'sandals', 'flipflops': 'sandals', 'sandels': 'sandals',
    'hoodies': 'hoodies', 'hoodie': 'hoodies', 'hoody': 'hoodies', 'sweatshirt': 'hoodies', 'sweatshirts': 'hoodies', 'pullover': 'hoodies',
    'jackets': 'jackets', 'jacket': 'jackets', 'windbreaker': 'jackets', 'windbreakers': 'jackets', 'coat': 'jackets', 'blazer': 'jackets', 'outerwear': 'jackets', 'outerwears': 'jackets',
    'jeans': 'jeans', 'jean': 'jeans', 'denims': 'jeans', 'denim': 'jeans', 'chinos': 'jeans',
    'kurtas': 'kurtas', 'kurta': 'kurtas', 'kurti': 'kurtas', 'kurties': 'kurtas',
    'dresses': 'dresses', 'dress': 'dresses',
    'caps': 'caps', 'cap': 'caps', 'hat': 'caps', 'beanie': 'caps',
    'backpacks': 'backpacks', 'backpack': 'backpacks', 'rucksack': 'backpacks', 'baig': 'backpacks', 'bag': 'backpacks', 'pack': 'backpacks',
    'wallets': 'wallets', 'wallet': 'wallets', 'purse': 'wallets',
    'watches': 'watches', 'watch': 'watches', 'wristwatch': 'watches', 'ghadi': 'watches', 'timepiece': 'watches', 'chronograph': 'watches',
    'headphones': 'headphones', 'headphone': 'headphones', 'headset': 'headphones', 'earphones': 'headphones', 'earphone': 'headphones', 'earbuds': 'headphones', 'earbud': 'headphones', 'airpods': 'headphones',
    'shirts': 'shirts', 'shirt': 'shirts',
    'trackpants': 'track pants', 'joggers': 'track pants', 'lower': 'track pants', 'lowers': 'track pants', 'trousers': 'track pants', 'trouser': 'track pants', 'pajama': 'track pants', 'pajamas': 'track pants', 'bottoms': 'track pants', 'trackies': 'track pants',
    'tshirt': 't-shirts', 'tshirts': 't-shirts', 'tee': 't-shirts', 'tees': 't-shirts', 't-shirt': 't-shirts', 't-shirts': 't-shirts', 'polo': 't-shirts', 'polos': 't-shirts', 'top': 't-shirts',
    'runners': 'running shoes',
    'joota': 'sneakers', 'joote': 'sneakers', 'juta': 'sneakers', 'jute': 'sneakers',
    'shoes': 'sneakers', 'shoe': 'sneakers', 'footwear': 'sneakers',
    'pants': 'track pants', 'pant': 'track pants',
}

MULTI_WORD_BRANDS = [
    (['kesar', 'loom'], 'Kesar Loom'),
]

COMPOUND_COLOURS = [
    (['navy', 'blue'], 'navy'),
    (['olive', 'green'], 'olive'),
    (['dark', 'blue'], 'navy'),
    (['deep', 'blue'], 'navy'),
    (['sky', 'blue'], 'blue'),
    (['light', 'blue'], 'blue'),
    (['dark', 'grey'], 'grey'),
    (['dark', 'gray'], 'grey'),
    (['light', 'grey'], 'grey'),
    (['light', 'gray'], 'grey'),
    (['off', 'white'], 'white'),
]

COLOUR_MAP = {
    'gray': 'grey',
    'charcoal': 'grey',
    'slate': 'grey',
    'ash': 'grey',
    'golden': 'gold',
    'cream': 'beige',
    'ivory': 'white',
    'off-white': 'white',
    'offwhite': 'white',
    'burgundy': 'maroon',
    'wine': 'maroon',
    'cherry': 'maroon',
    'crimson': 'red',
    'scarlet': 'red',
    'ruby': 'red',
    'mustard': 'yellow',
    'amber': 'yellow',
    'ochre': 'yellow',
    'khaki': 'tan',
    'camel': 'brown',
    'coffee': 'brown',
    'chocolate': 'brown',
    'teal': 'blue',
    'cyan': 'blue',
    'turquoise': 'blue',
    'sky': 'blue',
    'indigo': 'navy',
    'darkblue': 'navy',
    'magenta': 'pink',
    'rose': 'pink',
    'peach': 'pink',
    'salmon': 'pink',
    'emerald': 'green',
    'mint': 'green',
    'forest': 'green',
    'moss': 'green',
    'kaala': 'black', 'kala': 'black',
    'safed': 'white',
    'neela': 'blue', 'nila': 'blue',
    'laal': 'red', 'lal': 'red',
    'hara': 'green',
    'peela': 'yellow', 'pila': 'yellow',
    'bhoora': 'brown', 'bhura': 'brown',
    'gulabi': 'pink',
}

SIZE_HOMOPHONES = {
    'too': '2', 'to': '2',
    'for': '4', 'fore': '4',
    'ate': '8',
    'won': '1',
}

NEGATION_WORDS = {
    'not', 'dont', "don't", 'except', 'excluding', 'without', 'neither', 'nor', 'bina'
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

UNIVERSAL_CLOSURE_WORDS = {
    'please', 'thanks', 'thank', 'chahiye', 'milega', 'dikhao', 'dikhaiye', 'batao', 'help'
}

CLOSURE_PHRASES = [
    ['have', 'it'],
    ['hai', 'kya'],
    ['this', 'week'],
    ['too', 'flashy'],
    ['thank', 'you'],
    ['if', 'you'],
    ['need', 'it'],
    ['want', 'it'],
    ['nothing', 'too'],
    ['as', 'a'],
    ['for', 'a'],
    ['for', 'the'],
    ['for', 'my'],
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
    'uh', 'hmm', 'has', 'be', 'from', 'by', 'brand', 'only', 'more', 'than', 'rupees', 'rs',
    'inr', 'bucks', 'approx', 'around', 'about', 'as', 'badhiya', 'sa',
    'bhai', 'yaar', 'dost', 'kripya', 'dekho', 'wale', 'achha', 'sahi', 'latest',
    'thoda', 'sasta', 'mehenga', 'waala'
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

    # Hindi fractions
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

    # Tens + Ones hundred
    if tokens[i] in ('twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'):
        tens = ENGLISH_NUMBERS[tokens[i]]
        if i + 2 < n and tokens[i+1] in ENGLISH_NUMBERS and tokens[i+2] in ('hundred', 'sau', 'so'):
            ones = ENGLISH_NUMBERS[tokens[i+1]]
            return ((tens + ones) * 100, i + 3)
        if i + 1 < n and tokens[i+1] in ('hundred', 'sau', 'so'):
            return (tens * 100, i + 2)

    # Teens hundred
    if tokens[i] in ('eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'):
        teens = ENGLISH_NUMBERS[tokens[i]]
        if i + 1 < n and tokens[i+1] in ('hundred', 'sau', 'so'):
            return (teens * 100, i + 2)

    # English fractions: "two and a half thousand" -> 2500
    if i + 4 < n and tokens[i] in ENGLISH_NUMBERS and tokens[i+1:i+4] == ['and', 'a', 'half'] and tokens[i+4] in ('thousand', 'hazaar', 'hazar'):
        return (int((ENGLISH_NUMBERS[tokens[i]] + 0.5) * 1000), i + 5)

    # Num thousand num hundred (supports digit strings e.g. "4 hazaar" or word numbers "four hazaar")
    num1 = ENGLISH_NUMBERS.get(tokens[i]) or HINDI_NUMBERS.get(tokens[i])
    if num1 is None and tokens[i].isdigit() and int(tokens[i]) < 200:
        num1 = int(tokens[i])

    if num1 is not None and i + 1 < n and tokens[i+1] in ('thousand', 'hazaar', 'hazar'):
        val = num1 * 1000
        if i + 3 < n:
            num2 = ENGLISH_NUMBERS.get(tokens[i+2]) or HINDI_NUMBERS.get(tokens[i+2])
            if num2 is None and tokens[i+2].isdigit() and int(tokens[i+2]) < 100:
                num2 = int(tokens[i+2])
            if num2 is not None and tokens[i+3] in ('hundred', 'sau', 'so'):
                return (val + num2 * 100, i + 4)
        return (val, i + 2)

    # Num hundred
    if num1 is not None and i + 1 < n and tokens[i+1] in ('hundred', 'sau', 'so'):
        return (num1 * 100, i + 2)

    # Digits and suffixes: '4k', '0.8k', '₹1500', '1,500'
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
    """Maintains token sequence and incrementally extracts FilterState with safe fuzzy matching."""

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
        """Extract structured filters from the sequence of tokens seen so far,
        including negation awareness and homophone disambiguation.
        """
        tokens = self.tokens
        n = len(tokens)
        slots_found: Dict[str, Tuple[any, int, str]] = {}

        def is_negated(start_i: int) -> bool:
            if start_i > 0 and tokens[start_i - 1] in NEGATION_WORDS:
                return True
            if start_i > 1 and (
                tokens[start_i - 2:start_i] == ['other', 'than']
                or tokens[start_i - 2:start_i] == ['instead', 'of']
            ):
                return True
            # Support conjunctions: "except black or red", "neither black nor red"
            if start_i > 1 and tokens[start_i - 1] in ('or', 'nor', 'and'):
                for lookback in range(2, 5):
                    if start_i - lookback >= 0:
                        prev = tokens[start_i - lookback]
                        if prev in NEGATION_WORDS or prev in ('other', 'instead'):
                            return True
                        if prev not in ('or', 'nor', 'and', 'either', 'neither') and prev not in COLOURS and prev not in BRANDS_LOWER:
                            break
            return False

        def register_slot(slot_name: str, val: any, w_idx: int, prov: str, start_i: int):
            if is_negated(start_i):
                self.state.exclude_filter(slot_name, str(val))
                if slot_name in slots_found:
                    del slots_found[slot_name]
            else:
                slots_found[slot_name] = (val, w_idx, prov)

        i = 0
        while i < n:
            tok = tokens[i]

            # 1. Multi-word brand: 'kesar loom'
            matched_brand = None
            for phrase, brand_name in MULTI_WORD_BRANDS:
                plen = len(phrase)
                if tokens[i:i+plen] == phrase:
                    matched_brand = brand_name
                    register_slot('brand', matched_brand, i + 1, "multi_brand", i)
                    i += plen
                    break
            if matched_brand:
                continue

            # 2. Single-word brand (exact match)
            if tok in BRANDS_LOWER:
                register_slot('brand', BRANDS_LOWER[tok], i + 1, "brand", i)
                i += 1
                continue

            # 3. Safe fuzzy match for brand (only if len >= FUZZY_MIN_LEN)
            if len(tok) >= FUZZY_MIN_LEN:
                matched_fuzzy_brand = None
                for b_low, b_orig in BRANDS_LOWER.items():
                    if len(b_low) >= FUZZY_MIN_LEN and levenshtein_1(tok, b_low):
                        matched_fuzzy_brand = b_orig
                        break
                if matched_fuzzy_brand:
                    register_slot('brand', matched_fuzzy_brand, i + 1, "brand_fuzzy", i)
                    i += 1
                    continue

            # 4. Multi-word categories (with fuzzy token matching)
            matched_cat = None
            for phrase, cat_name in MULTI_WORD_CATEGORIES:
                plen = len(phrase)
                if i + plen <= n:
                    window = tokens[i:i+plen]
                    # Check exact or 1 fuzzy token match in phrase
                    match = True
                    for p_word, w_word in zip(phrase, window):
                        if p_word != w_word:
                            if len(w_word) >= FUZZY_MIN_LEN and levenshtein_1(p_word, w_word):
                                continue
                            match = False
                            break
                    if match:
                        matched_cat = cat_name
                        register_slot('category', matched_cat, i + 1, "multi_cat", i)
                        i += plen
                        break
            if matched_cat:
                continue

            # 5. Single-word categories (exact + synonyms)
            if tok in SINGLE_WORD_CATEGORIES:
                register_slot('category', SINGLE_WORD_CATEGORIES[tok], i + 1, "cat", i)
                i += 1
                continue

            # 6. Safe fuzzy match for categories (only if len >= FUZZY_MIN_LEN)
            if len(tok) >= FUZZY_MIN_LEN:
                matched_fuzzy_cat = None
                for c_syn, c_canon in SINGLE_WORD_CATEGORIES.items():
                    if len(c_syn) >= FUZZY_MIN_LEN and levenshtein_1(tok, c_syn):
                        matched_fuzzy_cat = c_canon
                        break
                if matched_fuzzy_cat:
                    register_slot('category', matched_fuzzy_cat, i + 1, "cat_fuzzy", i)
                    i += 1
                    continue

            # 7. Compound colours
            matched_col = None
            for phrase, col_name in COMPOUND_COLOURS:
                plen = len(phrase)
                if tokens[i:i+plen] == phrase:
                    matched_col = col_name
                    register_slot('colour', matched_col, i + 1, "compound_colour", i)
                    i += plen
                    break
            if matched_col:
                continue

            # 8. Single-word colours
            if tok in COLOURS:
                register_slot('colour', tok, i + 1, "colour", i)
                i += 1
                continue
            if tok in COLOUR_MAP:
                register_slot('colour', COLOUR_MAP[tok], i + 1, "colour_map", i)
                i += 1
                continue

            # 9. Price phrases
            p_res = parse_price_phrase(tokens, i)
            if p_res:
                val, end_idx = p_res

                # Check if preceding tokens specify min_price vs max_price
                is_min = False
                if i > 2 and tokens[i-3:i] in (['not', 'more', 'than'], ['no', 'more', 'than'], ['not', 'above', 'than']):
                    is_min = False
                elif i > 1 and tokens[i-2:i] in (['not', 'exceeding'], ['not', 'above'], ['no', 'more']):
                    is_min = False
                elif i > 2 and tokens[i-3:i] in (['not', 'less', 'than'], ['no', 'less', 'than'], ['not', 'under', 'than']):
                    is_min = True
                elif i > 1 and tokens[i-2:i] in (['not', 'less'], ['not', 'under'], ['not', 'below']):
                    is_min = True
                elif i > 1 and tokens[i-2:i] in (
                    ['more', 'than'], ['greater', 'than'], ['at', 'least'],
                    ['starting', 'from'], ['starting', 'at'],
                    ['se', 'upar'], ['se', 'zyada'], ['se', 'jyada']
                ):
                    is_min = True
                elif i > 0 and tokens[i-1] in ('above', 'over', 'min', 'minimum'):
                    is_min = True
                elif i > 0 and tokens[i-1] in ('upar', 'zyada', 'jyada'):
                    is_min = True

                # Check succeeding post-position tokens (e.g. "3500 se upar", "7000 se kam")
                if end_idx < n:
                    if end_idx + 1 < n and tokens[end_idx:end_idx+2] in (['se', 'upar'], ['se', 'zyada'], ['se', 'jyada']):
                        is_min = True
                    elif tokens[end_idx] in ('upar', 'zyada', 'jyada'):
                        is_min = True
                    elif end_idx + 1 < n and tokens[end_idx:end_idx+2] in (['se', 'kam'], ['se', 'niche']):
                        is_min = False
                    elif tokens[end_idx] in ('kam', 'niche', 'tak'):
                        is_min = False

                # Check for range syntax: "between 2000 and 5000" or "2000 to 5000"
                is_range_start = (i > 0 and tokens[i-1] == 'between')
                has_range_sep = (end_idx < n and tokens[end_idx] in ('and', 'to', '-'))

                if (is_range_start or has_range_sep) and end_idx < n:
                    sep_offset = 1 if has_range_sep else 0
                    p_res2 = parse_price_phrase(tokens, end_idx + sep_offset)
                    if p_res2:
                        val2, end_idx2 = p_res2
                        register_slot('min_price', min(val, val2), i + 1, "price_range_min", i)
                        register_slot('max_price', max(val, val2), end_idx + sep_offset + 1, "price_range_max", end_idx + sep_offset)
                        i = end_idx2
                        continue

                slot_name = 'min_price' if is_min else 'max_price'
                register_slot(slot_name, val, i + 1, "price", i)
                i = end_idx
                continue

            # 10. Size phrases
            if tokens[i:i+2] == ['extra', 'large']:
                register_slot('size', 'XL', i + 1, "size_phrase", i)
                i += 2
                continue
            if tokens[i:i+2] == ['extra', 'small']:
                register_slot('size', 'XS', i + 1, "size_phrase", i)
                i += 2
                continue
            if tokens[i:i+3] == ['double', 'extra', 'large']:
                register_slot('size', 'XXL', i + 1, "size_phrase", i)
                i += 3
                continue
            if tokens[i:i+2] == ['double', 'xl']:
                register_slot('size', 'XXL', i + 1, "size_phrase", i)
                i += 2
                continue
            if tok in ('small', 'medium', 'large', 'xs', 'xl', 'xxl', '2xl'):
                register_slot('size', SIZE_WORDS.get(tok, tok.upper()), i + 1, "size_word", i)
                i += 1
                continue

            if tok in ('size', 'uk', 'waist', 'number') and i + 1 < n:
                next_t = tokens[i+1]
                num = (
                    ENGLISH_NUMBERS.get(next_t)
                    or HINDI_NUMBERS.get(next_t)
                    or SIZE_HOMOPHONES.get(next_t)
                )
                if num is not None and str(num) in ALL_SIZES:
                    register_slot('size', str(num), i + 1, "size_cue", i)
                    i += 2
                    continue
                elif next_t in ALL_SIZES:
                    register_slot('size', next_t.upper() if next_t.isalpha() else next_t, i + 1, "size_cue", i)
                    i += 2
                    continue
                elif next_t.upper() in ALL_SIZES:
                    register_slot('size', next_t.upper(), i + 1, "size_cue", i)
                    i += 2
                    continue

            if i + 1 < n and tokens[i+1] in ('uk', 'waist', 'size', 'number'):
                num = (
                    ENGLISH_NUMBERS.get(tok)
                    or HINDI_NUMBERS.get(tok)
                    or SIZE_HOMOPHONES.get(tok)
                )
                if num is not None and str(num) in ALL_SIZES:
                    register_slot('size', str(num), i + 1, "size_post_cue", i)
                    i += 2
                    continue
                elif tok in ALL_SIZES:
                    register_slot('size', tok.upper() if tok.isalpha() else tok, i + 1, "size_post_cue", i)
                    i += 2
                    continue

            if tok in ('actually', 'sorry', 'oops') and i + 1 < n:
                next_t = tokens[i+1]
                num = (
                    ENGLISH_NUMBERS.get(next_t)
                    or HINDI_NUMBERS.get(next_t)
                    or SIZE_HOMOPHONES.get(next_t)
                )
                if num is not None and str(num) in ALL_SIZES:
                    register_slot('size', str(num), i + 1, "corr_size", i)
                    i += 2
                    continue
                elif next_t in ALL_SIZES or next_t.upper() in ALL_SIZES:
                    register_slot('size', next_t.upper() if next_t.isalpha() else next_t, i + 1, "corr_size", i)
                    i += 2
                    continue

            i += 1

        # 11. Catalogue Grounding (Mutual Inference):
        # A. If size is exclusively in ONE category (e.g. waist sizes in jeans), infer category:
        if 'size' in slots_found and 'category' not in slots_found:
            s_val = str(slots_found['size'][0])
            if s_val in SIZE_EXCLUSIVE_CATEGORY:
                slots_found['category'] = (SIZE_EXCLUSIVE_CATEGORY[s_val], slots_found['size'][1], "inferred_from_size")

        # B. If brand makes exclusively ONE category, infer category if missing:
        if 'brand' in slots_found and 'category' not in slots_found:
            b_low = str(slots_found['brand'][0]).lower()
            if b_low in BRAND_EXCLUSIVE_CATEGORY:
                inferred_cat = BRAND_EXCLUSIVE_CATEGORY[b_low]
                slots_found['category'] = (inferred_cat, slots_found['brand'][1], "inferred_from_brand")

        # Resolve conflicting price bounds or price corrections (e.g. "under 400 sorry above 5000")
        if 'min_price' in slots_found and 'max_price' in slots_found:
            min_val, min_w, min_prov = slots_found['min_price']
            max_val, max_w, max_prov = slots_found['max_price']
            is_explicit_range = ("price_range" in str(min_prov) and "price_range" in str(max_prov))

            has_correction_between = False
            first_w, second_w = sorted([min_w, max_w])
            for t_idx in range(max(0, first_w - 1), min(len(tokens), second_w)):
                if tokens[t_idx] in CORRECTION_SIGNALS:
                    has_correction_between = True
                    break

            if not is_explicit_range and (min_val >= max_val or has_correction_between):
                # The later price token supersedes the earlier one
                if min_w > max_w:
                    del slots_found['max_price']
                else:
                    del slots_found['min_price']

        # Update FilterState
        for slot in ('category', 'colour', 'brand', 'size', 'max_price', 'min_price'):
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
        """Check if recent tokens or structural signals indicate query completion."""
        tokens = self.tokens
        if not tokens:
            return False

        # 1. Universal politeness / closure words
        if tokens[-1] in UNIVERSAL_CLOSURE_WORDS or (len(tokens) >= 2 and tokens[-2] in UNIVERSAL_CLOSURE_WORDS):
            return True

        # 2. Structural closing phrases (e.g. 'for a', 'as a', 'this week', 'have it')
        for cp in CLOSURE_PHRASES:
            cplen = len(cp)
            if len(tokens) >= cplen and tokens[-cplen:] == cp:
                return True

        # 3. General purpose clause: 'for [a/the/my]? [noun]' or 'as [a/the/my]? [noun]'
        # e.g. 'for college', 'for diwali', 'as a present', 'for my sister'
        if len(tokens) >= 2:
            prep_idx = None
            if tokens[-2] in ('for', 'as'):
                prep_idx = -2
            elif len(tokens) >= 3 and tokens[-3] in ('for', 'as') and tokens[-2] in ('a', 'an', 'the', 'my'):
                prep_idx = -3

            if prep_idx is not None:
                last_tok = tokens[-1]
                if last_tok not in ('under', 'below', 'less', 'max', 'budget', 'above', 'over', 'within', 'upto'):
                    if last_tok not in SINGLE_WORD_CATEGORIES and last_tok not in COLOURS and last_tok not in ALL_SIZES:
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
        filter_tokens = set()
        for s in ('category', 'colour', 'brand', 'size', 'max_price', 'min_price'):
            fv = getattr(self.state, s)
            if fv is not None:
                val_str = str(fv.value).lower()
                filter_tokens.add(val_str)
                for part in val_str.split():
                    filter_tokens.add(part)

        price_operators = {
            'under', 'below', 'less', 'within', 'above', 'more', 'than',
            'max', 'min', 'budget', 'upto', 'up', 'around', 'approx', 'price',
            'rupees', 'rs', 'inr', 'bucks', 'k', 'hazaar', 'hazar', 'thousand',
            'hundred', 'sau', 'so', 'cost', 'worth'
        }

        size_indicators = {
            'size', 'uk', 'waist', 'number', 'no', 'inch', 'inches',
            'small', 'medium', 'large', 'xs', 'xl', 'xxl', '2xl', 'xxs',
            's', 'm', 'l'
        }

        category_keywords = set(CATEGORIES)
        category_keywords.update(SINGLE_WORD_CATEGORIES.keys())
        category_keywords.update(SINGLE_WORD_CATEGORIES.values())
        for phrase, _ in MULTI_WORD_CATEGORIES:
            category_keywords.update(phrase)

        brand_keywords = set(BRANDS_LOWER.keys())
        for phrase, _ in MULTI_WORD_BRANDS:
            brand_keywords.update(phrase)

        colour_keywords = set(COLOURS)
        colour_keywords.update(COLOUR_MAP.keys())
        for phrase, _ in COMPOUND_COLOURS:
            colour_keywords.update(phrase)

        res_tokens = []
        for t in tokens:
            if (
                t in STOPWORDS
                or t in UNIVERSAL_CLOSURE_WORDS
                or t in CORRECTION_SIGNALS
                or t in price_operators
                or t in size_indicators
                or t in filter_tokens
                or t in category_keywords
                or t in brand_keywords
                or t in colour_keywords
                or t in ALL_SIZES
                or t.isdigit()
            ):
                continue
            res_tokens.append(t)

        self.state.residual_tokens = res_tokens
        return " ".join(res_tokens)

    def flush(self) -> FilterState:
        """Flush buffer and finalize state."""
        self._extract_all_slots(len(self.tokens))
        self.get_residual_query()
        return self.state
