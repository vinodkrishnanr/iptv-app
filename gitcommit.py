import subprocess
subprocess.run('git config user.name "vinodkrishnanr"', shell=True, cwd='C:/IP/iptv-app')
subprocess.run('git config user.email "vinodkrishnanr@users.noreply.github.com"', shell=True, cwd='C:/IP/iptv-app')
r = subprocess.run('git add -A', shell=True, cwd='C:/IP/iptv-app', capture_output=True, text=True)
print("add:", r.stdout, r.stderr)
r = subprocess.run('git commit -m "Add settings menu: per-category internal/external player + external app picker"', shell=True, cwd='C:/IP/iptv-app', capture_output=True, text=True)
print("commit:", r.stdout, r.stderr)