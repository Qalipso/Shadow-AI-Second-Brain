# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Shadow, please report it responsibly:

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: [your-email@example.com]
Or use GitHub's private vulnerability reporting: Security → Report a vulnerability

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Your suggested fix (optional)

**Response time:** We aim to acknowledge reports within 48 hours and provide a resolution timeline within 7 days.

---

## Data Processing

Shadow processes the following user data:

### Sent to OpenAI
- Raw text of user captures (for AI classification and embedding generation)
- Text is not linked to any persistent identity on OpenAI's side
- Covered by OpenAI's data usage policies: https://openai.com/policies/api-data-usage-policies

### Stored in Supabase
- User entries (raw text + structured signals)
- Life area scores and confidence values
- Generated insights
- Vector embeddings (for semantic search)
- Ritual and habit logs
- Profile preferences

### Not processed by AI
- Entries created in Private Mode are stored locally and never sent to OpenAI
- Spotify tokens are encrypted at rest using TOKEN_ENCRYPTION_KEY

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (main) | Yes |
| Older releases | No |
