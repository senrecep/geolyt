# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x (current) | Yes |
| < 1.0 | No |

## Reporting a Vulnerability

Do not open a public GitHub issue for security vulnerabilities.

Report privately via [GitHub Security Advisories](https://github.com/senrecep/geolyt/security/advisories/new).

Include:
- Description of the vulnerability
- Steps to reproduce
- Affected component (API, worker, scraper, etc.)
- Potential impact

You will receive a response within **72 hours**.

## Scope

- API authentication and authorization
- SSRF vulnerabilities in the scraping pipeline
- Secret or credential exposure
- Rate limiting bypass
- Data isolation between tenants

## Out of Scope

- Vulnerabilities in third-party dependencies (report to the respective maintainer)
- Issues in self-hosted infrastructure configurations
