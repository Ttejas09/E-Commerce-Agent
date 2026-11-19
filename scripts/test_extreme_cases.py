"""Diagnose 12 extreme edge cases on the current Agent implementation."""

import sys
from pathlib import Path
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from agent.agent import Agent
from evaluate import Tools
from search import load_catalogue

cat = {p['product_id']: p for p in load_catalogue()}

cases = [
    ('Case 1', 'black formal shoes size 8 wait no brown loafers size 9 actually'),
    ('Case 2', 'strydo drift running shoes under 4000 scratch that make it kudova under 3000'),
    ('Case 3', 'white sneakers not less than 4000 but not exceeding 6000'),
    ('Case 4', 'running shoes anything except black or red under 3500'),
    ('Case 5', 'cozy winter warm outerwear for college under 5000'),
    ('Case 6', 'classy minimalist wrist accessory in black'),
    ('Case 7', 'strydo ke sneakers dikhao 3500 se upar lekin 7000 se kam me'),
    ('Case 8', 'bhai koi badhiya black jacket dikhana budget 4 hazaar tak ka hai'),
    ('Case 9', 'denim jacket around two and a half thousand'),
    ('Case 10', 'black shoes budget 3.5k'),
    ('Case 11', 'sonquil running shoes size 9 under 3000'),
    ('Case 12', 'black running shoes size 9 wait size 8'),
]

for name, query in cases:
    t = Tools()
    a = Agent(t)
    a.start('test')
    commits = []
    for w in query.split():
        out = a.observe(w)
        if out and out.get('commit'):
            commits.append(out['commit'])
    fin = a.finish() or (commits[-1] if commits else None)
    filters = a.extractor.state.get_search_filters()
    prod = cat.get(fin)
    p_info = f'{prod["product_id"]} {prod["title"]} ₹{prod["price"]}' if prod else 'None'
    print(f'=== {name}: "{query}" ===')
    print(f'Filters: {filters}')
    print(f'Commits: {commits} | Final: {p_info}\n')
