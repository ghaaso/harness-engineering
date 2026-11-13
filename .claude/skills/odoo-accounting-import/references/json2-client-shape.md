<!-- Trimmed from https://github.com/japinol7/odoo-json2 @ 5883ed50ef92b8aa8ec6a14a8a32a440e655518f README.md, odoo_json2/simple_json2/json2_connection.py, odoo_json2/simple_json2/json2_client.py, odoo_json2/simple_json2/config.py (MIT, Copyright (c) 2025, 2026 Joan A. Pinol): kept README lines 1-21 and 39-42, and the wire-shape excerpts listed under each heading; the code is quoted unchanged, with upstream line numbers. Wire reference only — FixFlow does not depend on this library (see SKILL.md "Where upstream disagrees"). -->

# odoo-json2 — README and API shape (wire reference)

## README.md (lines 1-21, 39-42; upstream version note kept)

```
## Odoo json-2
    Odoo json-2 client using 'requests' as the underlying transport.
<br>

	version: 0.0.2
	author: Joan A. Pinol
	author_nickname: japinol
	author_gitHub: japinol7
	author_twitter: @japinol
<br>

	Dependencies: requests.
	Python requires: 3.14 or greater.
    Tested against Odoo 19.0 CE.
<br>


### More info

* Official Odoo documentation
  * [External JSON-2 API — Odoo 19.0 documentation](https://www.odoo.com/documentation/19.0/developer/reference/external_api.html)
...
### Install the last package tag released from this repo in your project
Add this to your requirements.txt file: <br>

    git+https://github.com/japinol7/odoo-json2.git@v0.0.2
```

## simple_json2/config.py (lines 3-8)

```python
CLIENT_NAME = 'odoo-json2'
TIMEOUT_DEFAULT_SEC = 10
TIMEOUT_CONNECT_DEFAULT_SEC = 12

# SSL will be activated for the following ports
PORTS_TO_ACTIVATE_SSL = 443,
```

## simple_json2/json2_connection.py — URLs (45-50) and headers (63-69)

```python
    def _setup_urls(self):
        """Constructs the root URLs for the connection."""
        protocol = "https" if self.ssl else "http"
        base_url = f"{protocol}://{self.server.host}:{self.server.port}"
        self._url_root = f"{base_url}/json/2/"
        self._url_root_web = f"{base_url}/web/"
```

```python
        headers = {
            "Authorization": f"Bearer {self.server.api_key}",
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": f"odoo-json2/{VERSION} (requests/{requests.__version__})",
            }
        if self.server.dbname:
            headers["X-Odoo-Database"] = self.server.dbname
```

## simple_json2/json2_client.py — response handling (50-67) and the core call (72-81)

```python
    def _handle_response(self, response: requests.Response) -> JSON:
        """Handle HTTP response and raise appropriate exceptions based on status code."""
        match response.status_code:
            case 200:
                return response.json()
            case 400:
                raise OdooJson2Error(f"Bad request: {response.text}")
            case 401:
                raise OdooJson2Error(f"Unauthorized: {response.text}")
            case 403:
                raise OdooJson2Error(f"Forbidden: {response.text}")
            case 404:
                raise OdooJson2Error(f"Not found: {response.text}")
            case code if code >= 500:
                raise OdooJson2Error(f"Server error {code}: {response.text}")
            case _:
                raise OdooJson2Error(
                    f"Unexpected response {response.status_code}: {response.text}")
```

```python
    def call(self, model: str, method: str, **params: Any) -> JSON:
        """Call any Odoo model.method."""
        if self._context:
            local_context = params.get("context", {})
            params["context"] = {**self._context, **local_context}

        url = f"{self._connection._url_root}{model}/{method}"
        response = self._connection._client.post(
            url, json=params, timeout=self._connection._client.timeout)
        return self._handle_response(response)
```

## json2_client.py — version discovery (112-124, trimmed to the request)

```python
    def get_server_version_data(self):
        """Gets the server version data."""
        url = f"{self._connection._url_root_web}version"
        ...
        response = jsonrpc_client.get(url, timeout=timeout)
        return self._handle_response(response)
```

## json2_client.py — keyword names per ORM method (16, 129-132, 150-155, 169-179, 187-196)

```python
DEFAULT_LIMIT = 50
```

```python
    def create(self, model: str, vals: Union[dict, list[dict]], **kwargs: Any
        ) -> JSON:
        """Creates a document object with the specified values."""
        return self.call(model, "create", vals_list=vals, **kwargs)
```

```python
    def search(
            self, model: str, domain: list, limit=DEFAULT_LIMIT, **kwargs: Any
        ) -> JSON:
        """Gets the ids of the document object that match the specified domain."""
        res = self.call(
            model, "search", domain=domain, limit=limit, **kwargs)
```

```python
    def search_read(
            self, model: str, domain: list, fields: Optional[list] = None,
            limit=DEFAULT_LIMIT, **kwargs: Any
        ) -> JSON:
        ...
        res = self.call(
            model, "search_read", domain=domain, fields=fields,
            limit=limit, **kwargs)
```

```python
    def write(self, model: str, ids: list, vals: dict, **kwargs: Any
        ) -> JSON:
        ...
        return self.call(model, "write", ids=ids, vals=vals, **kwargs)

    def unlink(self, model: str, ids: list, **kwargs: Any) -> JSON:
        """Deletes the document objects that match the specified ids."""
        return self.call(model, "unlink", ids=ids, **kwargs)
```
