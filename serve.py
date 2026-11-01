#!/usr/bin/env python3
"""Small local preview server for the SIZER web edition.

It adds the MIME types the app needs (notably .wasm) and disables caching for
the app shell, so editing a file and refreshing always shows the change.

Usage:
    python3 serve.py                  # http://127.0.0.1:4173/
    python3 serve.py --port 8080
    python3 serve.py --host 0.0.0.0   # open it from a phone on the same Wi-Fi

Python 3.7+ only, no third-party packages.
"""

import argparse
import functools
import http.server
import os
import socket
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PORT = 4173


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map)
    extensions_map.update({
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".webmanifest": "application/manifest+json; charset=utf-8",
        ".wasm": "application/wasm",
        ".onnx": "application/octet-stream",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".ico": "image/x-icon",
    })

    def end_headers(self):
        path = self.path.split("?", 1)[0].lower()
        if path.endswith((".onnx", ".wasm")):
            # The model and runtime are large; let the browser keep them.
            self.send_header("Cache-Control", "public, max-age=86400")
        else:
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Keep the terminal readable; uncomment the next line for access logs.
        # super().log_message(fmt, *args)
        pass


def local_ip():
    """Best-effort LAN address for the phone-on-the-same-Wi-Fi message."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
        sock.close()
        return ip
    except OSError:
        return None


def main():
    parser = argparse.ArgumentParser(description="Serve the SIZER web edition locally.")
    parser.add_argument("--host", default="127.0.0.1",
                        help="address to bind (use 0.0.0.0 to test from a phone)")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT,
                        help="port to use, or the first port to try")
    args = parser.parse_args()

    if not os.path.isfile(os.path.join(ROOT, "index.html")):
        print("ERROR: index.html was not found next to serve.py.")
        print("Keep serve.py inside the website folder.")
        return 1

    handler = functools.partial(Handler, directory=ROOT)
    server = None
    port = args.port
    for candidate in range(args.port, args.port + 20):
        try:
            server = http.server.ThreadingHTTPServer((args.host, candidate), handler)
            port = candidate
            break
        except OSError:
            continue

    if server is None:
        print("ERROR: could not find a free port in %d-%d." % (args.port, args.port + 19))
        return 1

    if port != args.port:
        print("Port %d was busy, using %d instead." % (args.port, port))

    shown_host = "127.0.0.1" if args.host in ("0.0.0.0", "::") else args.host
    print("")
    print("  SIZER web edition is running at:")
    print("    http://%s:%d/" % (shown_host, port))
    if args.host in ("0.0.0.0", "::"):
        ip = local_ip()
        if ip:
            print("  On your phone (same Wi-Fi):")
            print("    http://%s:%d/" % (ip, port))
    print("")
    print("  Press Ctrl+C to stop.")
    print("")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
