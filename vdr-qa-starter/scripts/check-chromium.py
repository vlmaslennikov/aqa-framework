#!/usr/bin/env python3
"""Verify a supplied Playwright Chromium binary with a real browser session.

Standalone diagnostic: Python 3.10+ and `pip install playwright` (does not download a browser).
Never tests product credentials. Live navigation is opt-in using --url.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from datetime import datetime, timezone
from pathlib import Path


def locate(root: Path) -> Path:
    # Prefer the normal full-browser binary over the headless-shell build.
    for candidate in sorted(root.glob('**/chromium-*/chrome-linux64/chrome')):
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f'Chromium executable not found beneath {root}')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--executable', type=Path, help='absolute path to extracted chrome')
    group.add_argument('--browser-root', type=Path, help='directory containing pw-browsers')
    parser.add_argument('--url', help='optional live URL (read-only navigation)')
    parser.add_argument('--timeout-ms', type=int, default=12000)
    parser.add_argument('--screenshot', type=Path, default=Path('reports/browser/local-smoke.png'))
    parser.add_argument('--report', type=Path, default=Path('reports/browser/diagnostic.json'))
    args = parser.parse_args()
    chrome = args.executable if args.executable else locate(args.browser_root)
    report = {
        'timestamp_utc': datetime.now(timezone.utc).isoformat(),
        'browser_executable': str(chrome.resolve()),
        'local_browser_status': 'NOT_RUN',
        'remote_vdr_status': 'NOT_REQUESTED',
    }
    if not chrome.is_file() or not chrome.stat().st_mode & 0o111:
        print(f'ERROR: executable missing or not executable: {chrome}', file=sys.stderr)
        return 1
    version = subprocess.run([str(chrome), '--version'], capture_output=True, text=True, timeout=10)
    report['chrome_version'] = version.stdout.strip() or version.stderr.strip()
    report['version_command_exit_code'] = version.returncode
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.screenshot.parent.mkdir(parents=True, exist_ok=True)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        report['local_browser_status'] = 'BLOCKED_PYTHON_PLAYWRIGHT_NOT_INSTALLED'
        args.report.write_text(json.dumps(report, indent=2) + '\n')
        print('Install the Python client: python -m pip install playwright', file=sys.stderr)
        return 1
    exit_code = 0
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path=str(chrome),
                headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            )
            report['playwright_browser_version'] = browser.version
            page = browser.new_page(viewport={'width': 1024, 'height': 640})
            page.goto('data:text/html,<title>Chromium QA Smoke</title><button id="b" onclick="this.textContent=\'clicked\'">ready</button>')
            assert page.title() == 'Chromium QA Smoke', 'title assertion failed'
            assert page.locator('#b').inner_text() == 'ready', 'DOM assertion failed'
            page.locator('#b').click()
            assert page.locator('#b').inner_text() == 'clicked', 'interaction assertion failed'
            page.screenshot(path=str(args.screenshot))
            report['local_browser_status'] = 'PASS'
            report['local_assertions'] = ['data page navigation', 'DOM', 'click interaction', 'screenshot']
            # A data: page can pass even if this sandbox forbids Chrome network sockets.
            # Verify the browser can really navigate to an HTTP server on loopback.
            class Handler(BaseHTTPRequestHandler):
                def do_GET(self):
                    payload = b'<title>Loopback QA</title><h1 id="local">HTTP PASS</h1>'
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html')
                    self.send_header('Content-Length', str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)

                def log_message(self, *args):
                    pass

            server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
            try:
                Thread(target=server.serve_forever, daemon=True).start()
                response = page.goto(f'http://127.0.0.1:{server.server_port}/', timeout=5000)
                assert response is not None and response.status == 200
                assert page.locator('#local').inner_text() == 'HTTP PASS'
                report['localhost_http_status'] = 'PASS'
                report['local_assertions'].append('local HTTP socket and navigation')
            finally:
                server.shutdown()
                server.server_close()
            if args.url:
                try:
                    response = page.goto(args.url, wait_until='domcontentloaded', timeout=args.timeout_ms)
                    report['remote_vdr_status'] = 'PASS_HTTP_RESPONSE'
                    report['remote_http_status'] = response.status if response else None
                    report['remote_page_title'] = page.title()
                except Exception as exc:
                    report['remote_vdr_status'] = 'BLOCKED_OR_UNREACHABLE'
                    report['remote_error_type'] = type(exc).__name__
                    report['remote_error_summary'] = str(exc).split('Call log:')[0][:300].strip()
                    exit_code = 2
            browser.close()
    except Exception as exc:
        report['local_browser_status'] = 'FAIL'
        report['local_error_type'] = type(exc).__name__
        report['local_error_summary'] = str(exc).split('Call log:')[0][:300].strip()
        exit_code = 1
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: report[k] for k in ('chrome_version','local_browser_status','remote_vdr_status')}, indent=2))
    print(f'Report: {args.report}; local smoke screenshot: {args.screenshot}')
    return exit_code


if __name__ == '__main__':
    sys.exit(main())
