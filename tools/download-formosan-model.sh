#!/bin/zsh
set -euo pipefail

model_repo="ILRDF/nllb-600m-formosan-all-finetune-v2"
script_dir="${0:A:h}"
project_dir="${script_dir:h}"
model_dir="${project_dir}/models/nllb-600m-formosan-all-finetune-v2"
base_url="https://huggingface.co/${model_repo}/resolve/main"

mkdir -p "$model_dir"

files=(
  README.md
  added_tokens.json
  config.json
  generation_config.json
  model.safetensors
  sentencepiece.bpe.model
  special_tokens_map.json
  tokenizer.json
  tokenizer_config.json
)

for file in "${files[@]}"; do
  echo "Downloading ${file}"
  curl --fail --location --retry 5 --retry-delay 3 --continue-at - \
    --output "${model_dir}/${file}" \
    "${base_url}/${file}?download=true"
done

echo "Model downloaded to ${model_dir}"
du -sh "$model_dir"
