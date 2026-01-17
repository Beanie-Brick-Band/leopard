## Blog: Session Cookie Domain Limitation

We have a Next server action that sets the session cookie. This only works on the main domain and not on localhost.

### Technical Details

The authentication system uses Better Auth with `crossSubDomainCookies` enabled. In the auth configuration (`packages/backend/convex/auth.ts:48-51`), cookies are set with:

```typescript
advanced: {
  crossSubDomainCookies: {
    enabled: true,
    domain: siteUrl.hostname,
  },
}
```

The `siteUrl` is derived from the `WEB_DEPLOYMENT_URL` environment variable, which points to the production domain (not localhost).

### Why This Happens

- Production cookies are set with a domain attribute like `.example.com`
- Localhost cannot match this domain pattern
- Browser security prevents cross-domain cookie sharing between `localhost` and production domains

### Impact

- Session management works correctly in production across subdomains
- Local development may need separate auth flows or configuration
- Testing auth features locally requires alternative approaches

### Workarounds

For local development:

1. Use production environment for auth testing
2. Configure separate localhost auth settings
3. Use tools like `mkcert` or modify `/etc/hosts` to simulate domains locally
4. Use Arian's tunnel to test under a subdomain on production (this allows the session cookie to work since it shares the same domain)
