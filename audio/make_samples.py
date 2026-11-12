# Cuts, fades, filters and normalises the chosen VCSL (CC0) recordings, encodes them to mono MP3 and writes src/05-samples.js
import os, subprocess, base64, json, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt
M = '/home/claude/ilgito/audio/mono/'; OUT = '/home/claude/ilgito/audio/cut/'; os.makedirs(OUT, exist_ok=True)
SR = 44100
# name: (source, start, dur, fadeOut, kbps, opts)
S = {
 # metal
 'anv1':  ('Anvil_Hit1_v3_rr1_Mid', 0.0, 0.85, 0.25, 80, {}),
 'anv2':  ('Anvil_Hit2_v3_rr1_Mid', 0.0, 0.66, 0.2, 80, {}),
 'anv3':  ('Anvil_Hit3_v3_rr1_Mid', 0.0, 0.46, 0.15, 80, {}),
 'brk1':  ('BrakeDrum1_Hammer_v3_rr1_Mid', 0.0, 0.52, 0.15, 80, {}),
 'brk2':  ('BrakeDrum2_Hammer3_v3_rr1_Mid', 0.0, 0.46, 0.15, 80, {}),
 'bell':  ('susCymb1_hit_bell_fff1', 0.0, 1.5, 0.6, 80, {}),
 'crash': ('cymbal_crash1_short1', 0.0, 0.9, 0.25, 80, {}),
 'bigcrash': ('cymbal_crash2_fff1', 0.0, 2.3, 0.9, 80, {}),
 'scrape': ('susCymb2_scrape_2', 0.0, 0.9, 0.35, 80, {'hp': 1200}),
 'crack': ('slapstick_rr1', 0.0, 0.22, 0.06, 80, {}),
 'jingle': ('Sleighbells_Hit_rr1_Mid', 0.0, 0.7, 0.3, 64, {'hp': 1500}),
 # drums
 'boom':  ('BDrumNew_hit_v7_rr1_Sum', 0.0, 1.4, 0.5, 56, {}),
 'sub':   ('bassdrum_hit_ff', 0.0, 1.5, 0.6, 32, {'lp': 500}),
 'timp':  ('Timpani1_Hit_v4_rr1_Sum', 0.0, 1.7, 0.6, 56, {}),
 'tomL':  ('TomL_HitM_v4_rr1_Mid', 0.0, 0.85, 0.3, 56, {}),
 'tomH':  ('TomH_HitM_v4_rr1_Mid', 0.0, 0.75, 0.3, 56, {}),
 'frame': ('HDrumL_Hit_v3_rr1_Sum', 0.0, 0.9, 0.35, 56, {}),
 'thud':  ('HDrumL_HitMuted_v3_rr1_Sum', 0.0, 0.4, 0.12, 48, {}),
 'thud2': ('HDrumS_HitMuted_v3_rr1_Sum', 0.0, 0.42, 0.12, 48, {}),
 'log':   ('LogDrumLo_MedM_v3_rr1_Sum', 0.0, 0.46, 0.12, 48, {}),
 'cajon': ('Cajon_hit1_fff_rr1', 0.0, 0.24, 0.07, 64, {}),
 'rim':   ('TomL_rimS_v4_rr1_Mid', 0.0, 0.3, 0.1, 56, {}),
 'wood':  ('wood_click_ff', 0.0, 0.25, 0.08, 56, {}),
 'roll':  ('Timpani1_Roll_v5_rr1_Sum', 2.0, 2.6, 0.0, 48, {'loop': 0.35}),
 'swell': ('susCymb1_cresc_1.5s', 0.12, 1.16, 0.05, 80, {'fin': 0.05}),
 # gongs
 'gong':  ('gong_fff', 0.02, 3.6, 1.4, 56, {}),
 'gonglow': ('gong_f', 0.03, 3.4, 1.4, 48, {}),
 # dan tranh (zither)
 'zB2':   ('B2_ff_1', 0.0, 1.9, 0.6, 64, {}),
 'zFs3':  ('Fs3_ff_1', 0.0, 1.7, 0.5, 64, {}),
 'zCs4':  ('Cs4_ff_1', 0.0, 1.5, 0.5, 64, {}),
 'gliss': ('Gliss_Up_Med_ff_1', 0.28, 2.7, 0.9, 64, {'fin': 0.03}),
 # didgeridoo: horn-like call and drone
 'horn':  ('Didgeridoo1_BarkDown2_Main', 0.0, 2.1, 0.12, 48, {'lp': 3500, 'hp': 60}),
 'drone': ('Didgeridoo1_Sus2_Main', 3.0, 3.0, 0.0, 48, {'loop': 0.5, 'lp': 1800, 'hp': 45}),
}
def load(name):
    sr, x = wavfile.read(M + name + '.wav'); assert sr == SR
    return x.astype(np.float64) / 32768.0
def onset(x):
    pk = np.abs(x).max(); return int(np.argmax(np.abs(x) > 0.02 * pk))
meta = {}; b64 = {}; total = 0
for name, (src, st, dur, fo, kbps, o) in S.items():
    x = load(src)
    s0 = onset(x) if st == 0.0 else int(st * SR)
    s0 = max(0, s0 - 64)                      # keep the transient, drop leading silence
    y = x[s0:s0 + int(dur * SR)].copy()
    if 'hp' in o: y = sosfiltfilt(butter(2, o['hp'], 'hp', fs=SR, output='sos'), y)
    if 'lp' in o: y = sosfiltfilt(butter(4, o['lp'], 'lp', fs=SR, output='sos'), y)
    n = len(y)
    if 'loop' in o:                           # make it loop seamlessly: crossfade the tail into the head
        c = int(o['loop'] * SR); t = np.linspace(0, np.pi / 2, c)
        head = y[:c] * np.sin(t) + y[n - c:] * np.cos(t)
        y = np.concatenate([head, y[c:n - c]]); n = len(y)
    else:
        fi = int(o.get('fin', 0.002) * SR); y[:fi] *= np.linspace(0, 1, fi)
        f = int(fo * SR)
        if f > 0: y[n - f:] *= np.linspace(1, 0, f) ** 1.6
    y *= 0.89 / np.abs(y).max()
    wav = OUT + name + '.wav'; mp3 = OUT + name + '.mp3'
    wavfile.write(wav, SR, (y * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', '-ac', '1', '-ar', str(SR), mp3], check=True)
    data = open(mp3, 'rb').read(); total += len(data)
    b64[name] = base64.b64encode(data).decode()
    rms = float(np.sqrt(np.mean(y ** 2)))
    meta[name] = {'dur': round(n / SR, 3), 'kb': round(len(data) / 1024, 1), 'rms': round(rms, 3), 'loop': 'loop' in o}
    print(f"{name:9s} {n/SR:5.2f}s {len(data)/1024:6.1f}KB rms={rms:.3f} {'loop' if 'loop' in o else ''}")
print('total mp3 KB', round(total / 1024, 1), 'base64 KB', round(total * 4 / 3 / 1024, 1))
with open('/home/claude/ilgito/src/05-samples.js', 'w') as f:
    f.write('// ───────────────────────── recorded samples ─────────────────────────\n')
    f.write('// Real instrument recordings from the Versilian Community Sample Library (VCSL, CC0 / public domain,\n')
    f.write('// https://github.com/sgossner/VCSL), cut and encoded to mono MP3 by audio/make_samples.py.\n')
    f.write('const SAMPLE_LEN = ' + json.dumps({k: v['dur'] for k, v in meta.items()}) + ';\n')
    f.write('const SAMPLE_B64 = {\n')
    for k, v in b64.items(): f.write(f"  {k}: '{v}',\n")
    f.write('};\n')
json.dump(meta, open(OUT + 'meta.json', 'w'), indent=1)
