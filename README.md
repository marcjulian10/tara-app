# 💜 Tara — Your Saving Partner

> An AI-powered couples savings app that helps partners set shared goals, track contributions, and grow together financially — in real time.

![Tara App](https://img.shields.io/badge/Status-Active-brightgreen) ![Firebase](https://img.shields.io/badge/Backend-Firebase-orange) ![Node.js](https://img.shields.io/badge/Server-Node.js-green) ![Claude AI](https://img.shields.io/badge/AI-Claude%20by%20Anthropic-blueviolet)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Authentication** | Secure email/password login & sign-up via Firebase Auth |
| ☁️ **Real-time Sync** | All data synced instantly across devices using Firestore |
| 💑 **Partner Pairing** | Invite your partner via QR code or shareable link |
| 🎯 **Goal Management** | Create, edit, delete, and complete shared savings goals |
| 💰 **Contribution Tracking** | Track how much each partner has contributed per goal |
| 🏆 **Achievements History** | Completed goals are preserved in a dedicated History tab |
| 💬 **AI Chat (Tara)** | Ask your AI saving partner for financial advice via Claude |
| 💱 **Currency Converter** | Live exchange rates for multi-currency planning |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A [Firebase](https://console.firebase.google.com/) project with **Authentication** (Email/Password) and **Firestore** enabled
- API keys for [Anthropic](https://console.anthropic.com/), [Pexels](https://www.pexels.com/api/), and [ExchangeRate-API](https://www.exchangerate-api.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/marcjulian10/tara-app.git
   cd tara-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```

   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   PEXELS_API_KEY=your_pexels_api_key_here
   EXCHANGERATE_API_KEY=your_exchangerate_api_key_here
   PORT=3000
   ```

4. **Configure Firebase**

   Update `public/firebase.js` with your Firebase project configuration:
   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

5. **Run the app**
   ```bash
   node server.js
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗂️ Project Structure

```
tara-app/
├── public/
│   ├── index.html      # Main app HTML — views, modals, nav
│   ├── app.js          # All client-side logic (Firebase, UI, events)
│   ├── firebase.js     # Firebase initialization & exports
│   └── style.css       # Glassmorphism dark theme styles
├── server.js           # Express server — API routes for AI, Pexels, exchange rate
├── .env                # Secret keys (not committed)
├── .env.example        # Template for required environment variables
└── package.json
```

---

## 🔗 Partner Pairing Flow

1. **Partner A** logs in and clicks **"Invite Partner"** in the sidebar.
2. A **QR Code** and a **shareable link** are generated (e.g. `http://localhost:3000?join=<coupleId>`).
3. **Partner B** scans the code or opens the link, then logs in or signs up.
4. Both partners are now connected to the **same Firestore couple workspace** — any change made by one is instantly visible to the other.

---

## 🤖 AI Chat — Tara

Tara is powered by **Claude (Anthropic)** and has full context of your couple's goals, income, and savings rate. Ask her anything:

- *"How long until we reach our Honeymoon goal?"*
- *"What savings rate do you recommend for us?"*
- *"Give us a weekly saving plan."*

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML, CSS (Glassmorphism), JavaScript (ES Modules)
- **Backend**: Node.js + Express
- **Database**: Firebase Firestore (real-time)
- **Auth**: Firebase Authentication
- **AI**: Anthropic Claude API
- **Images**: Pexels API (goal cover photos)
- **Currency**: ExchangeRate-API
- **QR Code**: qrcode.js

---

## 📄 License

MIT © [Marc Julian](https://github.com/marcjulian10)
