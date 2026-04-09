# 🚀 GitHub Deployment Guide

Complete guide to deploy the Emergency Response System to GitHub.

---

## 📋 Prerequisites

1. **GitHub Account** - Create at https://github.com
2. **Git Installed** - Download from https://git-scm.com
3. **Repository Created** - Create on GitHub first

---

## ✅ Step 1: Create a New Repository on GitHub

### Via Web Browser:

1. Go to **https://github.com/new**
2. **Repository name**: `emergency-response-system`
3. **Description**: Real-time emergency response system for Ghana with voice messaging and live tracking
4. **Visibility**: Public (or Private if preferred)
5. **Initialize**: DO NOT check "Add a README" (we already have one)
6. Click **Create Repository**

### Copy the Repository URL
Example: `https://github.com/yourusername/emergency-response-system.git`

---

## 🔧 Step 2: Configure Local Git

### 2A. Set Your Git Identity (if not already done)

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 2B. Verify Git Configuration

```powershell
git config --list
```

---

## 🌐 Step 3: Add Remote Repository

```powershell
cd C:\Users\Jhunea\OneDrive\Desktop\emergency

# Add remote origin (replace URL with your repo)
git remote add origin https://github.com/yourusername/emergency-response-system.git

# Verify remote was added
git remote -v
```

**Output should show:**
```
origin  https://github.com/yourusername/emergency-response-system.git (fetch)
origin  https://github.com/yourusername/emergency-response-system.git (push)
```

---

## 🔐 Step 4: Authentication Setup

### Option A: Using GitHub CLI (Recommended)

```powershell
# Install GitHub CLI
choco install gh -y  # or download from https://cli.github.com

# Authenticate
gh auth login

# Select: HTTPS
# Select: Paste an authentication token
# Generate token at: https://github.com/settings/tokens
```

### Option B: Personal Access Token (Alternative)

1. Go to https://github.com/settings/tokens/new
2. **Token name**: `emergency-response-system-deployment`
3. **Expiration**: 90 days
4. **Scopes**: Check `repo` (all)
5. Click **Generate token**
6. Copy the token (you won't see it again!)

**Use token as password when git prompts:**
```powershell
Username: yourusername
Password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Option C: SSH Key (Advanced)

```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@github.com"

# Display public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: https://github.com/settings/keys
```

---

## 📤 Step 5: Push to GitHub

### First Time Push

```powershell
cd C:\Users\Jhunea\OneDrive\Desktop\emergency

# Set upstream branch
git branch -M main

# Push all commits to GitHub
git push -u origin main
```

**Expected output:**
```
Enumerating objects: 110, done.
Counting objects: 100% (110/110), done.
Delta compression using up to 8 threads
Compressing objects: 100% (98/98), done.
Writing objects: 100% (110/110), ... bytes
...
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

### Verify Upload

Visit: `https://github.com/yourusername/emergency-response-system`

You should see:
- ✅ All files uploaded
- ✅ Commit history visible
- ✅ README.md displayed
- ✅ File count matches

---

## 🔄 Step 6: Continuous Deployment (Optional)

### 6A. Add GitHub Actions for Automated Testing

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: cd backend && npm install
    
    - name: Start backend
      run: cd backend && timeout 5 npm start || true

  frontend:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: cd frontend && npm install
    
    - name: Build frontend
      run: cd frontend && npm run build
```

---

## 📝 Step 7: Add License

Create `LICENSE` file:

```
MIT License

Copyright (c) 2026 Emergency Response System

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

...
```

Push to GitHub:
```powershell
git add LICENSE
git commit -m "Add MIT License"
git push
```

---

## 🚀 Step 8: Production Deployment

### Deploy Frontend to Vercel

```powershell
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

### Deploy Backend to Heroku

```powershell
# Install Heroku CLI
npm i -g heroku

# Login
heroku login

# Create app
heroku create emergency-response-api

# Set environment variables
heroku config:set NEXT_PUBLIC_API_BASE=https://emergency-response-api.herokuapp.com

# Deploy
heroku git:remote -a emergency-response-api
git push heroku main
```

---

## 📊 Step 9: GitHub Repository Settings

### Enable Important Features

1. **Settings → General**
   - ✅ Disable "Allow auto-merge"
   - ✅ Require branches to be up-to-date before merging

2. **Settings → Branch protection rules**
   - Create rule for `main` branch
   - ✅ Require status checks to pass

3. **Settings → Collaborators** (if team)
   - Add team members
   - Set roles (Maintainer, Developer, etc.)

---

## 🏷️ Step 10: Add Tags & Release

```powershell
# Create version tag
git tag -a v1.0.0 -m "Emergency Response System v1.0.0 - Initial Release"

# Push tags
git push origin --tags

# View tags on GitHub:
# https://github.com/yourusername/emergency-response-system/releases
```

---

## 📝 Subsequent Updates

### After Making Changes Locally

```powershell
# Check what changed
git status

# Stage changes
git add .

# Commit with message
git commit -m "Add feature: SMS notifications"

# Push to GitHub
git push origin main
```

### Pull Latest from GitHub

```powershell
git pull origin main
```

---

## 🔍 Troubleshooting

### Problem: "Remote already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/yourusername/emergency-response-system.git
```

### Problem: "Authentication failed"
```powershell
# Clear cached credentials
git config --global --unset credential.helper

# Try again with new token
git push origin main
```

### Problem: "Detached HEAD state"
```powershell
git checkout main
git pull origin main
```

### Problem: "LF/CRLF warnings"
```powershell
git config --global core.autocrlf true
git add .
git commit -m "Fix line endings"
git push
```

---

## ✨ GitHub Features to Use

### 📌 Issues
- Report bugs
- Suggest features
- Track progress

### 🔀 Pull Requests
- Propose changes
- Code review
- Merge into main

### 🗣️ Discussions
- Ask questions
- Share ideas
- Community support

### 📊 Projects
- Track development
- Kanban board
- Roadmap

---

## 🎯 Recommended GitHub Settings

### Branch Protection
```
✅ Require pull request reviews
✅ Require status checks to pass
✅ Require branches to be up to date
✅ Dismiss stale pull request approvals
```

### Collaborators
- Give access to team members
- Set appropriate permissions
- Enable two-factor authentication

### Secrets (for CI/CD)
```
GitHub Settings → Secrets and variables → Actions
```

Add secrets for:
- `VERCEL_TOKEN`
- `HEROKU_API_KEY`
- `DATABASE_URL` (if applicable)

---

## 📚 Useful GitHub URLs

- **Repository**: `https://github.com/yourusername/emergency-response-system`
- **Issues**: `https://github.com/yourusername/emergency-response-system/issues`
- **Pull Requests**: `https://github.com/yourusername/emergency-response-system/pulls`
- **Discussions**: `https://github.com/yourusername/emergency-response-system/discussions`
- **Settings**: `https://github.com/yourusername/emergency-response-system/settings`
- **Releases**: `https://github.com/yourusername/emergency-response-system/releases`

---

## 🎓 Next Steps

1. ✅ Push code to GitHub
2. ✅ Add collaborators
3. ✅ Set up CI/CD pipeline
4. ✅ Deploy to production (Vercel/Heroku)
5. ✅ Monitor with GitHub insights
6. ✅ Create documentation
7. ✅ Build community

---

## 📞 Support

- **GitHub Help**: https://docs.github.com
- **Git Documentation**: https://git-scm.com/doc
- **StackOverflow**: Tag `github`, `git`

---

**Happy deploying! 🚀**

