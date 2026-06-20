# auth.md — Esportsduniya Agent Authentication

## Overview

Esportsduniya is an AI-powered live sports platform. This document describes how AI agents can register, authenticate, and interact with the API.

## Authentication

Esportsduniya uses JWT bearer tokens for API authentication.

### Registration

```
POST https://esportsduniya.in/api/register
Content-Type: application/json

{
  "username": "your-agent-id",
  "password": "your-secret",
  "email": "agent@example.com"
}
```

Returns a JWT `token` in the response body.

### Login

```
POST https://esportsduniya.in/api/login
Content-Type: application/json

{
  "username": "your-agent-id",
  "password": "your-secret"
}
```

Returns a JWT `token` valid for 7 days.

### Using the Token

Include the token in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Public Endpoints (no auth required)

| Endpoint | Description |
|---|---|
| `GET /api/sports/live/:sport` | Live scores (cricket, football, nba, tennis, f1) |
| `GET /api/health` | Service health and configuration status |
| `GET /api/leaderboard` | Prediction leaderboard |
| `GET /api/stats/public` | Platform statistics |
| `GET /api/blog` | Published articles |

## Authenticated Endpoints

| Endpoint | Description |
|---|---|
| `POST /api/ai/narrative` | AI match narrative generation |
| `POST /api/ai/preview` | AI match preview and form analysis |
| `POST /api/ai/momentum` | AI momentum analysis |
| `POST /api/ai/oracle` | AI Q&A about any match |
| `POST /api/ai/tactics` | AI tactical breakdown |
| `POST /api/predictions/save` | Lock a match prediction |
| `GET /api/fantasy/:username` | Get user fantasy picks |
| `GET /api/profile/:username` | Get user profile |

## Rate Limits

| Scope | Limit |
|---|---|
| Global API | 300 requests / 15 min |
| Auth endpoints | 10 requests / 15 min |
| AI endpoints | 30 requests / 60 min |

## Discovery

- API Catalog: `/.well-known/api-catalog`
- OAuth Metadata: `/.well-known/oauth-authorization-server`
- Protected Resource: `/.well-known/oauth-protected-resource`
- MCP Server Card: `/.well-known/mcp/server-card.json`
- Agent Skills: `/.well-known/agent-skills/index.json`
