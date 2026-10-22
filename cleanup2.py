import subprocess, os
for f in ['finish.py','log.py','logout.txt','showout.txt','commitout.txt','clean.py','gs.py','gsout.txt','st.py','stout.txt','docommit.py']:
    p='C:/IP/iptv-app/'+f
    if os.path.exists(p): os.remove(p)
subprocess.run('git add -A', shell=True, cwd='C:/IP/iptv-app')
r = subprocess.run('git commit -m "chore: remove temp helper files"', shell=True, cwd='C:/IP/iptv-app', capture_output=True, text=True)
open('C:/IP/iptv-app/c2out.txt','w').write(r.stdout+r.stderr)