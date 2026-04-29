# 💰 FinFlow Pro

> A modern personal finance management app built with React, TypeScript, Firebase, and Gemini AI.

FinFlow Pro helps you track income and expenses, manage budgets, set financial goals, and get AI-powered insights — all in one clean, responsive dashboard.

---

## ✨ Features

- **Dashboard** — Overview of balance, income, expenses, and upcoming bills
- **Transactions** — Log and categorize income & expense transactions
- **Budgets** — Set monthly budgets per category and track progress
- **Goals** — Create savings goals and monitor progress over time
- **Recurring Bills** — Track recurring subscriptions and payments
- **Reports** — Visual charts and analytics for your financial data
- **AI Insights** — Gemini AI analyzes your transactions and provides actionable financial tips
- **Export** — Download reports as PDF or Excel
- **Shared Dashboard** — Share your financial summary with others
- **Authentication** — Secure login with Firebase Auth (email verified)
- **Firestore Security** — Per-user data isolation with strict Firestore rules

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| Backend / Server | Express.js + tsx |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| AI | Google Gemini API (`@google/genai`) |
| Charts | Recharts |
| Animations | Motion (Framer Motion) |
| Export | jsPDF, ExcelJS |
| Routing | React Router v7 |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A [Firebase](https://firebase.google.com/) project (Firestore + Authentication enabled)
- A [Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/finflow-pro.git
cd finflow-pro
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root of the project:

```env
GEMINI_API_KEY=your_gemini_api_key_here
APP_URL=http://localhost:3000
```

### 4. Configure Firebase

Update `src/lib/firebase.ts` with your Firebase project credentials (find them in your Firebase Console under Project Settings).

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build for Production

```bash
npm run build
```

The output will be in the `dist/` folder. The Express server (`server.ts`) serves the built files in production mode.

---

## ☁️ Deploy on Render

1. Push your code to a GitHub repository
2. Go to [render.com](https://render.com) and click **New → Web Service**
3. Connect your GitHub repo
4. Use the following settings:

| Setting | Value |
|---|---|
| Build Command | `npm install && npm run build` |
| Start Command | `node --import tsx/esm server.ts` |
| Environment | Node |

5. Add the following environment variables in the Render dashboard:

```
GEMINI_API_KEY=your_gemini_api_key_here
APP_URL=https://your-app-name.onrender.com
NODE_ENV=production
```

6. Click **Deploy** — your app will be live at `https://your-app-name.onrender.com`

---

## 🔒 Firestore Security Rules

This project includes strict Firestore security rules (`firestore.rules`) that:

- Deny all access by default
- Require email-verified authentication
- Only allow users to read/write their own data

Deploy the rules using the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

---

## 📁 Project Structure

```
finflow-pro/
├── src/
│   ├── components/
│   │   └── Layout.tsx          # App shell with sidebar navigation
│   ├── pages/
│   │   ├── Dashboard.tsx       # Main overview page
│   │   ├── Transactions.tsx    # Transaction log
│   │   ├── Budgets.tsx         # Budget management
│   │   ├── Goals.tsx           # Savings goals
│   │   ├── Recurring.tsx       # Recurring bills
│   │   ├── Reports.tsx         # Charts & analytics
│   │   ├── Settings.tsx        # User settings
│   │   ├── Auth.tsx            # Login / signup
│   │   └── SharedDashboard.tsx # Public share view
│   ├── services/
│   │   ├── geminiService.ts    # Gemini AI integration
│   │   └── exportService.ts    # PDF & Excel export
│   ├── lib/
│   │   └── firebase.ts         # Firebase config & helpers
│   ├── App.tsx                 # Root component & routing
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── server.ts                   # Express server (dev + prod)
├── firestore.rules             # Firestore security rules
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
├── .env.example                # Example environment variables
└── package.json
```

---

## 📝 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Type-check with TypeScript |

---

## 🤝 Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [Apache 2.0 License](LICENSE).

---

<div align="center">
  Made with ❤️ using React, Firebase & Gemini AI
</div>
