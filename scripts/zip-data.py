"""
Builds src/data/zips.json, the app's US ZIP code table, from GeoNames' US
postal code file (US.txt, CC BY 4.0, https://www.geonames.org/).

Each ZIP keeps its place name, state and a center point rounded to 0.01°
(about a kilometer), which is all the app needs for "kitchens near you".
Rows are sorted by ZIP and delta-encoded to keep the file small.

Usage: python3 -I scripts/zip-data.py path/to/US.txt
"""
import json
import sys

STATES = {
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
    'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC',
    'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
}


def main(path: str) -> None:
    rows = {}
    with open(path, encoding='utf-8') as f:
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) < 11 or p[4] not in STATES or not p[9] or not p[10]:
                continue
            zip_code = p[1].strip()
            if len(zip_code) != 5 or not zip_code.isdigit():
                continue
            rows[zip_code] = (p[2].strip(), p[4], round(float(p[9]) * 100), round(float(p[10]) * 100))

    states = sorted({r[1] for r in rows.values()})
    places = sorted({f'{r[0]}|{r[1]}' for r in rows.values()})
    place_index = {k: i for i, k in enumerate(places)}
    out = []
    prev_zip, prev_lat, prev_lng = 0, 0, 0
    for zip_code in sorted(rows):
        city, state, lat, lng = rows[zip_code]
        z = int(zip_code)
        out.append(
            ','.join(
                [
                    to36(z - prev_zip),
                    to36s(lat - prev_lat),
                    to36s(lng - prev_lng),
                    to36(place_index[f'{city}|{state}']),
                ]
            )
        )
        prev_zip, prev_lat, prev_lng = z, lat, lng

    data = {
        'source': 'GeoNames US postal codes, CC BY 4.0, https://www.geonames.org/',
        'states': states,
        # "City|ST", referred to by index from each row.
        'places': [f"{k.split('|')[0]}|{states.index(k.split('|')[1])}" for k in places],
        # One row per ZIP, sorted: zip delta, lat delta, lng delta (hundredths of a degree), place index. Base 36.
        'rows': ';'.join(out),
    }
    with open('src/data/zips.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(rows)} ZIPs, {len(places)} places')


def to36(n: int) -> str:
    digits = '0123456789abcdefghijklmnopqrstuvwxyz'
    if n == 0:
        return '0'
    s = ''
    while n:
        n, r = divmod(n, 36)
        s = digits[r] + s
    return s


def to36s(n: int) -> str:
    return ('-' + to36(-n)) if n < 0 else to36(n)


if __name__ == '__main__':
    main(sys.argv[1])
