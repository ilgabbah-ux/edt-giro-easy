#!/usr/bin/env python3
"""v109.3 · versione per file: ogni ?v= diventa l'impronta (hash) del file a cui punta.

Così a ogni aggiornamento il telefono riscarica solo i file cambiati (gli altri hanno lo
stesso indirizzo e restano in cache). Da lanciare prima di ogni commit di rilascio:

    python3 tools/versiona.py

Tocca solo i riferimenti locali scritti come  ./nome.js?v=...  o  nome.css?v=...
(quelli con ?v= e basta: three.js, GLTFLoader ecc. non cambiano mai e restano senza).
"""
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = ['index.html', 'game.js', 'scene3d.js', 'audio.js', 'progress.js', 'classifica.js', 'duel.js',
           'icons.js', 'mudfx.js', 'percorsi.js', 'physics.js', 'pilota3d.js', 'piloti.js', 'voci.js',
           'voci-piloti.js', 'style.css', 'sw.js']
REF = re.compile(r"""((?:\./)?([A-Za-z0-9_-]+\.(?:js|css)))\?v=([A-Za-z0-9.]+)""")


def read(name):
    with open(os.path.join(ROOT, name), encoding='utf-8') as f:
        return f.read()


def main():
    text = {n: read(n) for n in SOURCES if os.path.exists(os.path.join(ROOT, n))}
    for _ in range(8):   # le dipendenze sono poche e senza cicli: in 3-4 giri si stabilizza
        digest = {n: hashlib.sha256(t.encode('utf-8')).hexdigest()[:8] for n, t in text.items()}
        changed = False
        for n, t in text.items():
            def sub(m):
                target = m.group(2)
                h = digest.get(target)
                return f"{m.group(1)}?v={h}" if h else m.group(0)
            nt = REF.sub(sub, t)
            if nt != t:
                text[n] = nt; changed = True
        if not changed:
            break
    else:
        sys.exit('versiona: i riferimenti non si stabilizzano (ciclo di import?)')
    for n, t in text.items():
        if t != read(n):
            with open(os.path.join(ROOT, n), 'w', encoding='utf-8') as f:
                f.write(t)
            print('aggiornato', n)
    for m in sorted(set(REF.findall(text['index.html']))):
        print(' ', m[1], '→', m[2])


if __name__ == '__main__':
    main()
