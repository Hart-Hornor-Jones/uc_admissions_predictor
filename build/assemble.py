"""Assemble ../index.html from page_src.html + d3.v7.min.js + ../data/uc_data.json + ../data/school_county.csv.

Run from anywhere:  python assemble.py
The data file is embedded byte for byte; the county table is embedded as a {ceeb: county} object.
"""
import csv, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')

def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()

page = read(os.path.join(HERE, 'page_src.html'))
d3 = read(os.path.join(HERE, 'd3.v7.min.js')).rstrip('\r\n')
data = read(os.path.join(ROOT, 'data', 'uc_data.json')).strip()
county = {}
with open(os.path.join(ROOT, 'data', 'school_county.csv'), encoding='utf-8', newline='') as f:
    for row in csv.DictReader(f):
        if row['county']:
            county[row['ceeb']] = row['county']

page = page.replace('/*__D3__*/', d3, 1)
page = page.replace('/*__DATA__*/', data.replace('</', '<\\/'), 1)
page = page.replace('/*__COUNTY__*/', json.dumps(county, separators=(',', ':'), ensure_ascii=False).replace('</', '<\\/'), 1)
with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(page)
print(f'index.html written: {len(page):,} characters; {len(county)} schools with a county')
