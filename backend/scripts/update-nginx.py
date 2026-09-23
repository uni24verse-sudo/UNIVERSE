#!/usr/bin/env python3
import os
import glob
import subprocess

snippet = """    # Dynamic Open Graph Link Previews for Food Dishes & Stalls
    location ~ ^/(d|s)/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

"""

def update_nginx_configs():
    search_dirs = ['/etc/nginx/sites-enabled', '/etc/nginx/sites-available', '/etc/nginx/conf.d']
    processed_files = set()
    updated_count = 0

    print("🔍 Scanning Nginx configurations for reverse proxy routes...")
    for d in search_dirs:
        if not os.path.exists(d):
            continue
        for fpath in glob.glob(os.path.join(d, '*')):
            real_path = os.path.realpath(fpath)
            if real_path in processed_files or not os.path.isfile(real_path):
                continue
            processed_files.add(real_path)

            try:
                with open(real_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # If this file proxies to Express backend (/api/ or 5000)
                if 'location /api/' in content or 'proxy_pass http://127.0.0.1:5000' in content:
                    print(f"👉 Found active proxy config: {real_path}")
                    if 'location ~ ^/(d|s)/' in content:
                        print(f"   ℹ️ Already contains dynamic share route: {real_path}")
                    else:
                        # Insert right before location /api/
                        if 'location /api/' in content:
                            new_content = content.replace('location /api/', snippet + '    location /api/', 1)
                            with open(real_path, 'w', encoding='utf-8') as f:
                                f.write(new_content)
                            print(f"   ✅ Successfully injected dynamic share preview into: {real_path}")
                            updated_count += 1
                        else:
                            print(f"   ⚠️ Could not locate 'location /api/' in {real_path}")
            except Exception as err:
                print(f"   ❌ Error reading/updating {real_path}: {err}")

    print(f"\n📊 Summary: Updated {updated_count} Nginx configuration file(s).")

    # Verify and reload
    try:
        print("🔍 Testing Nginx syntax...")
        res = subprocess.run(['nginx', '-t'], capture_output=True, text=True, check=True)
        print("✅ Nginx syntax check passed!")
        print("🔄 Reloading Nginx service...")
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
        print("🚀 Nginx successfully reloaded with live Open Graph preview routes!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Nginx validation or reload failed: {e.stderr if hasattr(e, 'stderr') else e}")
        raise

if __name__ == '__main__':
    update_nginx_configs()
