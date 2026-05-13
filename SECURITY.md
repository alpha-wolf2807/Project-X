# PROJECT-X — Security Guide

## Environment Variables Security Checklist

### Secrets Rotation Schedule
| Secret | Rotation Frequency | Action |
|--------|-------------------|--------|
| JWT_ACCESS_SECRET | Every 90 days | Update env, restart server |
| JWT_REFRESH_SECRET | Every 180 days | Invalidates all sessions |
| RAZORPAY_KEY_SECRET | As needed | Update in both env + Razorpay dashboard |
| CLOUDINARY_API_SECRET | Every 180 days | Update in Cloudinary console |

### Required Minimum Key Lengths
```
JWT_ACCESS_SECRET  = 64+ characters (random hex/base64)
JWT_REFRESH_SECRET = 64+ characters (different from access!)
COOKIE_SECRET      = 32+ characters

# Generate strong secrets:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Security Headers (Helmet.js)
All responses include:
- `Strict-Transport-Security` — Force HTTPS
- `X-Frame-Options: SAMEORIGIN` — Prevent clickjacking
- `X-Content-Type-Options: nosniff` — Prevent MIME sniffing
- `X-XSS-Protection` — Browser XSS filter
- `Content-Security-Policy` — Allow only trusted sources
- `Referrer-Policy: strict-origin` — Limit referrer info
- `Permissions-Policy` — Restrict browser features

## Rate Limits
| Endpoint | Window | Max Requests |
|----------|--------|-------------|
| Global API | 15 min | 100 |
| Auth endpoints | 15 min | 20 |
| File uploads | 1 hour | 50 |

## OWASP Top 10 Mitigations
1. **Injection** — `express-mongo-sanitize` strips $ and . from inputs
2. **Broken Auth** — JWT + bcrypt, account lockout after 5 attempts
3. **Sensitive Data** — Passwords never returned, OTPs hashed
4. **XXE** — Not applicable (JSON API)
5. **Broken Access Control** — RBAC middleware on every protected route
6. **Security Misconfiguration** — Helmet.js, CORS whitelist
7. **XSS** — `xss-clean`, CSP headers, input sanitization
8. **Insecure Deserialization** — JSON.parse with try-catch
9. **Known Vulnerabilities** — Regular `npm audit` + updates
10. **Logging** — Winston logging of all errors and admin actions

## Razorpay Payment Security
```
Payment verification MUST be server-side:
1. Never trust frontend payment confirmations
2. Always verify HMAC-SHA256 signature with:
   HMAC(razorpay_order_id + "|" + razorpay_payment_id, secret)
3. Use timing-safe comparison (crypto.timingSafeEqual)
4. Webhook signature verification for server-side events
```

## Database Security
```
MongoDB Atlas:
- Enable IP whitelist (restrict to server IPs in production)
- Use strong password for DB user
- Enable encryption at rest
- Regular automated backups
- Audit logging enabled
```

## Production Deployment Checklist
- [ ] All `.env` files excluded from git
- [ ] Strong JWT secrets (64+ chars, randomly generated)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] HTTPS enforced (HSTS header enabled)
- [ ] Rate limiting active
- [ ] Razorpay webhook secret set
- [ ] Cloudinary unsigned upload disabled
- [ ] Error stack traces disabled in production
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] PM2 or container restart policy set
- [ ] Log rotation configured
- [ ] Monitoring/alerting set up
