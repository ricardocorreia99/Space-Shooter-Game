# 🚀 Retro Space Shooter — Mobile Installation Guide

## What is this?

This game is a **Progressive Web App (PWA)** — it can be installed on any phone (Android & iOS) directly from a web link, without needing the Play Store or App Store.

Once installed, it:
- ✅ Appears on your home screen with an app icon
- ✅ Runs fullscreen like a native app
- ✅ Works offline (after first load)
- ✅ Has touch controls optimized for mobile
- ✅ No app store fees or approval process needed

---

## 🌐 Step 1: Host the Game Online (Free Options)

You need to put the game files on a web server with HTTPS. Here are free options:

### Option A: GitHub Pages (Recommended — Free & Easy)

1. **Create a GitHub repository** (or use your existing one)
2. **Push the `space_shooter_game` folder** to the repo:
   ```bash
   cd /path/to/your/repo
   git add space_shooter_game/
   git commit -m "Add space shooter PWA"
   git push origin main
   ```
3. **Enable GitHub Pages:**
   - Go to your repo on GitHub → Settings → Pages
   - Source: Deploy from a branch → `main` → `/root` (or select the folder)
   - Click Save
4. **Your game will be live at:**
   ```
   https://YOUR-USERNAME.github.io/YOUR-REPO/space_shooter_game/
   ```

### Option B: Netlify (Drag & Drop — Free)

1. Go to [netlify.com](https://netlify.com) and sign up
2. Drag the entire `space_shooter_game` folder onto the deploy area
3. Done! You'll get a URL like `https://random-name.netlify.app`

### Option C: Vercel (Free)

1. Install Vercel CLI: `npm i -g vercel`
2. Run in the game folder:
   ```bash
   cd space_shooter_game
   vercel
   ```
3. Follow prompts — you'll get a live URL

### Option D: Firebase Hosting (Free tier)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting  # Select space_shooter_game as public dir
firebase deploy
```

---

## 📱 Step 2: Install on Your Phone

### Android:

1. Open the game URL in **Chrome**
2. You'll see a banner saying "Add to Home Screen" or an install prompt
3. If not, tap the **⋮ menu** → **"Install app"** or **"Add to Home screen"**
4. The game icon appears on your home screen!
5. Open it — it runs fullscreen like a native app

### iPhone/iPad:

1. Open the game URL in **Safari**
2. Tap the **Share button** (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"**
5. The game icon appears on your home screen!

---

## 📲 Step 3: Share with Others

Simply share the URL! Anyone who visits it can install the game on their phone.

Example sharing message:
> 🎮 Try my retro space shooter game! Install it on your phone:
> https://your-url-here.github.io/space_shooter_game/

---

## 🎮 Mobile Controls

The game automatically detects mobile devices and shows touch controls:

| Control | Action |
|---------|--------|
| ◀ ▶ buttons | Move left/right |
| 🔥 button (hold) | Auto-fire |
| ⏳ 🔥 🌀 buttons | Activate ultimate abilities |
| ⏸ button | Pause game |

---

## 🔧 Generating PNG Icons (Optional)

The game uses SVG icons which work on most modern devices. If you need PNG icons:

1. Open `generate-icons.html` in a browser
2. Click "Generate Icons"
3. Download each icon and place in the `icons/` folder
4. Update `manifest.json` to reference `.png` instead of `.svg`

---

## 🔒 Security & HTTPS

PWAs **require HTTPS** to work (for service workers and install prompts). All the free hosting options above provide HTTPS automatically.

If self-hosting:
- Use Let's Encrypt for free SSL certificates
- Or use Cloudflare as a proxy (free HTTPS)

---

## 📁 File Structure

```
space_shooter_game/
├── index.html          # Main game page (PWA-enabled)
├── game.js             # Game logic
├── manifest.json       # PWA manifest (app name, icons, etc.)
├── sw.js               # Service worker (offline support)
├── generate-icons.html # Tool to generate PNG icons
├── DEPLOY.md           # This file
└── icons/
    ├── generate.js     # Node.js icon generator
    ├── icon-72.svg
    ├── icon-96.svg
    ├── icon-128.svg
    ├── icon-144.svg
    ├── icon-152.svg
    ├── icon-192.svg
    ├── icon-384.svg
    └── icon-512.svg
```

---

## 🚀 Quick Deploy (Fastest Method)

If you have the GitHub CLI installed:

```bash
# From the repo root
gh repo create space-shooter --public --source=. --push
# Then enable Pages in repo settings
```

Or use Netlify's drag-and-drop at [app.netlify.com/drop](https://app.netlify.com/drop)

---

## ❓ FAQ

**Q: Do I need a developer account?**
A: No! PWAs don't require any app store account.

**Q: Does it cost money?**
A: No! All hosting options listed are free.

**Q: Will it work offline?**
A: Yes! After the first visit, the service worker caches everything.

**Q: Can I update the game?**
A: Yes! Just push new code to your hosting. Users will get the update on next visit.

**Q: Does it work on both Android and iPhone?**
A: Yes! PWAs work on both platforms.

**Q: How do I remove it from my phone?**
A: Long-press the icon → Uninstall/Remove (same as any app).
