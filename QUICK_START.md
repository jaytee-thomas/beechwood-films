# Quick Start: Testing Setup

**Time to complete:** 5 minutes

---

## Step 1: Download These Files

You should have downloaded these 4 files:
1. `smoke-test.sh` - Automated test script
2. `DEPLOYMENT_CHECKLIST.md` - Manual checklist
3. `TESTING.md` - Testing guide
4. `IDE_INTEGRATION.md` - How to work with Claude

---

## Step 2: Add Files to Your Project

```bash
# Open your terminal in your project folder
cd /path/to/beechwood-films-main

# Move the downloaded files here (adjust path as needed)
# If you downloaded to ~/Downloads:
mv ~/Downloads/smoke-test.sh ./
mv ~/Downloads/DEPLOYMENT_CHECKLIST.md ./
mv ~/Downloads/TESTING.md ./
mv ~/Downloads/IDE_INTEGRATION.md ./

# Make smoke test executable
chmod +x smoke-test.sh
```

---

## Step 3: Test It Works

```bash
# Run the smoke test
./smoke-test.sh
```

**Expected result:** All tests should pass (green checkmarks) ✓

If you see errors, that's OK - we'll fix them together!

---

## Step 4: Commit to Git

```bash
# Check what's changed
git status

# Add the new files
git add smoke-test.sh DEPLOYMENT_CHECKLIST.md TESTING.md IDE_INTEGRATION.md

# Commit with a message
git commit -m "Add smoke tests and deployment checklist"

# Push to GitHub
git push
```

---

## Step 5: You're Done! 🎉

Now before every deploy, just run:

```bash
./smoke-test.sh
```

If it's green → deploy!  
If it's red → fix the issues first.

---

## What You Got

### ✅ Automated Testing
- Quick health checks for backend/frontend
- Runs in 5 seconds
- Catches obvious issues

### ✅ Deployment Safety
- Checklist to follow before deploying
- Prevents "oh crap" moments
- Professional practice

### ✅ Documentation
- How to test
- How to work with Claude
- Quick reference commands

---

## Next Steps

After you commit these files, we can:

1. **Run a quick smoke test** to verify everything works
2. **Start building P1 features** (contact form, SEO, mobile polish)
3. **Use these tests** before every deploy from now on

Ready to move forward? 🚀

---

## Need Help?

Just ask me in our Claude chat! That's what I'm here for. 😊

**Common issues:**

### "Permission denied" when running smoke-test.sh
```bash
chmod +x smoke-test.sh
```

### "Command not found: curl"
On Mac/Linux, curl is pre-installed. If missing:
```bash
# Mac
brew install curl

# Ubuntu/Debian
sudo apt-get install curl
```

### Tests fail
That's OK! Share the output with me and we'll debug together.
