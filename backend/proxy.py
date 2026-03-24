#!/usr/bin/env python3
from flask import Flask, request, Response
from curl_cffi import requests as curl_requests

app = Flask(__name__)
BASE_URL = "https://app-production.dhiraagu.com.mv"


def proxy_request(target_url: str) -> Response:
    headers = {"Host": "app-production.dhiraagu.com.mv"}

    for h in ["Authorization", "Content-Type", "Accept"]:
        if h in request.headers:
            headers[h] = request.headers[h]

    resp = curl_requests.request(
        method=request.method,
        url=target_url,
        headers=headers,
        data=request.get_data() or None,
        impersonate="chrome",
        timeout=30,
    )

    return Response(resp.content, resp.status_code, {"Content-Type": resp.headers.get("content-type", "application/json")})


@app.route("/<int:subscriber_id>")
def subscriber_lookup(subscriber_id: int):
    return proxy_request(f"{BASE_URL}/io/v1/info/subscribers/{subscriber_id}/dir")


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def catch_all(path: str):
    return proxy_request(f"{BASE_URL}/{path}")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
