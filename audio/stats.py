# loudness / band balance / tonality of rendered cues
import sys, glob, os, numpy as np
from scipy.io import wavfile
def db(x): return 20*np.log10(max(x,1e-9))
print(f"{'cue':10s} {'dur':>5s} {'peak':>6s} {'rms':>6s} {'loud1s':>7s} {'<150':>5s} {'150-300':>7s} {'300-6k':>7s} {'>6k':>5s} {'centr':>6s} {'tonal':>5s}")
for f in sorted(glob.glob(sys.argv[1] if len(sys.argv)>1 else '/home/claude/ilgito/audio/render/*.wav')):
    sr,x=wavfile.read(f); x=x.astype(np.float64)/32768.0
    m=x.mean(axis=1) if x.ndim>1 else x
    peak=np.abs(x).max(); rms=np.sqrt((m**2).mean())
    # loudest 1-second window RMS
    w=sr; cs=np.cumsum(np.concatenate([[0],m**2])); win=(cs[w:]-cs[:-w])/w if len(m)>w else np.array([(m**2).mean()]); l1=np.sqrt(win.max())
    sp=np.abs(np.fft.rfft(m*np.hanning(len(m))))**2; fr=np.fft.rfftfreq(len(m),1/sr); tot=sp.sum()
    b=lambda a,c: sp[(fr>=a)&(fr<c)].sum()/tot
    cen=(sp*fr).sum()/tot
    # tonality: share of energy held by the 3 strongest narrow peaks (pure-tone bleeps score high)
    k=max(1,int(8*len(m)/sr)); sm=np.convolve(sp,np.ones(k),mode='same'); idx=np.argsort(sm)[::-1]; taken=[]; e=0
    for i in idx:
        if all(abs(fr[i]-fr[j])>60 for j in taken):
            taken.append(i); e+=sm[i]
            if len(taken)==3: break
    print(f"{os.path.basename(f)[:-4]:10s} {len(m)/sr:5.1f} {db(peak):6.1f} {db(rms):6.1f} {db(l1):7.1f} {b(0,150):5.2f} {b(150,300):7.2f} {b(300,6000):7.2f} {b(6000,22050):5.2f} {cen:6.0f} {e/tot:5.2f}")
