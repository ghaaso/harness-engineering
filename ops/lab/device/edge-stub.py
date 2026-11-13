"""Zero-dependency stand-in for the dead production edge (FixFlow device lab, phase L3a).

    python edge-stub.py <mode> [port]

Modes (every request, any method, any path):
  edge404  HTTP 404, header `x-railway-fallback: true`, a short text/plain body, and NO
           `X-FixFlow-Api` header: what the production host answers today (O-03 line 3). The
           exact body text production returns is not recorded in the program; the app's
           classifier keys only on the status and a JSON "detail", so any short non-JSON body
           exercises the same path.
  5xx      HTTP 503 (override with FF_STUB_STATUS), same headers and a short text body.
  hang     accept the connection, send nothing for FF_STUB_HANG_S seconds (20), close.

Every request is logged to stdout as one line `STUB <iso-time> <mode> <method> <path>` so the
protocol scripts can show what the app attempted while the stub answered. Request bodies are
not logged (they carry coordinates).
"""

import datetime
import os
import socket
import socketserver
import sys
import time

MODE = sys.argv[1] if len(sys.argv) > 1 else "edge404"
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
STATUS = int(os.environ.get("FF_STUB_STATUS", "503"))
HANG_S = float(os.environ.get("FF_STUB_HANG_S", "20"))
REASONS = {404: "Not Found", 500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout"}

if MODE not in ("edge404", "5xx", "hang"):
    sys.exit(f"unknown mode {MODE}")


def now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds")


def read_head(sock: socket.socket) -> bytes:
    """Read until the end of the request headers (or 64 KiB, or 5 s of silence)."""
    sock.settimeout(5)
    data = b""
    try:
        while b"\r\n\r\n" not in data and len(data) < 65536:
            chunk = sock.recv(4096)
            if not chunk:
                break
            data += chunk
    except OSError:
        pass
    return data


def drain_body(sock: socket.socket, head: bytes) -> None:
    """Consume a Content-Length body so the client does not see a reset mid-upload."""
    hdr, _, rest = head.partition(b"\r\n\r\n")
    length = 0
    for line in hdr.split(b"\r\n")[1:]:
        k, _, v = line.partition(b":")
        if k.strip().lower() == b"content-length":
            try:
                length = int(v.strip())
            except ValueError:
                length = 0
    remaining = length - len(rest)
    sock.settimeout(5)
    try:
        while remaining > 0:
            chunk = sock.recv(min(65536, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
    except OSError:
        pass


class Handler(socketserver.BaseRequestHandler):
    def handle(self) -> None:
        sock: socket.socket = self.request
        if MODE == "hang":
            # Accept, send nothing, close: no read either, so nothing the client sends matters.
            print(f"STUB {now()} hang ACCEPT {self.client_address[0]}", flush=True)
            time.sleep(HANG_S)
            print(f"STUB {now()} hang CLOSE {self.client_address[0]}", flush=True)
            return
        head = read_head(sock)
        if not head:
            return
        first = head.split(b"\r\n", 1)[0].decode("latin-1", "replace")
        parts = first.split(" ")
        method, path = (parts[0], parts[1]) if len(parts) >= 2 else ("?", "?")
        drain_body(sock, head)
        status = 404 if MODE == "edge404" else STATUS
        body = b"Not Found\n" if status == 404 else f"{REASONS.get(status, 'Error')}\n".encode()
        resp = (
            f"HTTP/1.1 {status} {REASONS.get(status, 'Error')}\r\n"
            "content-type: text/plain; charset=utf-8\r\n"
            "x-railway-fallback: true\r\n"
            f"content-length: {len(body)}\r\n"
            "connection: close\r\n\r\n"
        ).encode() + body
        print(f"STUB {now()} {MODE} {status} {method} {path}", flush=True)
        try:
            sock.sendall(resp)
        except OSError:
            pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    print(f"STUB {now()} listening mode={MODE} port={PORT}", flush=True)
    with Server(("0.0.0.0", PORT), Handler) as srv:
        srv.serve_forever()
