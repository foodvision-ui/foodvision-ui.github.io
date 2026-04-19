#!/usr/bin/env python3
"""Static file server for todo_app/ with an embedded /tail endpoint.

Replaces `python3 -m http.server 8080` so the log sidebar can fetch
backend output on the same origin (no extra port forwarding needed).

Endpoints added on top of plain static serving:
  GET /tail                  -> last 200 lines of backend.out
  GET /tail?lines=N          -> last N lines (max 2000)
  GET /tail?after=<offset>   -> bytes written past `offset`
  GET /health                -> "ok"
"""
from __future__ import annotations

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(HERE, "backend", "backend.out")
MAX_LINES = 2000

# Cap overly long lines (dict/param dumps, base64 blobs) so the panel stays readable.
MAX_LINE_CHARS = 240


def _is_structured(line: str) -> bool:
    """Only let through lines that look like real structured events."""
    s = line.strip()
    if not s:
        return False
    # HTTP access log: `  127.0.0.1:12345 - "POST /user/login HTTP/1.1" 200`
    if ' - "' in s and " HTTP/" in s:
        return True
    # Jac function dispatch header (we'll still truncate the payload later).
    if s.startswith("Executing function"):
        return True
    # Known named mutations from the Jac walkers.
    if any(k in s for k in (
        "save_meal", "update_profile", "evolve_profile",
        "get_profile", "analyze_meal", "generate_recipe",
        "register", "login", "logout",
    )) and len(s) < MAX_LINE_CHARS:
        return True
    # Explicit log levels / tracebacks.
    if any(tok in s for tok in (
        "[INFO]", "[WARN]", "[ERROR]",
        "INFO:", "WARN:", "ERROR:", "Traceback", "Exception",
    )):
        return True
    return False


def _filter(text: str) -> str:
    out = []
    for line in text.splitlines():
        if not _is_structured(line):
            continue
        if len(line) > MAX_LINE_CHARS:
            line = line[:MAX_LINE_CHARS].rstrip() + " …"
        out.append(line)
    return ("\n".join(out) + "\n") if out else ""


class Handler(SimpleHTTPRequestHandler):
    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Expose-Headers", "X-Log-Size")

    def do_GET(self):  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._send_text("ok\n")
            return
        if parsed.path == "/tail":
            self._serve_tail(parse_qs(parsed.query))
            return
        return super().do_GET()

    def _serve_tail(self, qs: dict) -> None:
        try:
            lines = min(int((qs.get("lines", ["200"])[0] or "200")), MAX_LINES)
        except ValueError:
            lines = 200
        try:
            after = int((qs.get("after", ["0"])[0] or "0"))
        except ValueError:
            after = 0

        if not os.path.exists(LOG_PATH):
            self._send_text("", extra={"X-Log-Size": "0"})
            return

        size = os.path.getsize(LOG_PATH)
        if after and after <= size:
            with open(LOG_PATH, "rb") as f:
                f.seek(after)
                data = f.read().decode("utf-8", errors="replace")
            self._send_text(_filter(data), extra={"X-Log-Size": str(size)})
            return

        with open(LOG_PATH, "rb") as f:
            # Wider window since most lines are filtered out.
            window = min(size, lines * 400)
            f.seek(max(0, size - window))
            data = f.read().decode("utf-8", errors="replace")
        filtered = _filter(data).splitlines()
        tail = "\n".join(filtered[-lines:])
        self._send_text(tail + ("\n" if tail else ""), extra={"X-Log-Size": str(size)})

    def _send_text(self, body: str, *, extra: dict | None = None) -> None:
        payload = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        if extra:
            for k, v in extra.items():
                self.send_header(k, v)
        self._cors()
        self.end_headers()
        self.wfile.write(payload)

    def end_headers(self):
        # Static responses: also add CORS so cross-origin tests work.
        self._cors()
        super().end_headers()

    def log_message(self, fmt, *args):  # noqa: A003
        # Quiet down default access log spam; keep errors.
        if args and isinstance(args[1], str) and args[1].startswith(("4", "5")):
            super().log_message(fmt, *args)


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    os.chdir(HERE)
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"frontend: http://localhost:{port}/   tail: /tail   log: {LOG_PATH}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()


if __name__ == "__main__":
    main()
