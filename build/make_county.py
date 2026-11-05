"""Build ../data/school_county.csv (ceeb, name, county) for every school in ../data/uc_data.json.

The county of each school is read from a school-directory table with at least the columns
``ceeb`` and ``county`` (the file used here is data/schools.csv from the public repository
Hart-Hornor-Jones/ucsd-local-preference, which derives it from the California Department of
Education public school directory). Schools without a county in that table are written with an
empty county and are treated as non-local on the page.

Usage (any OS):  python make_county.py path/to/schools.csv
"""
import csv, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'ucsd-local-preference', 'data', 'schools.csv')
OUT = os.path.join(HERE, '..', 'data', 'school_county.csv')

with open(os.path.join(HERE, '..', 'data', 'uc_data.json'), encoding='utf-8') as f:
    D = json.load(f)
ci = {c: i for i, c in enumerate(D['cols'])}
schools = {}
for rows in D['cells'].values():
    for r in rows:
        schools.setdefault(r[ci['ceeb']], r[ci['name']])

county = {}
with open(SRC, encoding='utf-8', newline='') as f:
    for row in csv.DictReader(f):
        county[row['ceeb'].strip()] = row['county'].strip()

missing = [c for c in schools if c not in county]
with open(OUT, 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    w.writerow(['ceeb', 'name', 'county'])
    for c in sorted(schools):
        w.writerow([c, schools[c], county.get(c, '')])
print(f'{len(schools)} schools written to {os.path.relpath(OUT)}; {len(missing)} without a county')
