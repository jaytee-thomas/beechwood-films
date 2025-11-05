# Security Response Log

## 2025-10-30: Secret Remediation (BFG Rewrite)

1. **Ensure `.env` stays local**
   ```bash
   # Only needed if .env is not already ignored
   printf "\n# Environment configuration\n.env\n.env.*\n" >> .gitignore
   git rm --cached .env || true
   ```
   Verify the file is gone from the index: `git ls-files .env` should return nothing.

2. **Purge every `.env` blob with BFG Repo-Cleaner**
   ```bash
   curl -LO https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
   java -jar bfg-1.14.0.jar --no-blob-protection --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```
   Run the commands outside of restricted environments so BFG can download and execute. Confirm `git log -- .env` is empty afterwards.

3. **Force-push the rewritten history**
   ```bash
   git push --force-with-lease origin main
   git push --force-with-lease origin --tags
   ```
   All collaborators must re-clone or run `git fetch --all --prune && git reset --hard origin/main`.

4. **Rotate every secret exposed in `.env`**
   - Generate fresh values for app admin credentials, Resend API key, AWS/R2 keys, and anything else ever stored in `.env`.
   - Update Vercel project environment variables (Production, Preview, Development) and the backend deployment host.
   - Redeploy both services once the new secrets are in place.

5. **Validation checklist**
   - Confirm `.env` no longer appears in Git history.
   - Run smoke tests against the redeployed backend (`GET /health`) and verify the Vercel build reads the new configuration.
   - Audit third-party dashboards (Resend, AWS, etc.) to ensure old keys are revoked.
