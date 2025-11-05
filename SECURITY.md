# Security Response Log

## 2025-10-30: Secret Remediation

1. **Stop tracking local env files**
   ```bash
   git rm --cached .env
   echo -e "\n# Environment configuration\n.env\n.env.*" >> .gitignore
   ```

2. **Rewrite history to purge `.env` secrets**  
   _BFG Repo-Cleaner was unavailable in this environment; `git filter-branch` was used instead._
   ```bash
   FILTER_BRANCH_SQUELCH_WARNING=1 \
     git filter-branch --force \
       --index-filter "git rm --cached --ignore-unmatch .env" \
       --prune-empty \
       --tag-name-filter cat -- --all
   rm -rf .git/refs/original
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

3. **Force-push the clean history**
   ```bash
   git push --force-with-lease origin main
   git push --force-with-lease origin --tags
   ```

4. **Rotate exposed credentials**
   - Regenerate all values ever stored in `.env` (admin credentials, Resend key, AWS/R2 keys, etc.).
   - Immediately update the secrets in Vercel (frontend) and the backend host.
   - Redeploy both services after updating environment variables.

5. **Verification**
   - Confirm `.env` is no longer tracked (`git ls-files .env` should return nothing).
   - Spot-check the rewritten history (`git log -- .env` should be empty).
   - Validate fresh deployments by hitting `/health` on the API and ensuring the Vercel build picks up the new env values.

> **Reminder:** Any collaborator must re-clone or run `git fetch --all --prune && git reset --hard origin/main` after this rewrite.
