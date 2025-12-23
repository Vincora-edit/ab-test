#!/usr/bin/env python3
"""
Simple HTTP server for AB Test API
Serves static files and handles POST requests to save ab-tests-data.json
"""

import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs

PORT = 9999
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(DIRECTORY, 'ab-tests-data.json')

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

                # Send success response
                response = {
                    'success': True,
                    'message': 'Tests saved successfully',
                    'client_id': client_id,
                    'count': len(data.get('tests', []))
                }

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))

                print(f'✅ Saved {len(data.get("tests", []))} tests for client {client_id}')

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
