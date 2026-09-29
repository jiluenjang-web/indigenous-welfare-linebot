#!/usr/bin/env python3
"""Run the downloaded Formosan-AI model locally and build dist/translations.js."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer


PROJECT = Path(__file__).resolve().parent.parent
MODEL_DIR = PROJECT / "models" / "nllb-600m-formosan-all-finetune-v2"
SOURCE_FILE = PROJECT / "tools" / "ui-strings.json"
OUTPUT_FILE = PROJECT / "dist" / "translations.js"
TARGETS = {"ami": "ami_Coas", "tay": "tay_Seko"}


def device_name() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def load_runtime():
    if not (MODEL_DIR / "model.safetensors").exists():
        raise SystemExit(f"找不到模型：{MODEL_DIR}")
    device = device_name()
    print(f"載入模型：{MODEL_DIR}")
    print(f"運算裝置：{device}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, local_files_only=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(
        MODEL_DIR,
        local_files_only=True,
        dtype=torch.float32,
    ).to(device)
    model.eval()
    return tokenizer, model, device


def translate_batch(tokenizer, model, device: str, texts: list[str], target: str) -> list[str]:
    tokenizer.src_lang = "zho_Hant"
    tokenizer.tgt_lang = target
    tokens = tokenizer(
        texts,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=256,
    ).to(device)
    with torch.inference_mode():
        generated = model.generate(
            **tokens,
            forced_bos_token_id=tokenizer.convert_tokens_to_ids(target),
            max_length=256,
            num_beams=3,
            no_repeat_ngram_size=4,
            renormalize_logits=True,
        )
    return tokenizer.batch_decode(generated, skip_special_tokens=True)


def build_all(tokenizer, model, device: str, batch_size: int) -> None:
    source = json.loads(SOURCE_FILE.read_text(encoding="utf-8"))
    output: dict[str, object] = {
        "_meta": {
            "status": "ai-draft",
            "source": "ILRDF/nllb-600m-formosan-all-finetune-v2",
            "notice": "AI 初譯，未經族語教師校對，不可作為福利資格核定依據。",
        }
    }
    for language, target in TARGETS.items():
        translated: dict[str, str] = {}
        print(f"開始翻譯 {language}（{target}），共 {len(source)} 句")
        for start in range(0, len(source), batch_size):
            batch = source[start : start + batch_size]
            values = translate_batch(tokenizer, model, device, batch, target)
            translated.update(zip(batch, values))
            print(f"  {min(start + len(batch), len(source))}/{len(source)}", flush=True)
        output[language] = translated
    OUTPUT_FILE.write_text(
        "window.FORMOSAN_TRANSLATIONS = "
        + json.dumps(output, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"已寫入：{OUTPUT_FILE}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", help="只翻譯一段測試文字")
    parser.add_argument("--target", choices=TARGETS, default="ami")
    parser.add_argument("--build", action="store_true", help="產生完整 translations.js")
    parser.add_argument("--batch-size", type=int, default=2)
    args = parser.parse_args()

    tokenizer, model, device = load_runtime()
    if args.text:
        print(translate_batch(tokenizer, model, device, [args.text], TARGETS[args.target])[0])
    if args.build:
        build_all(tokenizer, model, device, max(1, args.batch_size))
    if not args.text and not args.build:
        parser.error("請指定 --text 或 --build")


if __name__ == "__main__":
    main()
