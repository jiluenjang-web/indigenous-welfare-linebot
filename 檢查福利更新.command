#!/bin/zsh
set -e
SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR"
node tools/check-welfare-updates.mjs
echo
echo "檢查完成。請開啟 dist/admin.html 查看待審核異動。"
read "?按 Enter 關閉..."
