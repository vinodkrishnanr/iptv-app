import subprocess
r = subprocess.run('git config user.name', shell=True, cwd='C:/IP/iptv-app', capture_output=True, text=True)
print("name:", repr(r.stdout), r.stderr)
r2 = subprocess.run('git config user.email', shell=True, cwd='C:/IP/iptv-app', capture_output=True, text=True)
print("email:", repr(r2.stdout), r2.stderr)