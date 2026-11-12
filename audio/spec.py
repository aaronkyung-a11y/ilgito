# usage: python3 audio/spec.py out.png file1.wav file2.wav ...   (waveform + log-frequency spectrogram per file)
import sys, numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.io import wavfile
from scipy.signal import spectrogram
out=sys.argv[1]; files=sys.argv[2:]
maxdur=float(__import__('os').environ.get('MAXDUR','3'))
n=len(files); cols=min(5,n); rows=(n+cols-1)//cols
fig,axes=plt.subplots(rows*2,cols,figsize=(cols*3.2,rows*3.0),squeeze=False)
for i,f in enumerate(files):
    sr,x=wavfile.read(f)
    if x.ndim>1: x=x.mean(axis=1)
    x=x.astype(np.float64); x/= (32768.0 if np.abs(x).max()>1.5 else 1.0)
    x=x[:int(sr*maxdur)]
    r,c=(i//cols)*2,i%cols
    t=np.arange(len(x))/sr
    axes[r][c].plot(t,x,lw=0.4,color='k'); axes[r][c].set_ylim(-1,1); axes[r][c].set_xlim(0,maxdur); axes[r][c].set_title(f.split('/')[-1][:-4][:30],fontsize=7); axes[r][c].tick_params(labelsize=5)
    fq,tt,S=spectrogram(x,sr,nperseg=1024,noverlap=768)
    S=10*np.log10(S+1e-12); S-=S.max()
    axes[r+1][c].pcolormesh(tt,fq,S,vmin=-80,vmax=0,cmap='magma',shading='auto'); axes[r+1][c].set_yscale('symlog',linthresh=200); axes[r+1][c].set_ylim(40,18000); axes[r+1][c].set_xlim(0,maxdur); axes[r+1][c].tick_params(labelsize=5)
    axes[r+1][c].set_yticks([100,300,1000,3000,10000]); axes[r+1][c].set_yticklabels(['100','300','1k','3k','10k'])
for j in range(n, rows*cols):
    axes[(j//cols)*2][j%cols].axis('off'); axes[(j//cols)*2+1][j%cols].axis('off')
plt.tight_layout(); plt.savefig(out,dpi=110); print('saved',out)
