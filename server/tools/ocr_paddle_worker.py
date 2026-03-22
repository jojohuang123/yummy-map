#!/usr/bin/env python3
import base64
import json
import os
import sys
import warnings
from io import BytesIO

os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
warnings.filterwarnings("ignore")


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


try:
    from PIL import Image
    import numpy as np
    from paddleocr import PaddleOCR
except Exception as exc:  # pragma: no cover
    emit(
        {
            "ok": False,
            "type": "boot_error",
            "code": "PADDLE_OCR_DEPENDENCY_MISSING",
            "message": str(exc),
        }
    )
    sys.exit(1)


def decode_image(image_base64):
    image_bytes = base64.b64decode(image_base64)
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    max_side = 2200
    max_pixels = 3_000_000
    width, height = image.size

    if max(width, height) > max_side or width * height > max_pixels:
        scale = min(max_side / max(width, height), (max_pixels / float(width * height)) ** 0.5)
        resized = (
            max(1, int(width * scale)),
            max(1, int(height * scale)),
        )
        image = image.resize(resized, Image.Resampling.LANCZOS)

    return np.array(image)


try:
    OCR = PaddleOCR(
        lang=os.environ.get("PADDLE_OCR_MODEL_LANG", "ch"),
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="PP-OCRv5_mobile_rec",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )
    emit({"ok": True, "type": "ready"})
except Exception as exc:  # pragma: no cover
    emit(
        {
            "ok": False,
            "type": "boot_error",
            "code": "PADDLE_OCR_BOOT_ERROR",
            "message": str(exc),
        }
    )
    sys.exit(1)


def extract_lines(result):
    lines = []
    for block in result or []:
        if not block:
            continue

        if isinstance(block, dict):
            for text in block.get("rec_texts") or []:
                if text:
                    lines.append(str(text).strip())
            continue

        for row in block:
            if not row or len(row) < 2:
                continue
            text_info = row[1]
            if not text_info or not text_info[0]:
                continue
            lines.append(text_info[0].strip())
    return [line for line in lines if line]


for raw_line in sys.stdin:
    raw_line = raw_line.strip()
    if not raw_line:
        continue

    try:
        payload = json.loads(raw_line)
        request_id = payload.get("request_id")
        images = payload.get("images") or []
        merged_lines = []

        for image in images:
            image_base64 = (image.get("base64") or "").strip()
            if not image_base64:
                continue
            array = decode_image(image_base64)
            result = OCR.ocr(array)
            merged_lines.extend(extract_lines(result))

        emit(
            {
                "ok": True,
                "type": "result",
                "request_id": request_id,
                "lines": merged_lines,
                "provider": "paddleocr",
            }
        )
    except Exception as exc:  # pragma: no cover
        emit(
            {
                "ok": False,
                "type": "result",
                "request_id": payload.get("request_id") if "payload" in locals() else None,
                "code": "PADDLE_OCR_RUNTIME_ERROR",
                "message": str(exc),
            }
        )
