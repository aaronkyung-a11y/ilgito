# how each cue would come across on a small phone speaker: band-limit to 250 Hz-7 kHz and measure the loudest 100 ms
import sys, glob, os, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
def db(x): return 20*np.log10(max(x,1e-9))
print(f"{'cue':10s} {'full100':>8s} {'phone100':>9s} {'loss':>6s} {'phoneRMS':>9s}")
for f in sorted(glob.glob('/home/claude/ilgito/audio/render/*.wav')):
    sr,x=wavfile.read(f); m=(x.astype(np.float64)/32768.0).mean(axis=1)
    sos=butter(3,[250,7000],'bandpass',fs=sr,output='sos'); p=sosfilt(sos,m)
    w=int(sr*0.1)
    def loud(y):
        cs=np.cumsum(np.concatenate([[0],y**2])); return np.sqrt(((cs[w:]-cs[:-w])/w).max())
    a,b=loud(m),loud(p)
    print(f"{os.path.basename(f)[:-4]:10s} {db(a):8.1f} {db(b):9.1f} {db(b)-db(a):6.1f} {db(np.sqrt((p**2).mean())):9.1f}")
