from app.core.config import settings


def get_v1_description() -> str:
    """Generate API description dynamically from settings"""
    return f"""
**{settings.app_name}** is a production-ready FastAPI backend template with comprehensive authentication, authorization, and background task processing.

---

## Features

- **JWT Authentication** — Access and refresh token flow
- **Role-Based Access Control (RBAC)** — Granular permissions via roles and scopes
- **API Key Authentication** — Machine-to-machine authentication
- **OAuth Social Login** — Google authentication support
- **Magic Links** — Passwordless email authentication
- **Background Tasks** — Dramatiq with Redis for async job processing
- **Rate Limiting** — Protection against abuse

---

## Getting Started

### Step 1: Obtain an Access Token

Authenticate using your **username** and **password** to obtain JWT tokens.

<details>
<summary>curl</summary>

```bash
curl -X POST "{settings.app_domain}/v1/auth/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "username=user@example.com&password=your_password"
```

</details>

<details>
<summary>Python</summary>

```python
import requests

response = requests.post(
    "{settings.app_domain}/v1/auth/token",
    data={{
        "username": "user@example.com",
        "password": "your_password"
    }}
)
tokens = response.json()
access_token = tokens["accessToken"]
refresh_token = tokens["refreshToken"]
```

</details>

---

### Step 2: Make Authenticated Requests

Include the access token in the `Authorization` header for all protected endpoints.

<details>
<summary>curl</summary>

```bash
curl -X GET "{settings.app_domain}/v1/user/me" \\
  -H "Authorization: Bearer <access_token>"
```

</details>

<details>
<summary>Python</summary>

```python
response = requests.get(
    "{settings.app_domain}/v1/user/me",
    headers={{"Authorization": f"Bearer {{access_token}}"}}
)
user = response.json()
```

</details>

---

### API Key Authentication

For machine-to-machine integrations, use API keys instead of user credentials.

<details>
<summary>curl</summary>

```bash
curl -X POST "{settings.app_domain}/v1/auth/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "client_id=<your_client_id>&client_secret=<your_client_secret>"
```

</details>

---

### Token Refresh

Access tokens expire after {settings.token_expire_minutes} minutes. Use the refresh token to obtain new tokens without re-authenticating.

<details>
<summary>curl</summary>

```bash
curl -X POST "{settings.app_domain}/v1/auth/refresh" \\
  -H "Content-Type: application/json" \\
  -d '{{"refreshToken": "<refresh_token>"}}'
```

</details>

---

## Rate Limiting

The following endpoints have rate limits to prevent abuse:

| Endpoint | Limit |
|----------|-------|
| `/auth/token` | 10 requests/minute |
| `/auth/social_login` | 10 requests/minute |
| `/auth/refresh` | 20 requests/minute |
| `/user/email_password_reset_link` | 5 requests/minute |
| `/user/send_magic_link` | 5 requests/minute |

---

## Authorization Model

This API uses a **two-layer authorization** system:

1. **Roles** — Assigned to users, grant access to endpoint groups
2. **Scopes** — Fine-grained permissions within roles

**Example Scopes:**
- `users.write` — Manage users
- `role.write` — Manage roles
- `jobs.read` — View background jobs
- `jobs.write` — Manage background jobs

Users with the `admin` role have unrestricted access to all endpoints.
"""


v1_tags_metadata = [
    {
        "name": "Authentication",
        "description": """
Endpoints for user authentication and token management.

**Authentication Methods:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| Password | `POST /auth/token` | Login with username/password |
| API Key | `POST /auth/token` | Login with client_id/client_secret |
| OAuth | `POST /auth/social_login` | Login via Google |
| Magic Link | `POST /auth/validate_magic_link` | Passwordless login |

**Token Types:**

| Token | Expiry | Purpose |
|-------|--------|---------|
| Access Token | 30 min | API request authorization |
| Refresh Token | 60 min | Obtain new access tokens |

**Token Response:**
```json
{
  "accessToken": "eyJ...",
  "accessTokenExpires": "2024-01-01T12:30:00Z",
  "refreshToken": "eyJ...",
  "refreshTokenExpires": "2024-01-01T13:00:00Z"
}
```
"""
    },
    {
        "name": "User Management",
        "description": """
Endpoints for managing users, API keys, and self-service operations.

**Endpoint Categories:**

| Category | Required Role | Description |
|----------|---------------|-------------|
| Admin Operations | `admin` + `users.write` | Create, update, delete users |
| API Key Management | `admin` + `users.write` | Manage user API keys |
| Self-Service | None | Password reset, magic links |
| Current User | Authenticated | View/update own profile |

**User Model:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "is_active": true,
  "email_confirmed": true,
  "roles": [
    {"name": "user", "scopes": ["profile.read"]}
  ]
}
```

**API Key Structure:**
- `client_id` — Unique identifier for the API client
- `client_secret` — Secret key (only shown once at creation)
- `scopes` — Permissions granted to this key
- `active` — Whether the key is currently usable
"""
    },
    {
        "name": "User Role Management",
        "description": """
Endpoints for managing roles and their associated permission scopes.

**Access Requirements:** All endpoints require `admin` role + `role.write` scope.

**Role Model:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "editor",
  "description": "Can edit content",
  "scopes": ["content.read", "content.write"],
  "created_by": "admin@example.com"
}
```

**How Permissions Work:**

```
┌─────────────────────────────────────────────────────────┐
│                        User                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Role: admin │    │ Role: editor │    │ Role: viewer │  │
│  │             │    │             │    │             │  │
│  │ Scopes:     │    │ Scopes:     │    │ Scopes:     │  │
│  │ - *         │    │ - content.* │    │ - *.read    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Built-in Scopes:**
- `users.write` — User management
- `role.write` — Role management
- `jobs.read` — View background jobs
- `jobs.write` — Manage background jobs
"""
    },
    {
        "name": "Dramatiq Monitoring",
        "description": """
Endpoints for monitoring and managing background tasks processed by Dramatiq.

**Access Requirements:** All endpoints require `admin` role.

| Operation | Required Scope | Description |
|-----------|----------------|-------------|
| Read | `jobs.read` | View queues, jobs, statistics |
| Write | `jobs.write` | Cancel jobs, retry failed, clear queues |

**Job Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | Job is queued, waiting to be processed |
| `running` | Job is currently being executed |
| `completed` | Job finished successfully |
| `failed` | Job encountered an error |

**Dashboard Response:**
```json
{
  "broker_info": {
    "redis_version": "7.0.0",
    "connected_clients": 5,
    "used_memory_human": "1.5M"
  },
  "total_stats": {
    "total_jobs": 150,
    "pending_jobs": 10,
    "running_jobs": 2,
    "completed_jobs": 130,
    "failed_jobs": 8
  },
  "queues": ["default", "high-priority"]
}
```

**Common Operations:**
- **Retry Failed Job:** `POST /dramatiq/jobs/{message_id}/retry`
- **Cancel Pending Job:** `POST /dramatiq/jobs/{message_id}/cancel`
- **Clear Queue:** `DELETE /dramatiq/queues/{queue_name}/clear`
"""
    }
]
