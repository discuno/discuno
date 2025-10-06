# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The Discuno team and community take security bugs seriously. We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@discuno.com**

If you prefer to submit without logging in, send email to the above address with the subject line "Security Vulnerability Report".

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include

Please include the requested information listed below (as much as you can provide) to help us better understand the nature and scope of the possible issue:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

### Preferred Languages

We prefer all communications to be in English.

## Security Update Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine the affected versions
2. Audit code to find any potential similar problems
3. Prepare fixes for all releases still under maintenance
4. Release new versions as soon as possible

## Security Advisories

Security advisories will be published on the [GitHub Security Advisories page](https://github.com/discuno/discuno/security/advisories) for this repository.

## Automated Security Features

### GitHub Copilot Autofix

This repository is configured with GitHub Copilot Autofix for code scanning:

- **CodeQL Analysis**: Automated security vulnerability detection with AI-powered fix suggestions
- **Trivy Scanning**: Container and dependency vulnerability scanning with autofix capabilities
- **Pull Request Integration**: Automatic fix suggestions appear directly in pull request comments

Copilot Autofix helps identify and resolve security issues automatically by:
1. Detecting security vulnerabilities through CodeQL and other scanning tools
2. Generating fix suggestions using AI-powered analysis
3. Providing actionable recommendations in pull requests
4. Enabling faster security remediation with less manual effort

### Code Scanning Schedule

- **On Push**: Scans run automatically on pushes to `main` and `develop` branches
- **On Pull Requests**: All PRs are scanned before merge
- **Daily Scans**: Scheduled security scans run daily at 3 AM UTC

## Comments on this Policy

If you have suggestions on how this process could be improved please submit a pull request.
