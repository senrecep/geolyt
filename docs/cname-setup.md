# CNAME Setup for White-Label Agency Clients

This guide explains how to point an agency client's custom domain to the Geolyt dashboard so that the white-label config (logo, colors, company name) is applied automatically.

## What the user sees

When a visitor opens `https://dashboard.client.com`, they see the Geolyt dashboard branded with the client's configured logo, company name, primary color, and favicon. The same app instance serves every client; the domain name decides which white-label config is loaded.

## How it works

1. The browser sends a request to `https://dashboard.client.com`.
2. The reverse proxy terminates TLS and forwards the request to the Geolyt Next.js app.
3. `packages/web/middleware.ts` reads the `Host` header and calls `GET /clients/lookup?domain=dashboard.client.com`.
4. The API searches `clients.white_label_config->>'domain'` and returns the matching client's config.
5. The middleware stores the config in the `x-geolyt-white-label` cookie.
6. `packages/web/app/layout.tsx` reads the cookie and injects the brand CSS variables, favicon, and header props.

## DNS configuration

The agency client must add a **CNAME record** in their DNS provider:

| Type  | Name                 | Value                 |
|-------|----------------------|-----------------------|
| CNAME | `dashboard.client.com` | `app.geolyt.io`       |

Replace `app.geolyt.io` with the public domain that points to your Geolyt deployment.

> Do **not** use an `A` record pointing to an IP address. If the server IP changes, the client's white-label domain will break.

## TLS / SSL

The reverse proxy (Dokploy, Traefik, or nginx) must terminate TLS for the CNAME host. With Dokploy + Traefik, this is usually automatic when the host is routed to the same service. Make sure the dashboard service is configured to accept requests for any host, or list the custom domains as additional routing rules.

## Geolyt configuration

1. Open the agency client's white-label settings (currently via `PATCH /clients/me/white-label` or directly in the database).
2. Set the `domain` field to the exact hostname, for example `dashboard.client.com`.
3. Save the config.

Example JSON body for `PATCH /clients/me/white-label`:

```json
{
  "companyName": "Client Agency",
  "logoUrl": "https://cdn.client.com/logo.png",
  "faviconUrl": "https://cdn.client.com/favicon.ico",
  "primaryColor": "#0f766e",
  "domain": "dashboard.client.com"
}
```

## Local testing

You can test the CNAME behavior without touching real DNS by editing your local hosts file:

```text
127.0.0.1 dashboard.client.local
```

Then start the local stack (`docker compose up -d postgres redis` and `bun dev`), create a client with `domain: dashboard.client.local`, and open `http://dashboard.client.local:3000`.

## Troubleshooting

- **Default branding is shown instead of the client's branding**
  - Check that `clients.white_label_config->>'domain'` matches the `Host` header exactly (no `https://`, no trailing slash, no port).
  - Check that the middleware request reached the Next.js app. Some reverse proxies strip or rewrite the `Host` header.
- **Custom domain returns a 404 or certificate error**
  - Verify the CNAME record with `dig dashboard.client.com` or `nslookup dashboard.client.com`.
  - Confirm that the reverse proxy has a valid TLS certificate for the custom domain.
- **Changes are not reflected immediately**
  - The middleware caches the white-label config in the `x-geolyt-white-label` cookie for 24 hours. Clear cookies or use an incognito window to test updates.
