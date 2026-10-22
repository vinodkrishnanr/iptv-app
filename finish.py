import subprocess, os
for f in ['clean.py','docommit.py','st.py','stout.txt','gitcfg.py']:
    p='C:/IP/iptv-app/'+f
    if os.path.exists(p): os.remove(p)
# stage deletions + real changes
subprocess.run('git add -A', shell=True, cwd='C:/IP/iptv-app')
r = subprocess.run('git commit -m "Add settings menu: per-category internal/external player + external app picker"', shell=True, cwd='C:/IP/iptv-app', capture_output=True, text=True)
open('C:/IP/iptv-app/commitout.txt','w').write(r.stdout+r.stderr)