# BeechwoodFilms Deployment Checklist

Quick manual checks before deploying to production.

---

## Pre-Deployment Checks

### 1. Code Quality
- [ ] All code changes committed and pushed to GitHub
- [ ] No console.log() statements left in production code
- [ ] No commented-out code blocks
- [ ] Environment variables are set (not hardcoded)

### 2. Run Automated Tests
```bash
# Make script executable (first time only)
chmod +x smoke-test.sh

# Run smoke tests
./smoke-test.sh
```
- [ ] All smoke tests pass

### 3. Backend (Railway)
- [ ] Backend deployment successful in Railway dashboard
- [ ] Check Railway logs for errors: [Railway Dashboard](https://railway.app)
- [ ] Environment variables are set:
  - [ ] `DATABASE_URL`
  - [ ] `REDIS_URL`
  - [ ] `CLIENT_ORIGIN`
  - [ ] `ADMIN_EMAIL` & `ADMIN_PASSWORD`
- [ ] Test: `https://api.beechwoodfilms.org/health` returns `{"status":"ok"}`

### 4. Frontend (Vercel)
- [ ] Frontend deployment successful in Vercel dashboard
- [ ] Check Vercel deployment logs: [Vercel Dashboard](https://vercel.com)
- [ ] Environment variables are set:
  - [ ] `VITE_API_ORIGIN=https://api.beechwoodfilms.org`
- [ ] Test: `https://www.beechwoodfilms.org` loads without errors

### 5. Manual Smoke Test (5 minutes)

#### Public User Flow
- [ ] Visit homepage - loads correctly
- [ ] Click "Library" - videos display
- [ ] Click a video - video plays
- [ ] Try "Continue as Guest" - works
- [ ] Browse as guest - can see content

#### Registered User Flow
- [ ] Register new account - creates account
- [ ] Login with new account - works
- [ ] Add video to favorites - saves
- [ ] Refresh page - favorite persists
- [ ] Logout - clears session

#### Admin Flow
- [ ] Login as admin: `jt.aws.cloud@protonmail.com`
- [ ] Visit `/admin/jobs` - loads without JSON errors
- [ ] Check job queue - jobs display (26 total as of last check)
- [ ] SSE shows "connected" - real-time updates work
- [ ] Upload button visible - admin features accessible

### 6. Browser Compatibility (Quick Check)
- [ ] Chrome - works
- [ ] Safari/iPhone - works (check on phone)
- [ ] Firefox - works (optional but recommended)

### 7. Performance Check
- [ ] Open DevTools → Network tab
- [ ] Refresh homepage
- [ ] Page loads in < 3 seconds
- [ ] No failed requests (all 200 or 304 status)

### 8. Error Monitoring
- [ ] Open DevTools → Console
- [ ] Browse site for 1 minute
- [ ] No red errors in console (warnings are OK)

---

## Post-Deployment Verification

After deploying, verify:

- [ ] Run `./smoke-test.sh` again - all tests pass
- [ ] Visit site from a different device/network - works
- [ ] Check Railway/Vercel dashboards - no errors or crashes
- [ ] Monitor for 5 minutes - no immediate issues

---

## If Something Breaks

### Quick Rollback (Vercel)
1. Go to [Vercel Dashboard](https://vercel.com)
2. Click on your project → "Deployments"
3. Find the last working deployment
4. Click "..." → "Promote to Production"

### Quick Rollback (Railway)
1. Go to [Railway Dashboard](https://railway.app)
2. Click on your backend service → "Deployments"
3. Find the last working deployment
4. Click "Redeploy"

### Debug Checklist
- [ ] Check Railway logs for backend errors
- [ ] Check Vercel logs for frontend errors
- [ ] Check browser console for frontend errors
- [ ] Verify environment variables are correct
- [ ] Test API endpoints directly with `curl`

---

## Notes

**Last Successful Deploy:** [Date/Time]  
**Deployed By:** [Your Name]  
**Git Commit:** [Commit SHA]  
**Issues Found:** [None / List any issues]

---

## Quick Commands Reference

```bash
# Test backend health
curl https://api.beechwoodfilms.org/health

# Test Redis
curl https://api.beechwoodfilms.org/api/health/redis

# Test videos API
curl https://api.beechwoodfilms.org/api/videos

# Run full smoke test
./smoke-test.sh

# Check git status
git status

# View recent commits
git log --oneline -5

# Push to deploy
git push
```

---

## Success Criteria

✅ **Ready to Deploy if:**
- All automated tests pass
- All manual checks pass
- No console errors
- Page loads quickly
- Admin panel works

❌ **DO NOT Deploy if:**
- Any smoke tests fail
- Console shows red errors
- Admin panel broken
- Videos don't play
- Authentication broken
