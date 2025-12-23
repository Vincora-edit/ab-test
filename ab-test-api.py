#!/usr/bin/env python3
"""
Simple HTTP server for AB Test API
Serves static files and handles POST requests to save ab-tests-data.json
Auto-deploys changes to GitHub
"""

import http.server
import socketserver
import json
import os
import subprocess
from urllib.parse import urlparse, parse_qs

PORT = 9999
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(DIRECTORY, 'ab-tests-data.json')

def auto_deploy_to_github(client_id, tests_count):
    """Automatically deploy changes to GitHub"""
    try:
        # Add tests directory
        subprocess.run(['git', 'add', 'tests/'],
                      cwd=DIRECTORY, check=True, capture_output=True)

        # Check if there are changes
        status = subprocess.run(['git', 'status', '--porcelain'],
                              cwd=DIRECTORY, capture_output=True, text=True, check=True)

        if not status.stdout.strip():
            print('ℹ️  No changes to commit')
            return True

        # Commit
        commit_msg = f'Update tests for {client_id} ({tests_count} tests)'
        subprocess.run(['git', 'commit', '-m', commit_msg],
                      cwd=DIRECTORY, check=True, capture_output=True)

        # Push to GitHub
        subprocess.run(['git', 'push'],
                      cwd=DIRECTORY, check=True, capture_output=True)

        print(f'🚀 Auto-deployed to GitHub: {commit_msg}')
        return True

    except subprocess.CalledProcessError as e:
        print(f'⚠️  Git error (continuing): {e}')
        return False
    except Exception as e:
        print(f'⚠️  Deploy error (continuing): {e}')
        return False

class ABTestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/save-tests':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
                client_id = data.get('client_id', 'default')

                # Создаём директорию tests если нет
                tests_dir = os.path.join(DIRECTORY, 'tests')
                os.makedirs(tests_dir, exist_ok=True)

                # Сохраняем в файл для конкретного клиента
                client_file = os.path.join(tests_dir, f'{client_id}.json')

                client_data = {'tests': data.get('tests', [])}

                with open(client_file, 'w', encoding='utf-8') as f:
                    json.dump(client_data, f, indent=2, ensure_ascii=False)

                tests_count = len(data.get('tests', []))
                print(f'✅ Saved {tests_count} tests for client {client_id}')

                # Auto-deploy to GitHub
                deployed = auto_deploy_to_github(client_id, tests_count)

                # Send success response
                response = {
                    'success': True,
                    'message': 'Tests saved successfully',
                    'client_id': client_id,
                    'count': tests_count,
                    'deployed': deployed
                }

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                error_response = {'error': str(e)}
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
                print(f'❌ Error saving tests: {e}')
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    # Set UTF-8 encoding for Windows console
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

    with socketserver.TCPServer(("", PORT), ABTestHandler) as httpd:
        print(f"🚀 AB Test Server running on http://localhost:{PORT}")
        print(f"📊 Admin panel: http://localhost:{PORT}/ab-test-admin.html")
        print(f"📁 Client script: http://localhost:{PORT}/ab-test-client.js")
        print(f"📡 Save API: http://localhost:{PORT}/save-tests")
        print(f"💾 Data file: {DATA_FILE}")
        print("\nPress Ctrl+C to stop")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped")
