# -*- coding: utf-8 -*-
"""개발용 웹서버.

  python scripts/serve.py

기본 http.server 는 브라우저가 파일을 캐시해버려서
고친 내용이 화면에 안 나타나는 일이 반복된다.
이 서버는 캐시를 아예 못 하게 막는다. 새로고침만 하면 항상 최신이 뜬다.
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class NoCacheHandler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # 요청 로그는 조용히 (오류만 보이게)
        code = args[1] if len(args) > 1 else ""
        if str(code).startswith(("4", "5")):
            sys.stderr.write("%s %s\n" % (self.path, code))


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), NoCacheHandler)
    print("서버 시작 — 캐시 없음")
    print("  PC   http://localhost:%d/web/index.html" % PORT)
    print("  폰   http://192.168.0.105:%d/web/index.html" % PORT)
    srv.serve_forever()
