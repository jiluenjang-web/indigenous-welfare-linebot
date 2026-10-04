#!/bin/zsh
set -e

cd "$(dirname "$0")"
node tools/build-welfare-data.mjs

echo ""
echo "福利資料已更新到前台。"
echo "可以重新整理 dist/index.html 查看結果。"
echo ""
read "reply?按 Enter 關閉視窗。"
