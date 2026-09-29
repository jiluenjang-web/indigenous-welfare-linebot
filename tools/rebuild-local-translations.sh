#!/bin/zsh
set -euo pipefail

script_dir="${0:A:h}"
project_dir="${script_dir:h}"

cd "$project_dir"
node tools/extract-ui-text.mjs tools/ui-strings.json
.venv/bin/python tools/build-local-translations.py --build --batch-size 2

echo "完成。本機網站重新整理後即可使用新的阿美語與泰雅語初譯。"
