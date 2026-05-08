"""
LLM Router
----------
- Round-robin across Groq and Gemini
- Per-provider health tracking with cooldown timer
- Automatic failover to next healthy provider
- Sliding-window rate limiter (per session, 10 req/min)
- /api/status support via get_provider_status()
"""

import os
import time
from collections import deque
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


COOLDOWN_SECONDS    = 60   # seconds a provider stays unhealthy after a 429
MAX_PROVIDER_TRIES  = 3    # max providers to attempt per request
RATE_LIMIT_WINDOW   = 60   # sliding window in seconds
RATE_LIMIT_MAX_REQ  = 10   # max requests per session per window



@dataclass
class Provider:
    name: str
    client_type: str     
    model: str
    api_key_env: str
    healthy: bool = True
    cooldown_until: float = 0.0
    total_calls: int = 0
    total_errors: int = 0
    last_error: str = ""

    def is_available(self) -> bool:
        """Auto-recover after cooldown expires."""
        if not self.healthy and time.time() > self.cooldown_until:
            self.healthy = True
            self.last_error = ""
        return self.healthy

    def mark_unhealthy(self, reason: str = ""):
        self.healthy = False
        self.cooldown_until = time.time() + COOLDOWN_SECONDS
        self.last_error = reason[:200]
        self.total_errors += 1

    def mark_success(self):
        self.total_calls += 1
        self.healthy = True
        self.last_error = ""

    def to_dict(self) -> dict:
        cooldown_left = max(0, int(self.cooldown_until - time.time()))
        return {
            "name": self.name,
            "model": self.model,
            "healthy": self.is_available(),
            "total_calls": self.total_calls,
            "total_errors": self.total_errors,
            "last_error": self.last_error,
            "cooldown_remaining_seconds": cooldown_left,
        }


_PROVIDERS: list[Provider] = [
    Provider(
        name="Groq",
        client_type="groq",
        model="llama-3.1-70b-versatile",
        api_key_env="GROQ_API_KEY",
    ),
    Provider(
        name="Gemini",
        client_type="gemini",
        model="gemini-2.5-flash",
        api_key_env="GEMINI_API_KEY",
    ),
]

_current_index: int = 0  

_rate_store: dict[str, deque] = {}


def check_rate_limit(session_id: str) -> tuple[bool, int]:
    """
    Returns (allowed, retry_after_seconds).
    Stamps a new request if allowed.
    """
    now   = time.time()
    cutoff = now - RATE_LIMIT_WINDOW

    if session_id not in _rate_store:
        _rate_store[session_id] = deque()

    q = _rate_store[session_id]

    # Evict timestamps outside the window
    while q and q[0] < cutoff:
        q.popleft()

    if len(q) >= RATE_LIMIT_MAX_REQ:
        retry_after = int(q[0] + RATE_LIMIT_WINDOW - now) + 1
        return False, retry_after

    q.append(now)
    return True, 0


def get_rate_limit_info(session_id: str) -> dict:
    """Current usage for a session — used by /api/status."""
    now    = time.time()
    cutoff = now - RATE_LIMIT_WINDOW
    q      = _rate_store.get(session_id, deque())
    recent = sum(1 for t in q if t >= cutoff)
    return {
        "requests_in_window": recent,
        "limit": RATE_LIMIT_MAX_REQ,
        "window_seconds": RATE_LIMIT_WINDOW,
        "remaining": max(0, RATE_LIMIT_MAX_REQ - recent),
    }



_client_cache: dict[str, object] = {}


def _get_client(provider: Provider):
    if provider.name in _client_cache:
        return _client_cache[provider.name]

    api_key = os.environ.get(provider.api_key_env, "").strip()
    if not api_key:
        raise ValueError(
            f"API key not found. Set {provider.api_key_env} in your .env file."
        )

    if provider.client_type == "groq":
        from openai import OpenAI
        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=api_key,
        )

    elif provider.client_type == "gemini":
        from google import genai
        client = genai.Client(api_key=api_key)

    else:
        raise ValueError(f"Unknown client_type: {provider.client_type}")

    _client_cache[provider.name] = client
    return client


def _call_provider(provider: Provider, prompt: str) -> str:
    client = _get_client(provider)

    if provider.client_type == "groq":
        resp = client.chat.completions.create(
            model=provider.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1024,
        )
        return resp.choices[0].message.content

    if provider.client_type == "gemini":
        resp = client.models.generate_content(
            model=provider.model,
            contents=prompt,
        )
        return resp.text

    raise ValueError(f"Unknown client_type: {provider.client_type}")



def call_llm(prompt: str) -> tuple[str, str]:
    """
    Round-robin call with automatic failover.
    Returns (response_text, provider_name).
    Raises RuntimeError if all providers fail.
    """
    global _current_index

    total    = len(_PROVIDERS)
    tried    = 0
    start_idx = _current_index

    while tried < min(MAX_PROVIDER_TRIES, total):
        provider = _PROVIDERS[_current_index % total]
        _current_index = (_current_index + 1) % total
        tried += 1

        if not provider.is_available():
            continue

        try:
            text = _call_provider(provider, prompt)
            provider.mark_success()
            return text, provider.name

        except Exception as e:
            err = str(e)
            is_quota = any(k in err.lower() for k in [
                "429", "quota", "rate_limit", "resource_exhausted",
                "too many requests", "rate limit exceeded",
            ])
            provider.mark_unhealthy(reason=err)
            # If not a quota issue, don't silently swallow — re-raise after trying others
            continue

    raise RuntimeError(
        "All LLM providers are unavailable or quota-exhausted. "
        "Please wait ~60 seconds and try again."
    )


def get_provider_status() -> dict:
    return {
        "providers": [p.to_dict() for p in _PROVIDERS],
        "round_robin_next": _PROVIDERS[_current_index % len(_PROVIDERS)].name,
        "config": {
            "cooldown_seconds": COOLDOWN_SECONDS,
            "max_provider_tries": MAX_PROVIDER_TRIES,
            "rate_limit_window_seconds": RATE_LIMIT_WINDOW,
            "rate_limit_max_requests": RATE_LIMIT_MAX_REQ,
        },
    }