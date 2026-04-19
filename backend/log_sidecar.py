#!/usr/bin/env python3
"""Tiny CORS-enabled tail server for `backend.out`.

Runs on its own port (default 8001) so the frontend can poll for recent
backend-log output without touching the Jac server. Intentionally separate
from main.jac so the Jac code stays untouched.

Endpoints:
  GET /tail                  -> last 200 lines of backend.out (text/plain)
  GET /tail?lines=500        -> last N lines (max 2000)
  GET /tail?after=<offset>   -> only bytes written after `offset` (for polling)
  GET /health                -> "ok"

Usage:
  python3 log_sidecar.py [port] [log_path]
"""
from __future__ import annotations

import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_LOG = os.path.join(HERE, "backend.out")
MAX_LINES = 2000


class LogHandler(BaseHTTPRequestHandler):
    log_path: str = DEFAULT_LOG

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")

    def do_OPTIONS(self):  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):  # noqa: N802
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)

        if parsed.path == "/health":
            self._send_text("ok\n")
            return

        if parsed.path != "/tail":
            self.send_response(404)
            self._cors()
            self.end_headers()
            return

        lines = min(int(qs.get("lines", ["200"])[0] or "200"), MAX_LINES)
        after = int(qs.get("after", ["0"])[0] or "0")

        if not os.path.exists(self.log_path):
            self._send_text("", extra={"X-Log-Size": "0"})
            return

        size = os.path.getsize(self.log_path)

        if after and after <= size:
            with open(self.log_path, "rb") as f:
                f.seek(after)
                data = f.read().decode("utf-8", errors="replace")
            self._send_text(data, extra={"X-Log-Size": str(size)})
            return

        with open(self.log_path, "rb") as f:
            # Read a window from the end sized to ~128 bytes/line to avoid
            # loading large log files.
            window = min(size, lines * 160)
            f.seek(max(0, size - window))
            data = f.read().decode("utf-8", errors="replace")
        tail = "\n".join(data.splitlines()[-lines:])
        self._send_text(tail + ("\n" if tail else ""), extra={"X-Log-Size": str(size)})

    def _send_text(self, body: str, *, extra: dict | None = None) -> None:
        payload = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        if extra:
            for k, v in extra.items():
                self.send_header(k, v)
        self._cors()
        self.end_headers()
        self.wfile.write(payload)

    # Quieter access logs — the server spams otherwise.
    def log_message(self, fmt, *args):  # noqa: A003
        return


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    log_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_LOG
    LogHandler.log_path = log_path
    server = ThreadingHTTPServer(("0.0.0.0", port), LogHandler)
    print(f"log sidecar: http://localhost:{port}/tail  (file: {log_path})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
