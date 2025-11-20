# Testing & Deployment

Quick reference for testing and deploying BeechwoodFilms.

## Quick Start

### Run Smoke Tests (Automated)
```bash
# Make script executable (first time only)
chmod +x smoke-test.sh

# Run all tests
./smoke-test.sh
```

This will automatically test:
- ✅ Backend health
- ✅ Database connection
- ✅ Redis connection
- ✅ API endpoints
- ✅ Frontend pages

**Green = All Good** ✓  
**Red = Something's Broken** ✗

---

## Manual Testing

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for the full manual checklist.

**Quick 2-Minute Check:**
1. Run `./smoke-test.sh`
2. Visit https://www.beechwoodfilms.org
3. Login as admin
4. Check admin panel

If all work → you're good to deploy! 🚀

---

## When to Run Tests

### Always Run Before:
- Deploying to production
- Merging to main branch
- Making infrastructure changes

### Run After:
- Deploying (to verify success)
- Changing environment variables
- Database migrations

---

## Environment Variables Needed

### Backend (Railway)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
CLIENT_ORIGIN=https://www.beechwoodfilms.org
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-secure-password
PORT=8080
```

### Frontend (Vercel)
```
VITE_API_ORIGIN=https://api.beechwoodfilms.org
```

---

## Troubleshooting

### Smoke Tests Fail
1. Check if services are running (Railway/Vercel dashboards)
2. Verify environment variables are set
3. Check logs for errors

### Can't Run `smoke-test.sh`
```bash
# Make it executable
chmod +x smoke-test.sh

# Try running with bash explicitly
bash smoke-test.sh
```

### Tests Pass But Site Broken
- Clear browser cache
- Check browser console (F12) for errors
- Try incognito/private window
- Check from different device

---

## Adding New Tests

Edit `smoke-test.sh` and add:

```bash
# Test a new endpoint
test_endpoint "My Feature" "$BACKEND_URL/api/my-feature" 200

# Test a JSON endpoint
test_json_endpoint "My API" "$BACKEND_URL/api/data" "expected_key"
```

---

## CI/CD Integration (Future)

When you're ready to automate this in GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Smoke Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run smoke tests
        run: ./smoke-test.sh
```

But for now, running manually is perfectly fine! 👍
