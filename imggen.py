import datetime as dt
import json
import os
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request


API_BASE_URL = "https://image.pollinations.ai/prompt"

# -----------------------------
# EDIT THESE VALUES DIRECTLY
# -----------------------------
PROMPT = "a detailed dissection image of a human heart and its differnt parts, labeled with annotations, in the style of a vintage medical textbook illustration"

AVAILABLE_MODELS = [
	"auto",
	"flux",
	"turbo",
	"sdxl",
	"openjourney",
	"stable-diffusion",
]
MODEL = "auto"

# Optional: put your key here OR set POLLINATIONS_API_KEY in environment
API_KEY = os.getenv("POLLINATIONS_API_KEY")

WIDTH = 1024
HEIGHT = 1024
SEED: int | None = None
OUTPUT_NAME: str | None = None
RETRY_ATTEMPTS_PER_MODE = 3


def build_request(
	prompt: str,
	model: str,
	width: int,
	height: int,
	seed: int | None,
	api_key: str | None,
	include_auth_header: bool,
	include_query_apikey: bool,
) -> urllib.request.Request:
	encoded_prompt = urllib.parse.quote(prompt, safe="")
	query_params: dict[str, str | int] = {
		"width": width,
		"height": height,
		"nologo": "true",
		"enhance": "true",
	}

	if model != "auto":
		query_params["model"] = model

	if seed is not None:
		query_params["seed"] = seed

	if api_key and include_query_apikey:
		query_params["apikey"] = api_key

	url = f"{API_BASE_URL}/{encoded_prompt}?{urllib.parse.urlencode(query_params)}"
	headers = {
		"Accept": "image/*",
		"User-Agent": "modulearn-imggen/1.0",
	}

	if api_key and include_auth_header:
		headers["Authorization"] = f"Bearer {api_key}"

	return urllib.request.Request(url=url, headers=headers, method="GET")


def fetch_image_bytes(request: urllib.request.Request) -> tuple[bytes, str]:
	with urllib.request.urlopen(request, timeout=120) as response:
		image_data = response.read()
		content_type = response.headers.get("Content-Type", "image/jpeg")
		return image_data, content_type


def is_transient_http_error(exc: urllib.error.HTTPError) -> bool:
	return exc.code in {429, 500, 502, 503, 504}


def pick_extension(content_type: str) -> str:
	content_type = content_type.lower()
	if "png" in content_type:
		return ".png"
	if "webp" in content_type:
		return ".webp"
	if "jpeg" in content_type or "jpg" in content_type:
		return ".jpg"
	return ".img"


def main() -> None:
	if not PROMPT.strip():
		raise SystemExit("PROMPT cannot be empty. Edit PROMPT at the top of this file.")

	if MODEL not in AVAILABLE_MODELS:
		raise SystemExit(
			f"MODEL '{MODEL}' is not in AVAILABLE_MODELS. Choose one of: {', '.join(AVAILABLE_MODELS)}"
		)

	output_dir = pathlib.Path(__file__).resolve().parent / "img"
	output_dir.mkdir(parents=True, exist_ok=True)

	request_modes = [
		{"include_auth_header": True, "include_query_apikey": True, "label": "auth-header + query apikey"},
		{"include_auth_header": False, "include_query_apikey": True, "label": "query apikey only"},
		{"include_auth_header": False, "include_query_apikey": False, "label": "no api key"},
	]

	model_candidates = [MODEL] + [candidate for candidate in AVAILABLE_MODELS if candidate != MODEL]

	last_error = "Unknown error"
	image_bytes: bytes | None = None
	content_type = "image/jpeg"

	for selected_model in model_candidates:
		for mode in request_modes:
			if not API_KEY and (mode["include_auth_header"] or mode["include_query_apikey"]):
				continue

			for attempt in range(1, RETRY_ATTEMPTS_PER_MODE + 1):
				request = build_request(
					prompt=PROMPT,
					model=selected_model,
					width=WIDTH,
					height=HEIGHT,
					seed=SEED,
					api_key=API_KEY,
					include_auth_header=bool(mode["include_auth_header"]),
					include_query_apikey=bool(mode["include_query_apikey"]),
				)

				try:
					image_bytes, content_type = fetch_image_bytes(request)
					MODEL_USED = selected_model
					print(f"Request mode successful: {mode['label']}")
					print(f"Model successful: {selected_model}")
					break
				except urllib.error.HTTPError as exc:
					try:
						error_body = exc.read().decode("utf-8", errors="replace")
						parsed = json.loads(error_body)
						message = parsed.get("error") or parsed
					except Exception:
						message = f"HTTP {exc.code}: {exc.reason}"

					last_error = f"model={selected_model}, mode={mode['label']}, attempt={attempt} -> {message}"

					if is_transient_http_error(exc) and attempt < RETRY_ATTEMPTS_PER_MODE:
						time.sleep(1.2 * attempt)
						continue
					break
				except Exception as exc:
					last_error = f"model={selected_model}, mode={mode['label']}, attempt={attempt} -> {exc}"
					if attempt < RETRY_ATTEMPTS_PER_MODE:
						time.sleep(1.0 * attempt)
						continue
					break

			if image_bytes is not None:
				break
		if image_bytes is not None:
			break

	if image_bytes is None:
		raise SystemExit(
			"Generation failed after trying all request modes. "
			f"Last error: {last_error}. "
			"Try changing MODEL or removing API key if it is invalid/expired."
		)

	extension = pick_extension(content_type)
	if OUTPUT_NAME:
		file_name = f"{OUTPUT_NAME}{extension}"
	else:
		timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
		file_name = f"generated_{timestamp}{extension}"

	output_path = output_dir / file_name
	output_path.write_bytes(image_bytes)
	print(f"Model used: {MODEL_USED if 'MODEL_USED' in locals() else MODEL}")
	print(f"Saved image: {output_path}")


if __name__ == "__main__":
	main()

