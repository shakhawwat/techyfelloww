"""Package already-built applications without copying environment credentials."""
from pathlib import Path
import json
import shutil
import zipfile
import hashlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'cpanel-upload'
OUT.mkdir(exist_ok=True)

def ignored(directory, names):
    return [name for name in names if name == '.env' or
            name.startswith('.env.') or name in {'.git', '.cache', 'cache'}]

def copy(source, target):
    shutil.copytree(source, target, dirs_exist_ok=True, ignore=ignored)

backend = OUT / 'backend'
frontend = OUT / 'frontend'
if backend.exists() or frontend.exists():
    raise SystemExit('Use a fresh cpanel-upload directory to avoid stale files.')
backend.mkdir()
copy(ROOT / 'backend/dist', backend / 'dist')
# Copy installed dependencies for a no-Terminal upload. cPanel can reinstall
# them using Run NPM Install if its native runtime differs from this machine.
copy(ROOT / 'backend/node_modules', backend / 'node_modules')
for name in ['package.json', 'package-lock.json']:
    shutil.copy2(ROOT / 'backend' / name, backend / name)
package = json.loads((backend / 'package.json').read_text())
package['scripts'] = {
    'start': 'node app.js',
    'db:indexes': 'node dist/content/create-indexes.js',
    'auth:bootstrap': 'node dist/auth/bootstrap-admin.js',
    'worker:email': 'node dist/notifications/worker.js',
    'media:reconcile': 'node dist/media/reconcile.js',
}
(backend / 'package.json').write_text(json.dumps(package, indent=2) + '\n')
(backend / 'app.js').write_text('"use strict";\n// Database setup is explicit through cPanel Run JS Script.\nrequire("./dist/main.js");\n')
copy(ROOT / 'frontend/.next/standalone', frontend)
copy(ROOT / 'frontend/.next/static', frontend / '.next/static')
copy(ROOT / 'frontend/public', frontend / 'public')
# Passenger receives a short CommonJS startup file. Avoid inheriting the
# hosting machine's HOSTNAME as the frontend's bind address.
(frontend / 'app.js').write_text('"use strict";\nprocess.env.HOSTNAME = "0.0.0.0";\nrequire("./server.js");\n')
manifest = json.loads((frontend / '.next/routes-manifest.json').read_text())
if 'https://api.techyfellow.com/api/v1/:path*' not in json.dumps(manifest):
    raise SystemExit('Frontend was not built with the production API rewrite.')
for folder in [backend, frontend]:
    archive = OUT / (folder.name + '.zip')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as output:
        for path in sorted(folder.rglob('*')):
            if path.is_file():
                output.write(path, path.relative_to(folder))
    print(f'{archive.name}: {archive.stat().st_size:,} bytes')
with (OUT / 'SHA256SUMS.txt').open('w') as output:
    for name in ['backend.zip', 'frontend.zip']:
        output.write(hashlib.sha256((OUT / name).read_bytes()).hexdigest() + '  ' + name + '\n')
