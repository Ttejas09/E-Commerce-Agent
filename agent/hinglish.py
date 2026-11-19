"""Hinglish normaliser — lookup tables and helper functions."""

from typing import Optional, Union
import re

# ---------------------------------------------------------------------------
# Hindi number words → int
# ---------------------------------------------------------------------------
HINDI_NUMBERS = {
    'ek': 1, 'do': 2, 'teen': 3, 'tin': 3,
    'chaar': 4, 'char': 4, 'paanch': 5, 'panch': 5,
    'chhah': 6, 'chhe': 6, 'che': 6,
    'saat': 7, 'sat': 7, 'aath': 8, 'ath': 8,
    'nau': 9, 'das': 10,
    'gyarah': 11, 'baarah': 12, 'barah': 12,
    'bees': 20, 'tees': 30, 'chaalis': 40, 'pachaas': 50,
    'saath': 60, 'sattar': 70, 'assi': 80, 'nabbe': 90,
    'sau': 100, 'so': 100,
    'hazaar': 1000, 'hazar': 1000,
}

# ---------------------------------------------------------------------------
# Hindi colour words → English
# ---------------------------------------------------------------------------
HINDI_COLOURS = {
    'kaala': 'black', 'kala': 'black',
    'safed': 'white',
    'neela': 'blue', 'nila': 'blue',
    'laal': 'red', 'lal': 'red',
    'hara': 'green',
    'peela': 'yellow', 'pila': 'yellow',
    'bhoora': 'brown', 'bhura': 'brown',
    'gulabi': 'pink',
}

# ---------------------------------------------------------------------------
# Category synonyms (single-word and multi-word)
# ---------------------------------------------------------------------------
CATEGORY_SYNONYMS = {
    'joote': 'shoes', 'joota': 'shoes', 'jute': 'shoes',
    'chappal': 'sandals', 'slides': 'sandals', 'floaters': 'sandals',
    'ghadi': 'watches',
    'baig': 'backpacks', 'bag': 'backpacks',
    'kurti': 'kurtas', 'kurta': 'kurtas',
    'joggers': 'track pants', 'trackpants': 'track pants', 'lower': 'track pants',
    'tee': 't-shirts', 'tshirt': 't-shirts',
    'runners': 'running shoes',
    'hoodie': 'hoodies', 'sweatshirt': 'hoodies',
    'sneaker': 'sneakers',
    'jacket': 'jackets',
    'shirt': 'shirts',
    'jean': 'jeans',
    'dress': 'dresses',
    'cap': 'caps',
    'wallet': 'wallets',
    'watch': 'watches',
    'headphone': 'headphones',
    'backpack': 'backpacks',
    'sandal': 'sandals',
}

# Multi-word synonyms (checked separately in the extractor)
MULTI_WORD_CATEGORY_SYNONYMS = {
    'hooded sweatshirt': 'hoodies',
}

# ---------------------------------------------------------------------------
# Correction markers (single-word)
# ---------------------------------------------------------------------------
CORRECTION_MARKERS = {'oops', 'sorry', 'wait', 'actually', 'instead', 'nahi', 'galti'}

# ---------------------------------------------------------------------------
# Boundary cues — signals that a clause boundary is nearby
# ---------------------------------------------------------------------------
BOUNDARY_CUES = {'please', 'thanks', 'chahiye', 'milega', 'dikhao', 'dikhaiye', 'batao'}

# ---------------------------------------------------------------------------
# Stopwords
# ---------------------------------------------------------------------------
HINGLISH_STOPWORDS = {
    'kya', 'aapke', 'paas', 'milega', 'mil', 'jayega', 'chahiye',
    'mujhe', 'mera', 'hai', 'ho', 'dikhao', 'dikhaiye', 'batao',
    'wala', 'wali', 'mein', 'me', 'ka', 'ki', 'ke',
}

ENGLISH_STOPWORDS = {
    'i', 'me', 'my', 'the', 'a', 'an', 'is', 'it', 'in', 'to',
    'for', 'of', 'and', 'or', 'do', 'you', 'have', 'any', 'can',
    'find', 'get', 'want', 'need', 'show', 'looking', 'something',
    'one', 'with', 'that', 'this', 'some', 'if', 'too', 'also',
    'just', 'like', 'im', "i'm", 'hey', 'hi', 'hello', 'nothing', 'your',
}

# ---------------------------------------------------------------------------
# Price / size cue words
# ---------------------------------------------------------------------------
PRICE_BEFORE_CUES = {'under', 'below', 'max', 'budget', 'within', 'upto', 'less'}
PRICE_AFTER_CUES = {'k', 'tak', 'thousand', 'hundred', 'hazaar', 'hazar', 'sau', 'so'}
MIN_PRICE_CUES = {'above', 'over', 'minimum', 'least', 'zyada', 'upar'}
SIZE_CUES = {'size', 'uk', 'waist'}

# ===================================================================
# Helper functions
# ===================================================================

_TRAILING_PUNCT = re.compile(r'[,.\-!?;:]+$')
_CURRENCY_PREFIX = re.compile(r'^[₹$]')


def normalize_token(token: str) -> str:
    """Strip trailing punctuation and lowercase."""
    t = _TRAILING_PUNCT.sub('', token)
    return t.lower()


def is_hindi_number(token: str) -> Optional[int]:
    """Return the integer value if *token* is a Hindi number word, else None."""
    return HINDI_NUMBERS.get(token.lower())


def is_hindi_colour(token: str) -> Optional[str]:
    """Return the English colour name if *token* is a Hindi colour word, else None."""
    return HINDI_COLOURS.get(token.lower())


def is_category_synonym(token: str) -> Optional[str]:
    """Return the canonical category if *token* is a known synonym, else None."""
    return CATEGORY_SYNONYMS.get(token.lower())


def is_correction_marker(token: str) -> bool:
    return token.lower() in CORRECTION_MARKERS


def is_boundary_cue(token: str) -> bool:
    return token.lower() in BOUNDARY_CUES


def is_hinglish_stopword(token: str) -> bool:
    return token.lower() in HINGLISH_STOPWORDS


def is_price_cue_before(token: str) -> bool:
    """under / below / max / budget …"""
    return token.lower() in PRICE_BEFORE_CUES


def is_min_price_cue(token: str) -> bool:
    """above / over / minimum …"""
    return token.lower() in MIN_PRICE_CUES


def is_size_cue(token: str) -> bool:
    """size / uk / waist"""
    return token.lower() in SIZE_CUES


def parse_number_token(token: str) -> Optional[Union[int, float]]:
    """Parse a numeric token to int or float.

    Handles:
      - plain digits: '500' → 500
      - commas:       '7,500' → 7500
      - k-suffix:     '4k' → 4000, '0.8k' → 800
      - ₹ prefix:     '₹500' → 500
    Returns None when the token is not numeric.
    """
    t = token.strip().lower()
    # strip currency prefix
    t = _CURRENCY_PREFIX.sub('', t)
    if not t:
        return None

    # k-suffix
    if t.endswith('k'):
        body = t[:-1].replace(',', '')
        try:
            num = float(body)
            result = num * 1000
            return int(result) if result == int(result) else result
        except ValueError:
            return None

    # commas
    t = t.replace(',', '')
    if not t:
        return None

    try:
        if '.' in t:
            return float(t)
        return int(t)
    except ValueError:
        return None


def is_english_stopword(token: str) -> bool:
    return token.lower() in ENGLISH_STOPWORDS
