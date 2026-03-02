# Security Policy

## Supported versions

| Version | Supported           |
| ------- | ------------------- |
| latest  | Yes                 |
| older   | No — please upgrade |

roadmap-maker follows a rolling release model. Security fixes are applied to the latest version only. We recommend always running the most recent release.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a security issue, send an email to:

**security@example.com**

Include as much detail as possible:

- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Any suggested mitigations or fixes

We will acknowledge your report within **48 hours** and aim to release a fix within **14 days** for critical issues. We will keep you informed throughout the process.

Once the vulnerability is fixed and a release is published, we will credit you in the release notes unless you prefer to remain anonymous.

## Scope

Issues considered in scope:

- Remote code execution
- SQL injection
- Authentication or authorization bypass (if auth is added in the future)
- Data exposure via the API
- Cross-site scripting (XSS) in the frontend

Out of scope:

- Issues requiring physical access to the server
- Denial-of-service attacks against self-hosted instances
- Vulnerabilities in dependencies that have already been publicly disclosed and for which upstream patches exist
