# -*- coding: utf-8 -*-
"""
배포용 폴더(dist)를 만든다.

  python scripts/build-deploy.py

web/index.html 은 ../assets 를 참조하지만, 배포본은 index.html 이 루트에 놓이므로
경로를 ./assets 로 바꿔서 내보낸다.
"""
import io, os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

# ── 초기화 ──────────────────────────────
if os.path.isdir(DIST):
    shutil.rmtree(DIST)
os.makedirs(DIST)

# ── index.html — 경로 치환 ──────────────
src = os.path.join(ROOT, "web", "index.html")
html = io.open(src, encoding="utf-8").read()
html = html.replace("../assets/", "assets/").replace("../content/", "content/")
# manifest 안의 경로도 배포본 기준으로 맞춘다
html = html.replace('href="manifest.webmanifest"', 'href="/manifest.webmanifest"')

with io.open(os.path.join(DIST, "index.html"), "w", encoding="utf-8") as f:
    f.write(html)

# ── 실제로 쓰이는 파일만 복사 ────────────
COPY = [
    # 영상 · 캐릭터
    ("assets/video/main/hero.mp4",            "assets/video/main/hero.mp4"),
    ("assets/video/main/hero-poster.jpg",     "assets/video/main/hero-poster.jpg"),
    ("assets/video/main/quote.mp4",           "assets/video/main/quote.mp4"),
    ("assets/video/main/quote-poster.jpg",    "assets/video/main/quote-poster.jpg"),
    ("assets/character/poses/wizard-orb.jpg", "assets/character/poses/wizard-orb.jpg"),
    # 브랜드 · 아이콘 (홈화면 설치와 카톡 썸네일에 필요)
    ("assets/brand/logo.png",                 "assets/brand/logo.png"),
    ("assets/brand/favicon.ico",              "assets/brand/favicon.ico"),
    ("assets/brand/icon-192.png",             "assets/brand/icon-192.png"),
    ("assets/brand/icon-512.png",             "assets/brand/icon-512.png"),
    ("assets/brand/apple-touch-icon.png",     "assets/brand/apple-touch-icon.png"),
    ("assets/brand/og-image.png",             "assets/brand/og-image.png"),
    # 앱 설치 정보
    ("web/manifest.webmanifest",              "manifest.webmanifest"),
]

missing = []
for rel_src, rel_dst in COPY:
    s = os.path.join(ROOT, rel_src)
    if not os.path.exists(s):
        missing.append(rel_src)
        continue
    dst = os.path.join(DIST, rel_dst)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(s, dst)

# ── manifest 안 아이콘 경로 보정 ────────
mf = os.path.join(DIST, "manifest.webmanifest")
if os.path.exists(mf):
    txt = io.open(mf, encoding="utf-8").read().replace("../assets/", "/assets/")
    txt = txt.replace('"start_url": "./index.html"', '"start_url": "/"')
    txt = txt.replace('"scope": "./"', '"scope": "/"')
    io.open(mf, "w", encoding="utf-8").write(txt)

# ── 매일 생성되는 콘텐츠 ────────────────
content_src = os.path.join(ROOT, "content", "daily")
if os.path.isdir(content_src):
    shutil.copytree(content_src, os.path.join(DIST, "content", "daily"))

# ── 캐시 정책 ───────────────────────────
# 영상·이미지는 오래 캐시하고, HTML 과 오늘치 JSON 은 항상 새로 받게 한다.
headers = """/*
  X-Content-Type-Options: nosniff

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/index.html
  Cache-Control: no-cache

/content/*
  Cache-Control: no-cache
"""
io.open(os.path.join(DIST, "_headers"), "w", encoding="utf-8").write(headers)

# ── 결과 ────────────────────────────────
total = 0
for base, _, files in os.walk(DIST):
    for fn in files:
        total += os.path.getsize(os.path.join(base, fn))

print("배포 폴더 생성 완료")
print("  위치 :", DIST)
print("  용량 : %.2f MB" % (total / 1024 / 1024))
print()
for base, _, files in os.walk(DIST):
    for fn in sorted(files):
        p = os.path.join(base, fn)
        print("   %-46s %6.0f KB" % (
            os.path.relpath(p, DIST).replace("\\", "/"),
            os.path.getsize(p) / 1024))
if missing:
    print("\n  빠진 파일:")
    for m in missing:
        print("   -", m)
