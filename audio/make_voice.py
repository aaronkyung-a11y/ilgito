# Cuts the generated shout / horse clips (Higgsfield, model mirelo_text_to_audio, generated 2026-11-14), fades and normalises them,
# encodes them to mono MP3 and writes src/06-voices.js.  Sources: audio/voice/*.mp3 (decoded to raw_*.wav).
# These were chosen by looking at spectrograms only — nobody has listened to them yet.
import os, subprocess, base64, json, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt
D = '/home/claude/ilgito/audio/voice/'; SR = 44100
# name: (source, start, end, fadeOut, kbps)
S = {
 'vp1':   ('p2', 0.24, 0.66, 0.08, 48),      # hero: a short shout with clear vowel formants
 'vp2':   ('p1', 0.36, 0.78, 0.12, 48),      # hero: a shorter, breathier burst
 've1':   ('e1', 0.24, 0.98, 0.3, 48),       # enemy: a low roar
 've2':   ('e2', 0.26, 0.74, 0.14, 48),      # enemy: a shout (quiet at source, so its noise floor comes up)
 'veD1':  ('eD', 0.14, 1.5, 0.55, 48),       # enemy: a long cry as he falls
 'neigh': ('neigh', 0.0, 0.88, 0.14, 56),    # a horse's whinny (first of two in the clip)
}
meta = {}; b64 = {}; total = 0
for name, (src, st, en, fo, kbps) in S.items():
    subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', D + src + '.mp3', '-ac', '1', '-ar', str(SR), D + 'raw_' + src + '.wav'], check=True)
    sr, x = wavfile.read(D + 'raw_' + src + '.wav'); assert sr == SR
    y = x.astype(np.float64)[int(st * SR):int(en * SR)] / 32768.0
    y = sosfiltfilt(butter(2, 80, 'hp', fs=SR, output='sos'), y)
    n = len(y); fi = int(0.004 * SR); y[:fi] *= np.linspace(0, 1, fi)
    f = int(fo * SR); y[n - f:] *= np.linspace(1, 0, f) ** 1.6
    y *= 0.89 / np.abs(y).max()
    wav = D + name + '.wav'; mp3 = D + name + '.cut.mp3'
    wavfile.write(wav, SR, (y * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', '-ac', '1', '-ar', str(SR), mp3], check=True)
    data = open(mp3, 'rb').read(); total += len(data)
    b64[name] = base64.b64encode(data).decode(); meta[name] = round(n / SR, 3)
    print(f"{name:6s} {n/SR:5.2f}s {len(data)/1024:5.1f}KB rms={np.sqrt(np.mean(y**2)):.3f}")
print('total mp3 KB', round(total / 1024, 1), 'base64 KB', round(total * 4 / 3 / 1024, 1))
with open('/home/claude/ilgito/src/06-voices.js', 'w') as f:
    f.write('// ───────────────────────── shouts and a horse ─────────────────────────\n')
    f.write('// Generated sound effects (Higgsfield, model mirelo_text_to_audio, 2026-11-14), cut and encoded by audio/make_voice.py.\n')
    f.write('// vp* = the hero, ve* = the enemy general (D = as he falls). Chosen from spectrograms; not yet checked by ear.\n')
    f.write('Object.assign(SAMPLE_LEN, ' + json.dumps(meta) + ');\n')
    f.write('Object.assign(SAMPLE_B64, {\n' + ''.join(f"  {k}: '{v}',\n" for k, v in b64.items()) + '});\n')
