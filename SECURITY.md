# Security Policy

## Supported Versions

We provide security updates for the latest version of the project.

## Reporting a Vulnerability

If you discover a security vulnerability, please **DO NOT** open a public issue. Instead:

1. Email the maintainers directly
2. Provide detailed information about the vulnerability
3. Allow time for the issue to be addressed before public disclosure

## Security Best Practices

### For Users

- **Never commit `.env` files** - Always use environment variables
- **Use strong JWT secrets** - Generate secure random strings
- **Keep dependencies updated** - Regularly run `npm audit`
- **Use HTTPS in production** - Never expose API endpoints over HTTP
- **Implement rate limiting** - Protect against brute force attacks
- **Regular backups** - Backup your database regularly

### For Developers

- Review all dependencies for security vulnerabilities
- Use parameterized queries (already implemented via Drizzle ORM)
- Validate all user inputs
- Implement proper authentication and authorization
- Keep sensitive data out of logs
- Use secure password hashing (bcrypt is already implemented)

## Known Security Considerations

- JWT tokens are stored in localStorage (consider httpOnly cookies for production)
- CORS is configured but should be reviewed for production
- File uploads are validated but additional scanning may be needed
- Database connections should use SSL in production

## Security Checklist for Deployment

- [ ] All `.env` files are excluded from version control
- [ ] Strong JWT secret is set
- [ ] Database uses SSL connection
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented
- [ ] HTTPS is enabled
- [ ] Regular security audits are performed
- [ ] Dependencies are up to date
