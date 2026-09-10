# RouteMind AI — Personal Intelligent Navigation Assistant

An intelligent personal navigation assistant that analyzes live traffic congestion, road conditions, construction bottlenecks, and multi-factor safety criteria to recommend the fastest, safest, and most suitable routes.

## 🚀 Live Demo & Features

- **Coimbatore Local Navigation**: Real-time corridor routing across Gandhipuram, RS Puram, Ukkadam, Peelamedu, Singanallur, Saravanampatti, Coimbatore International Airport (CJB), Railway Station, etc.
- **Inter-District Travel**: Regional routing across Tamil Nadu expressways (Coimbatore $\to$ Chennai, Salem, Erode, Tiruppur, Ooty, Madurai, Bengaluru).
- **Practical AI Multi-Criteria Scoring**: Weighted Multi-Attribute Decision Analysis (MCDA) evaluating Travel Time, Live Congestion, Safety Risk, Road Surface Quality, and Distance.
- **Dynamic Priorities**: ⚡ Fastest, 🛡 Safest, 📏 Shortest, ⚖ Balanced, ⛽ Fuel Efficient.
- **Live Location Tracking**: Real browser GPS geolocation with accuracy circle, heading, and speed indicator.
- **Active Navigation HUD**: Turn-by-turn maneuvers, dynamic arrival ETA, and intelligent live re-routing alerts when traffic spikes.
- **Academic AI Matrix Defense Center**: Interactive modal with tunable weight sliders and normalized candidate scoring comparison matrix.
- **Google Maps Integration & Zero-Setup Fallback**: Seamless Google Maps JS Platform client with integrated high-resolution vector map fallback.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide Icons
- **Mapping**: Google Maps JavaScript Platform SDK + Leaflet / CartoDB tiles
- **Decision Engine**: Custom Multi-Criteria Decision Analysis (MCDA) in TypeScript
- **Storage**: Browser `localStorage` for Saved Places, Preferences, and Trip History

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Production Build
```bash
npm run build
```
The output will be generated in the `dist/` directory, ready to deploy to GitHub Pages, Vercel, Netlify, or Cloudflare Pages.

---

## 🌐 Deploy to GitHub Pages

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: RouteMind AI Navigation System"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY>.git
   git push -u origin main
   ```

2. Go to your repository on GitHub $\to$ **Settings** $\to$ **Pages**.
3. Under **Build and deployment**, select **GitHub Actions** or set source to deploy from the `/dist` folder.
