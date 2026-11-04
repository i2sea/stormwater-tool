#!/usr/bin/env bash
# src/ 의 조각을 한 HTML 파일로 묶습니다. (순서가 중요: 뒤 파일이 앞 파일의 함수·상수를 씀)
set -euo pipefail
cd "$(dirname "$0")"
FILES="engine raindata wamisdata sample app wamisup draw mh hwpxtpl export svdb tpl dxfin plan basin net prof"
for f in $FILES; do node --check "src/$f.js"; done
mkdir -p dist
{ cat src/head.html; echo '<script>'; for f in $FILES; do cat "src/$f.js"; done; echo '</script>'; } > "dist/우수수리계산서.html"
# 브라우저에서 바로 여는 단독 파일 (문서 머리말·UTF-8 지정)
{ printf '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'; cat "dist/우수수리계산서.html"; echo '</body></html>'; } > "dist/우수수리계산서_단독.html"
echo "dist/우수수리계산서.html (아티팩트용), dist/우수수리계산서_단독.html (크롬에서 바로 열기)"
