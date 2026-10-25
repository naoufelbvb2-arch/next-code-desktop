"""Desktop-owned explicit DeepSeek route over the original Engine Gateway.

No default route, paid retry, fixture selector, credential logging or SQL.
The separate mission journal reserves every possible HTTP attempt before I/O.
"""
import contextlib
import asyncio
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import sys
import time

MODEL = "deepseek-flash"
DESTINATION = "https://api.deepseek.com/chat/completions"


class CodingBudget:
    def __init__(self, path):
        self.path = Path(path)
        if not self.path.is_absolute():
            raise ValueError("CODING_BUDGET_UNAVAILABLE")

    @contextlib.contextmanager
    def locked(self):
        import msvcrt
        with open(str(self.path) + ".lock", "a+b") as lock:
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_LOCK, 1)
            try:
                raw = self.path.read_bytes()
                if len(raw) > 65536:
                    raise ValueError("CODING_BUDGET_UNAVAILABLE")
                data = json.loads(raw)
                if (set(data) != {"version", "requestLimit", "tokenLimit", "outputLimit", "taskId", "requests"}
                    or data["version"] != 1 or data["requestLimit"] != 12
                    or data["tokenLimit"] != 60000 or data["outputLimit"] != 2048
                    or type(data["requests"]) is not list or len(data["requests"]) > 12):
                    raise ValueError("CODING_BUDGET_UNAVAILABLE")
                yield data
            finally:
                lock.seek(0)
                msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)

    def save(self, data):
        # A distinct lock survives atomic journal replacement. A partial write
        # never becomes a reusable empty budget after crash/restart.
        temp = self.path.with_name(self.path.name + "." + secrets.token_hex(8) + ".tmp")
        with open(temp, "xb") as stream:
            stream.write(json.dumps(data, separators=(",", ":")).encode())
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, self.path)

    def claim(self, task_id):
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", task_id):
            raise ValueError("CODING_TASK_DENIED")
        with self.locked() as data:
            if data["taskId"] is not None or data["requests"]:
                raise ValueError("CODING_TASK_ALREADY_CONSUMED")
            data["taskId"] = task_id
            self.save(data)

    def reserve(self, input_bound):
        with self.locked() as data:
            if not data["taskId"] or len(data["requests"]) >= 12:
                raise ValueError("CODING_BUDGET_EXHAUSTED")
            total = 0
            for row in data["requests"]:
                if row["status"] != "completed":
                    raise ValueError("CODING_BUDGET_UNCERTAIN")
                usage = row["total_tokens"]
                if type(usage) is not int or usage < 0:
                    raise ValueError("CODING_BUDGET_UNCERTAIN")
                total += usage
            if type(input_bound) is not int or input_bound < 1 or total + input_bound + 2048 > 60000:
                raise ValueError("CODING_TOKEN_BUDGET_EXHAUSTED")
            ordinal = len(data["requests"]) + 1
            data["requests"].append({"ordinal": ordinal, "status": "reserved",
                "model": MODEL, "destination": DESTINATION, "inputBound": input_bound,
                "outputLimit": 2048, "issuedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
            self.save(data)
            return ordinal

    def finish(self, ordinal, result):
        with self.locked() as data:
            row = data["requests"][ordinal - 1]
            if row["ordinal"] != ordinal or row["status"] != "reserved":
                raise ValueError("CODING_BUDGET_UNCERTAIN")
            row.update(result)
            self.save(data)


def validate_route(route, workspace):
    fields = {"provider", "baseUrl", "model", "budgetFile", "workspaceRoot", "writableFiles",
              "verificationFile", "verificationSha256", "command", "policy"}
    if (set(route) != fields or route["provider"] != "deepseek_official_v1"
        or route["baseUrl"] != "https://api.deepseek.com" or route["model"] != MODEL
        or route["policy"] != "pure-python-functions-v1"
        or Path(route["workspaceRoot"]).resolve(strict=True) != Path(workspace).resolve(strict=True)):
        raise ValueError("CODING_ROUTE_DENIED")
    files = route["writableFiles"]
    if (type(files) is not list or not 1 <= len(files) <= 4 or len(set(files)) != len(files)
        or route["verificationFile"] in files
        or any(not re.fullmatch(r"[a-zA-Z0-9_-]+\.py", f) for f in files + [route["verificationFile"]])):
        raise ValueError("CODING_SCOPE_DENIED")
    if hashlib.sha256((workspace / route["verificationFile"]).read_bytes()).hexdigest() != route["verificationSha256"]:
        raise ValueError("CODING_VERIFICATION_CHANGED")
    if route["command"] != f'"{Path(sys.executable).as_posix()}" -B {route["verificationFile"]}':
        raise ValueError("CODING_COMMAND_DENIED")


def build_gateway(settings, key, workspace, backend=None):
    # Only the original pinned modules provide model generation and routing.
    from engine_compatibility import load_verified_engine
    load_verified_engine({k: settings[k] for k in ("engineRoot", "sitePackages")})
    import httpx
    from kernel.gateway.router import ModelGateway
    from kernel.gateway.openai_compat import OpenAICompatibleProvider, ProviderConfig
    from kernel.gateway.ledger import TokenLedger
    from kernel.config import KernelConfig
    from kernel.schemas import ModelProfile
    route = settings["route"]
    validate_route(route, workspace)
    if not re.fullmatch(r"sk-[A-Za-z0-9_-]{1,500}", key):
        raise ValueError("CODING_CREDENTIAL_UNAVAILABLE")
    budget = CodingBudget(route["budgetFile"])

    class Transport(httpx.AsyncBaseTransport):
        def __init__(self):
            self.backend = backend if backend is not None else httpx.AsyncHTTPTransport(retries=0, trust_env=False)

        async def handle_async_request(self, request):
            if str(request.url) != DESTINATION or request.method != "POST":
                raise ValueError("CODING_DESTINATION_DENIED")
            payload = json.loads(request.content)
            if (set(payload) != {"model", "messages", "temperature", "max_tokens"}
                or payload["model"] != MODEL or type(payload["max_tokens"]) is not int
                or not 1 <= payload["max_tokens"] <= 4096
                or type(payload["messages"]) is not list or not 1 <= len(payload["messages"]) <= 64
                or key in request.content.decode("utf-8")):
                raise ValueError("CODING_PAYLOAD_DENIED")
            payload.update(max_tokens=min(payload["max_tokens"], 2048), thinking={"type": "disabled"},
                           stream=False, response_format={"type": "json_object"})
            encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            # UTF-8 bytes + framing allowance is deliberately more conservative
            # than the actual billed input tokenizer; never estimate by chars/4.
            ordinal = budget.reserve(len(encoded) + 512)
            sent = httpx.Request("POST", DESTINATION, content=encoded,
                headers={"Content-Type": "application/json", "Authorization": "Bearer " + key},
                extensions=request.extensions)
            response = None
            try:
                response = await self.backend.handle_async_request(sent)
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > 1048576:
                        raise ValueError("CODING_RESPONSE_LIMIT")
                if response.status_code != 200:
                    budget.finish(ordinal, {"status": "failed", "httpStatus": response.status_code})
                    raise ValueError("CODING_PROVIDER_FAILED")
                data = json.loads(body)
                usage = {name: data["usage"][name] for name in ("prompt_tokens", "completion_tokens", "total_tokens")}
                if (any(type(v) is not int or v < 0 for v in usage.values())
                    or usage["total_tokens"] != usage["prompt_tokens"] + usage["completion_tokens"]
                    or usage["prompt_tokens"] > len(encoded) + 512 or usage["completion_tokens"] > 2048):
                    raise ValueError("CODING_USAGE_UNVERIFIED")
                # Record charged usage even if output is malformed/truncated.
                budget.finish(ordinal, {"status": "completed", "httpStatus": 200, **usage})
                choice = data["choices"][0]
                if (choice.get("finish_reason") != "stop" or not isinstance(choice["message"]["content"], str)
                    or key.encode() in body or len(choice["message"]["content"]) > 65536):
                    raise ValueError("CODING_OUTPUT_INVALID")
                # Never return provider reasoning/error bodies to engine logs.
                return httpx.Response(200, json={"choices": [{"message": {"content": choice["message"]["content"]}}],
                                               "usage": usage}, request=sent)
            except asyncio.CancelledError:
                # The original gateway_wait must observe cancellation, drain
                # the awaited HTTP coroutine and then raise TaskCancelled.
                # The durable reservation remains uncertain/consumed.
                raise
            except Exception:
                # A reserved/failed attempt stays unusable; cancellation and
                # crashes cannot silently replenish a paid allowance.
                raise ValueError("CODING_PROVIDER_UNAVAILABLE") from None
            finally:
                if response is not None:
                    await response.aclose()

        async def aclose(self):
            await self.backend.aclose()

    class Provider(OpenAICompatibleProvider):
        async def generate_structured(self, messages, response_model, temperature=0.0,
                                      max_retries=0, task_id="", model=None):
            # Engine callers cannot opt into paid schema self-healing retries.
            return await super().generate_structured(messages, response_model, temperature,
                max_retries=0, task_id=task_id, model=model)

    client = httpx.AsyncClient(transport=Transport(), timeout=60, follow_redirects=False, trust_env=False)
    provider = Provider(config=ProviderConfig(base_url=route["baseUrl"], api_key=key,
        default_model=MODEL, timeout_sec=60, max_http_retries=1), client=client)
    gateway = ModelGateway(config=KernelConfig(workspace_root=workspace, deepseek_api_key=None,
        deepseek_base_url=route["baseUrl"], max_retries=0, max_tokens_per_task=60000),
        ledger=TokenLedger(workspace / ".agent_os/coding-tokens.jsonl"))
    gateway._routes.clear()
    for profile in ModelProfile:
        gateway.register_route(profile, provider, model_name=MODEL)
    gateway.aclose = client.aclose
    return gateway
