# 🚀 DuoDeceit — Free Online Deployment Guide

This guide walks you through deploying **DuoDeceit** online completely **for free** so your friends can play from anywhere in the world on their smartphones, tablets, or computers without installing anything.

---

## 🌟 Method 1: Render.com (Recommended — 100% Free & Simplest)

**Render** allows you to host the entire game (both React frontend and Node.js WebSocket backend) in a single service with zero configuration, SSL (HTTPS), and automatic updates every time you push to GitHub.

### Step-by-Step Instructions:

1. **Sign Up / Log In**:
   - Go to [render.com](https://render.com) and click **"Get Started"** or **"Sign In"** using your **GitHub** account.

2. **Create New Web Service**:
   - In the Render dashboard, click the **"New +"** button at the top right and select **"Web Service"**.
   - Choose **"Build and deploy from a Git repository"** and click **Next**.
   - Select your repository: **`hobbynot/DuoDeceit`** (if not visible, click *Configure account* to grant access to the repo).

3. **Configure Service Settings**:
   Fill in the fields exactly as follows:
   - **Name**: `duodeceit` *(or any custom name; this becomes your URL)*
   - **Region**: Choose the region closest to you (e.g., *Singapore*, *Frankfurt*, *Oregon*, *Ohio*)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: Select **"Free"** ($0/month)

4. **Deploy**:
   - Scroll to the bottom and click **"Deploy Web Service"**.
   - Render will automatically:
     1. Clone your GitHub repository.
     2. Install dependencies.
     3. Build the shared types, Node.js server, and React client.
     4. Start the server on a public HTTPS URL.

5. **Play!**:
   - Once the build log says `[DuoDeceit Server] Running on http://0.0.0.0:3001`, copy your live URL (e.g. `https://duodeceit.onrender.com`).
   - Share this link with friends!

> [!NOTE]  
> **Render Free Tier Spin-Down**: Free services on Render automatically go to sleep after 15 minutes of inactivity. When someone opens the link after it's slept, it will take ~30–50 seconds to wake up. Once awake, gameplay and WebSockets run with ultra-low latency.

---

## ⚡ Method 2: Koyeb (Free Tier with No Spin-Down)

If you prefer a service that does not sleep on the free tier, **Koyeb** offers a free nano instance.

1. Sign up at [koyeb.com](https://www.koyeb.com) using GitHub.
2. Click **"Create App"** -> **"GitHub"**.
3. Select `hobbynot/DuoDeceit`.
4. Choose **Buildpack** (Node.js).
5. Build Command: `npm run build`
6. Run Command: `npm start`
7. Port: `3001` (HTTP).
8. Click **"Deploy"**.

---

## 🌐 Method 3: Split Deployment (Vercel Frontend + Render Backend)

If you want the frontend hosted on **Vercel**'s edge network and the WebSocket server on **Render**:

### A. Deploy Backend to Render:
1. Follow Method 1 above, but set:
   - Build Command: `npm run build --workspace=shared && npm run build --workspace=server`
   - Start Command: `npm run start --workspace=server`
2. Copy your backend URL: e.g. `https://duodeceit-backend.onrender.com`.

### B. Deploy Frontend to Vercel:
1. Go to [vercel.com](https://vercel.com) and import `hobbynot/DuoDeceit`.
2. Configure Project:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add **Environment Variable**:
   - Key: `VITE_SERVER_URL`
   - Value: `https://duodeceit-backend.onrender.com` *(your backend URL)*
4. Click **"Deploy"**.

---

## 📱 Method 4: Local Party Mode (Zero Hosting Required)

You can play in the same room using Wi-Fi or phone hotspot without deploying to the cloud:

1. Connect your computer and all players' phones to the **same Wi-Fi** or **Mobile Hotspot**.
2. Run on your computer:
   ```bash
   npm run dev
   ```
3. Vite will output your local network address:
   ```text
   ➜  Network: http://192.168.x.x:5173/
   ```
4. Everyone opens that address in their phone browser (Safari, Chrome, etc.). No installation required!

---

## 🛠️ Verification & Health Check

You can test if your deployed server is running at any time by visiting:
```text
https://<your-deployed-app-url>/health
```
It will return:
```json
{ "status": "ok", "time": "2026-09-19T..." }
```
