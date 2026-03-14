# NewsAlpha

**Predicting Market Direction Using Distributed Sentiment Analysis of Financial News**

CS 179G Senior Design Project · Group 7 · University of California, Riverside · 2026

---

## About

NewsAlpha is a web application built to visualize and explore the relationship between news sentiment and S&P 500 sector ETF performance. The project analyzes 252,187 articles from 16 news sources across 12 market sectors, using VADER sentiment scoring and Apache Spark for distributed processing.

The application features five pages:

- **Home** — Project overview with sector cards showing dataset share, prediction accuracy, correlation, and trading days for each of the 12 ETFs
- **Analysis** — Interactive dashboard with dropdowns for news source, news sector, and market sector. Features a price chart with prediction accuracy overlay, an RSI-style sentiment indicator, and separate sentiment/return bar charts
- **Paper** — Research findings presented in an editorial layout with inline charts and data tables covering same-day prediction, next-day lagged analysis, source reliability, cross-sector effects, and volatility analysis
- **AI Analyst** — Natural language to SQL interface powered by Google Gemini via LangChain. Ask questions about the dataset in plain English and get answers with auto-generated charts
- **About** — Team member profiles with individual contributions

## Key Findings

| Metric | Value |
|---|---|
| Articles Analyzed | 252,187 |
| Sector ETFs | 12 |
| Matched Trading Days | 10,810 |
| Overall Prediction Accuracy | 51.6% |
| Overall Sentiment-Return Correlation | 0.011 |

- Consumer Discretionary (XLY) achieves the highest reliable same-day prediction accuracy at 53.9% with 1,085 trading days
- International Business Times is the most genuinely predictive source at 57.1% accuracy
- XLY and XLV show improved next-day accuracy, suggesting delayed market effects in consumer and health sectors
- Real Estate (XLRE) exhibits nonlinear volatility responses to sentiment, consistent with loss aversion theory

## Tech Stack

### Frontend

- **React 18** with TypeScript
- **Vite** (SWC configuration) for bundling and dev server
- **React Router v6** for client-side routing
- **Recharts** for the AI Analyst page chart rendering
- **CSS** with custom properties / CSS variables (no UI framework — all custom styling)
- **Google Fonts** — DM Sans (body), JetBrains Mono (code/data), Instrument Serif (headings)

### Backend

- **Node.js** with **Express** API server
- **MySQL** database for persistent storage
- **mysql2** driver with connection pooling
- **LangChain** + **Google Gemini** (gemini-2.5-flash) for the AI Analyst natural language to SQL feature
- **CORS** enabled for local development (frontend on port 5173, backend on port 3001)

### Data Pipeline (Part 1 & 2)

- **Apache Spark 3.5.8** with Hadoop 3 for distributed processing
- **VADER** (Valence Aware Dictionary and sEntiment Reasoner) for sentiment scoring
- **PySpark** for sector mapping, daily aggregation, and correlation analysis
- **Yahoo Finance** for historical ETF price data (2012–2024)
- **SQLite** used during pipeline development, migrated to MySQL for the web interface

## Getting Started

### Prerequisites

- **Node.js** (v18 or later) — [Download](https://nodejs.org/)
- **MySQL 8.0** — [Download](https://dev.mysql.com/downloads/installer/)
- **Git** — [Download](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/edsng/NewsAlpha.git
cd NewsAlpha
```

### 2. Install Frontend Dependencies

```bash
npm install
```

This installs React, Vite, TypeScript, React Router, Recharts, and all other frontend packages.

### 3. Set Up MySQL Database

Make sure MySQL is running, then create the database and import the data:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS newsalpha;"
mysql -u root -p newsalpha < server/data/newsalpha.sql
```

> **Note:** If `mysql` is not in your PATH on Windows, use the full path:
> ```powershell
> & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql" -u root -p -e "CREATE DATABASE IF NOT EXISTS newsalpha;"
> & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql" -u root -p newsalpha < server/data/newsalpha.sql
> ```

### 4. Install Backend Dependencies

```bash
cd server
npm install
```

### 5. Configure Environment Variables

Create a `.env` file in the `server/` folder:

```env
MYSQL_PASSWORD=your_mysql_password
GOOGLE_API_KEY=your_gemini_api_key
```

- MySQL password: whatever you set during MySQL installation (leave blank if no password)
- Google API key: get one free at [Google AI Studio](https://aistudio.google.com/app/apikey) (only required for the AI Analyst feature)

### 6. Start the Application

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

On Windows with PowerShell, set env vars first:
```powershell
$env:MYSQL_PASSWORD="your_password"
$env:GOOGLE_API_KEY="your_key"
npm run dev
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

### 7. Open in Browser

Navigate to `http://localhost:5173`

The backend runs on `http://localhost:3001`. The Analysis page status indicator will show ✓ when the backend is connected.

## Project Structure

```
NewsAlpha/
├── public/                        # Static assets
├── src/
│   ├── App.tsx                    # Router setup (5 routes)
│   ├── pages/
│   │   ├── HomePage.tsx           # Landing page with sector cards
│   │   ├── HomePage.css
│   │   ├── AnalysisPage.tsx       # Interactive analysis dashboard
│   │   ├── AnalysisPage.css
│   │   ├── PaperPage.tsx          # Research findings summary
│   │   ├── PaperPage.css
│   │   ├── AIAnalystPage.tsx      # Natural language SQL interface
│   │   ├── AIAnalystPage.css
│   │   ├── AboutPage.tsx          # Team profiles
│   │   └── AboutPage.css
├── server/
│   ├── server.js                  # Express API (MySQL + LangChain)
│   ├── migrate-to-mysql.js        # SQLite → MySQL migration script
│   ├── package.json               # Backend dependencies
│   ├── .env.example               # Environment variable template
│   └── data/
│       ├── newsalpha.sql          # MySQL dump (quick setup)
│       ├── cs179g_project.db      # Original SQLite database
│       ├── df_clean_trimmed.csv   # 252,187 articles with source info
│       └── sp500_sector_etf_data.csv  # 36,656 ETF price records
├── package.json                   # Frontend dependencies (Vite + React)
└── README.md
```

## Frontend Architecture

The frontend is built as a single-page application with five routes, using a consistent dark-theme design system defined through CSS custom properties in `HomePage.css`:

**Design tokens** used across all pages:
- Colors: `--bg`, `--surface`, `--border`, `--text`, `--accent`, `--green`, `--red`, `--amber`, `--cyan`, `--purple`, `--pink`
- Fonts: `--font-sans` (DM Sans), `--font-mono` (JetBrains Mono), `--font-serif` (Instrument Serif)
- Easing: `--ease-out` for consistent animation curves

**Key frontend packages:**
| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `react-router-dom` | Client-side routing between pages |
| `recharts` | Chart rendering for AI Analyst page |
| `vite` | Build tool and dev server (with SWC for fast TypeScript compilation) |
| `typescript` | Type safety |

**API communication:**
- The Analysis page fetches from `http://localhost:3001/api/analysis` with query parameters for source, news sector, and market sector
- Source coverage is fetched once on page load from `/api/source-coverage` to grey out unavailable sector options
- The AI Analyst page posts to `/api/ask` and `/api/execute_sql` for the natural language to SQL pipeline
- All API responses are typed with TypeScript interfaces (`AnalysisResult`, `DailyDatum`, `PriceDatum`)

## Data Pipeline

1. **Data Collection** — 252,187 articles scraped from 16 sources including The Guardian, BBC News, CNN-DailyMail, GlobeNewswire, and others
2. **Sentiment Analysis** — VADER NLP scoring produces per-article compound sentiment values from −1 to +1
3. **Sector Mapping** — Article categories mapped to 12 S&P 500 sector ETFs via keyword-based PySpark expressions
4. **Impact Modeling** — Pearson correlations and binary prediction accuracy measure sentiment-to-price relationships

## Team

| Name | Contribution |
|---|---|
| Edward | Spark execution, reproducibility validation, front-end development |
| Gelvesh | Cross-sector sentiment-to-market prediction analysis and heatmap visualization |
| HaiShan | Dataset integrity verification and CSV parsing validation |
| John-Paul | Initial article data processing |
| Josh | Spark pipeline development, ETF data collection, benchmarking, SQLite export |
| Rafat | Volatility analysis, LOESS smoothing, sentiment quintile breakdowns |

## License

This project was created for CS 179G at UC Riverside. All rights reserved.