"""Stand-in dead-man service for the rehearsal: answers 200 to anything on 127.0.0.1:9999 of the
stand-in host and appends one line per request to the log, so the heartbeat's pings can be read
back (runbook 7.2). It is not reachable from outside the stand-in host."""
import http.server
import sys
import time

LOG = sys.argv[1]


class H(http.server.BaseHTTPRequestHandler):
    def _ok(self):
        with open(LOG, "a") as fh:
            fh.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} {self.command} {self.path}\n")
        self.send_response(200)
        self.send_header("Content-Length", "2")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(b"OK")

    do_GET = do_POST = do_HEAD = _ok

    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer(("127.0.0.1", 9999), H).serve_forever()
