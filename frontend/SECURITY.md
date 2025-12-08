# 🔒 Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.1.x   | ✅ Yes             |
| 2.0.x   | ✅ Yes             |
| < 2.0   | ❌ No              |

## Reporting a Vulnerability

We take the security of SYSME POS seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### 🚨 Please DO NOT:

- ❌ Open a public GitHub issue for the vulnerability
- ❌ Publicly disclose the vulnerability before it has been addressed
- ❌ Exploit the vulnerability beyond what is necessary to demonstrate the issue

### ✅ Please DO:

1. **Email us directly** at: [INSERT SECURITY EMAIL]
   - Subject: `[SECURITY] Brief description of vulnerability`

2. **Include the following information:**
   - Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
   - Full paths of source file(s) related to the vulnerability
   - Location of the affected source code (tag/branch/commit or direct URL)
   - Any special configuration required to reproduce the issue
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the vulnerability, including how an attacker might exploit it

3. **Expected Response Timeline:**
   - **Initial Response:** Within 48 hours
   - **Confirmation:** Within 7 days
   - **Fix Release:** Within 30 days (for critical vulnerabilities, faster)

### 🎁 Vulnerability Disclosure Rewards

While we currently don't offer a bug bounty program, we recognize and appreciate security researchers:

- ✅ Public acknowledgment in our security advisories (if you wish)
- ✅ Credit in the release notes
- ✅ Added to our Hall of Fame
- ✅ Swag/merchandise (for significant findings)

---

## 🛡️ Security Measures Implemented

### Authentication & Authorization

**JWT (JSON Web Tokens):**
- Access tokens: 24-hour expiry
- Refresh tokens: 7-day expiry
- Secure token storage
- Token blacklisting on logout

**Password Security:**
- Bcrypt hashing with 10 rounds
- Minimum password requirements enforced
- Password strength validation
- Account lockout after 5 failed attempts (15-minute lockout)

**Role-Based Access Control (RBAC):**
- 9 predefined roles with granular permissions
- Role hierarchy enforced at API level
- Permission checks on all protected routes
- Least privilege principle applied

### API Security

**Input Validation:**
- Express-validator on all endpoints
- Type checking for all inputs
- Length limits enforced
- Format validation (email, phone, etc.)

**SQL Injection Prevention:**
- Parameterized queries only
- No string concatenation in SQL
- Better-SQLite3 with prepared statements
- Input sanitization

**XSS Protection:**
- Input sanitization on all user-generated content
- Content Security Policy (CSP) headers
- Output encoding
- HTML entity encoding

**CSRF Protection:**
- CSRF tokens for state-changing operations
- SameSite cookie attribute
- Origin verification

**Rate Limiting:**
- 100 requests per minute per IP
- Configurable rate limits per endpoint
- DDoS protection with rate-limiter-flexible
- Exponential backoff on repeated violations

### Infrastructure Security

**HTTPS/TLS:**
- TLS 1.2+ required
- Strong cipher suites only
- HSTS headers enabled
- Certificate pinning recommended

**Security Headers (Helmet.js):**
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- Referrer-Policy: no-referrer

**CORS Configuration:**
- Whitelist of allowed origins
- Credentials handling
- Preflight request support

### Database Security

**Access Control:**
- Database credentials in environment variables only
- No hardcoded credentials
- Principle of least privilege
- Read-only connections where applicable

**Encryption:**
- Database encryption at rest (recommended)
- Sensitive data encryption (credit cards, SSN)
- Password hashing (never plaintext)

**Backup Security:**
- Encrypted backups
- Secure storage location
- Access logs for backup access
- Regular backup testing

### Audit & Monitoring

**Audit Logging:**
- All authentication events logged
- All critical operations logged
- User actions tracked
- Immutable audit trail

**Security Monitoring:**
- Failed login attempt monitoring
- Unusual activity detection
- Error tracking with Sentry (configurable)
- Real-time alerts for suspicious activity

**Logging Best Practices:**
- No sensitive data in logs
- Structured logging format
- Log rotation and retention
- Secure log storage

---

## 🔐 Security Best Practices for Deployment

### Environment Variables

**Never commit sensitive data:**

```bash
# ❌ BAD - Never do this
JWT_SECRET=mysecret123

# ✅ GOOD - Use strong, random secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
```

**Required Security Variables:**

```env
# Generate strong secrets
JWT_SECRET=<generate-with-openssl>
JWT_REFRESH_SECRET=<generate-with-openssl>

# Database
DATABASE_URL=<secure-path>

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Production Deployment Checklist

**Before Going Live:**

- [ ] Change all default passwords (especially admin account)
- [ ] Generate strong JWT secrets
- [ ] Configure CORS for production domains only
- [ ] Enable HTTPS/SSL with valid certificates
- [ ] Set NODE_ENV=production
- [ ] Disable debug logging
- [ ] Configure firewall rules (ports 80, 443, 22 only)
- [ ] Enable rate limiting
- [ ] Set up automated backups
- [ ] Configure monitoring and alerting
- [ ] Review and update security headers
- [ ] Enable audit logging
- [ ] Test disaster recovery procedures
- [ ] Document security procedures
- [ ] Train staff on security policies

### Firewall Configuration

**UFW (Ubuntu):**

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny everything else by default
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable firewall
sudo ufw enable
```

### Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Configure for SSH
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### SSL/TLS Configuration

**Let's Encrypt (Certbot):**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Database Security

**SQLite Security:**

```bash
# Set proper file permissions
chmod 600 database.sqlite

# Restrict directory access
chmod 700 /path/to/database/directory

# Regular backups with encryption
gpg --symmetric --cipher-algo AES256 database.sqlite
```

### Nginx Security Configuration

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Hide nginx version
server_tokens off;

# Limit request size
client_max_body_size 10M;

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20 nodelay;
```

---

## 🚨 Security Incident Response

### If You Discover a Security Issue

1. **Assess the Severity:**
   - Critical: Immediate action required
   - High: Fix within 24 hours
   - Medium: Fix within 7 days
   - Low: Fix in next release

2. **Contain the Issue:**
   - Disable affected functionality if necessary
   - Block malicious IPs
   - Rotate compromised credentials
   - Notify affected users if data breach

3. **Document Everything:**
   - Time of discovery
   - Steps taken
   - Impact assessment
   - Root cause analysis

4. **Report to Maintainers:**
   - Email security team
   - Include all relevant details
   - Provide reproduction steps

5. **Follow Up:**
   - Verify fix implementation
   - Test thoroughly
   - Update documentation
   - Post-mortem review

---

## 🔍 Common Vulnerabilities to Avoid

### SQL Injection

**❌ Vulnerable Code:**

```javascript
// NEVER do this!
const user = await db.get(`SELECT * FROM users WHERE email = '${email}'`);
```

**✅ Secure Code:**

```javascript
// ALWAYS use parameterized queries
const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
```

### XSS (Cross-Site Scripting)

**❌ Vulnerable Code:**

```javascript
// NEVER insert unsanitized user input
element.innerHTML = userInput;
```

**✅ Secure Code:**

```javascript
// ALWAYS sanitize and encode
element.textContent = userInput; // or use DOMPurify
```

### Authentication Bypass

**❌ Vulnerable Code:**

```javascript
// NEVER trust client-provided user IDs
app.get('/api/orders/:userId', (req, res) => {
  const orders = getOrders(req.params.userId);
  res.json(orders);
});
```

**✅ Secure Code:**

```javascript
// ALWAYS use authenticated user ID
app.get('/api/orders', requireAuth, (req, res) => {
  const orders = getOrders(req.user.id); // From JWT token
  res.json(orders);
});
```

### Insecure Direct Object References (IDOR)

**❌ Vulnerable Code:**

```javascript
// NEVER assume the user owns the resource
app.delete('/api/orders/:id', async (req, res) => {
  await deleteOrder(req.params.id);
  res.json({ success: true });
});
```

**✅ Secure Code:**

```javascript
// ALWAYS verify ownership
app.delete('/api/orders/:id', requireAuth, async (req, res) => {
  const order = await getOrder(req.params.id);

  if (order.user_id !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await deleteOrder(req.params.id);
  res.json({ success: true });
});
```

### Mass Assignment

**❌ Vulnerable Code:**

```javascript
// NEVER blindly update with all request data
await db.run('UPDATE users SET ? WHERE id = ?', [req.body, userId]);
```

**✅ Secure Code:**

```javascript
// ALWAYS whitelist allowed fields
const { email, phone } = req.body; // Only allowed fields
await db.run(
  'UPDATE users SET email = ?, phone = ? WHERE id = ?',
  [email, phone, userId]
);
```

---

## 📚 Security Resources

### OWASP Top 10

We follow OWASP Top 10 guidelines:

1. ✅ Broken Access Control - RBAC implemented
2. ✅ Cryptographic Failures - bcrypt, TLS, encryption
3. ✅ Injection - Parameterized queries
4. ✅ Insecure Design - Security by design
5. ✅ Security Misconfiguration - Secure defaults
6. ✅ Vulnerable Components - Regular updates
7. ✅ Authentication Failures - JWT, rate limiting
8. ✅ Software & Data Integrity - Code review, audit logs
9. ✅ Logging & Monitoring Failures - Comprehensive logging
10. ✅ Server-Side Request Forgery - Input validation

### Additional Resources

- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [SQLite Security](https://www.sqlite.org/security.html)

---

## 🔄 Security Update Policy

### Regular Updates

- **Dependencies:** Automated weekly security scans
- **Patches:** Released as needed for vulnerabilities
- **Security Audits:** Quarterly reviews
- **Penetration Testing:** Annual third-party testing (recommended)

### Notification Process

When a security vulnerability is fixed:

1. Security advisory published on GitHub
2. All users notified via release notes
3. Migration guide provided if needed
4. CVE assigned for significant vulnerabilities

---

## 📞 Contact

**Security Team Email:** [INSERT EMAIL]

**PGP Key:** [INSERT PGP KEY OR LINK]

**Response Time:**
- Critical vulnerabilities: Within 24 hours
- High severity: Within 48 hours
- Medium/Low severity: Within 7 days

---

## 🏆 Security Hall of Fame

We thank the following security researchers for responsibly disclosing vulnerabilities:

<!-- This section will be updated as vulnerabilities are reported and fixed -->

*Be the first to help us improve SYSME POS security!*

---

**Last Updated:** November 20, 2025

**Remember:** Security is everyone's responsibility. If you see something, say something.
