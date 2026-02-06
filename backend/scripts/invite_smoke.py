"""
Quick smoke test to exercise the invite endpoint against a running backend.

Usage:
    python3 scripts/invite_smoke.py \
        --email admin@admin.com --password Admin@12345! --firm-id 9

Notes:
- Requires the dev server running at http://127.0.0.1:8000.
- Uses the live database; it creates one invited user with a unique email.
"""

import argparse
import datetime as dt
import json
import sys
import uuid
from urllib import request, parse, error


BASE = "http://127.0.0.1:8000"


def post_json(url: str, payload: dict, headers: dict | None = None) -> tuple[int, dict]:
    body = json.dumps(payload).encode()
    req = request.Request(url, data=body, headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with request.urlopen(req, timeout=10) as resp:
            return resp.getcode(), json.load(resp)
    except error.HTTPError as e:
        return e.code, json.load(e)
    except Exception as exc:  # pragma: no cover - simple CLI feedback
        print(f"Request to {url} failed: {exc}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True, help="login email (firm_owner or super_admin)")
    parser.add_argument("--password", required=True, help="login password")
    parser.add_argument("--firm-id", type=int, default=None, help="firm id (required for super_admin)")
    args = parser.parse_args()

    # 1) Login to get access token
    status, login = post_json(f"{BASE}/api/authx/login/", {"email": args.email, "password": args.password})
    if status != 200 or not login.get("data", {}).get("tokens", {}).get("access"):
        print(f"Login failed ({status}): {login}")
        sys.exit(1)
    access = login["data"]["tokens"]["access"]
    print(f"Login OK. User id={login['data']['user']['id']}, role={login['data']['user'].get('role')}")

    # 2) Build invite payload with unique email
    unique_email = f"invite_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "first_name": "Smoke",
        "last_name": "Test",
        "email": unique_email,
        "role": "STAFF",
    }
    if args.firm_id:
        payload["firm_id"] = args.firm_id

    status, resp = post_json(
        f"{BASE}/api/v1/settings/users/invite",
        payload,
        headers={"Authorization": f"Bearer {access}"},
    )
    print(f"Invite status: {status}")
    print(json.dumps(resp, indent=2))


if __name__ == "__main__":
    main()
