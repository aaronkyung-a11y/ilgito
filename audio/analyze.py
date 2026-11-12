import sys, glob, os, numpy as np
from scipy.io import wavfile
rows=[]
for f in sorted(glob.glob('/home/claude/ilgito/audio/mono/*.wav')):
    sr, x = wavfile.read(f); x = x.astype(np.float64)/32768.0
    n=len(x); dur=n/sr; peak=np.max(np.abs(x)) if n else 0
    # onset: first sample above 5% of peak
    thr=0.05*peak; on=np.argmax(np.abs(x)>thr)/sr if peak>0 else 0
    # effective length: last sample above 1% of peak (-40dB)
    idx=np.where(np.abs(x)>0.01*peak)[0]; end=idx[-1]/sr if len(idx) else 0
    # -20dB decay time from peak
    env=np.abs(x); pk=np.argmax(env)
    w=int(sr*0.02); sm=np.convolve(env, np.ones(w)/w, mode='same')
    after=sm[pk:]; below=np.where(after < 0.1*sm[pk:pk+w*2].max())[0]; t20=below[0]/sr if len(below) else dur
    # spectral centroid over first 0.4 s after onset
    s=int(on*sr); seg=x[s:s+int(0.4*sr)]
    if len(seg)>256:
        sp=np.abs(np.fft.rfft(seg*np.hanning(len(seg)))); fr=np.fft.rfftfreq(len(seg),1/sr)
        cen=(sp*fr).sum()/max(1e-9,sp.sum()); lo=sp[fr<200].sum()/sp.sum(); hi=sp[fr>3000].sum()/sp.sum()
        domf=fr[np.argmax(sp)]
    else: cen=lo=hi=domf=0
    rows.append((os.path.basename(f)[:-4], dur, on, end, t20, peak, cen, domf, lo, hi))
print(f"{'name':38s} {'dur':>5s} {'onset':>5s} {'end40':>5s} {'t-20':>5s} {'peak':>5s} {'centroid':>8s} {'domHz':>6s} {'<200':>5s} {'>3k':>5s}")
for r in rows: print(f"{r[0]:38s} {r[1]:5.2f} {r[2]:5.2f} {r[3]:5.2f} {r[4]:5.2f} {r[5]:5.2f} {r[6]:8.0f} {r[7]:6.0f} {r[8]:5.2f} {r[9]:5.2f}")
