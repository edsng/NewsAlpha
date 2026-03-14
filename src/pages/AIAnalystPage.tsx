import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import "./AIAnalystPage.css";

const API_BASE = "http://localhost:3001";

interface ChartConfig {
  type: "bar" | "line" | "pie" | "scatter" | "none";
  xAxisKey?: string;
  yAxisKey?: string;
}

export default function AIAnalystPage() {
  const [question, setQuestion] = useState("");
  const [loadingSql, setLoadingSql] = useState(false);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  const [executing, setExecuting] = useState(false);
  const [formattedAnswer, setFormattedAnswer] = useState<string | null>(null);
  const [rawResult, setRawResult] = useState<any[] | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const [showRaw, setShowRaw] = useState(false);

  const sampleQueries = [
    "What is the average sentiment score for each sector?",
    "Which news source has the highest prediction accuracy?",
    "Show me the top 5 days with the most articles published across all sectors.",
    "What is the correlation between sentiment and return for each sector?",
    "How many articles does each news source have?",
    "Which sector has the most positive average sentiment?",
    "What is the average daily return for each sector ETF?",
    "Show me the prediction accuracy for all sectors, ordered from highest to lowest.",
  ];

  const handleGenerateSql = async () => {
    if (!question.trim()) return;

    setLoadingSql(true);
    setSqlQuery(null);
    setSqlError(null);
    setFormattedAnswer(null);
    setRawResult(null);
    setChartConfig(null);
    setShowRaw(false);

    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server returned non-JSON (${res.status}): ${text || "Empty response"}`);
      }

      if (!res.ok) {
        const msg = data.details || data.error || "Failed to generate SQL";
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }

      setSqlQuery(data.sql);
    } catch (err: any) {
      setSqlError(err.message);
    } finally {
      setLoadingSql(false);
    }
  };

  const handleExecuteSql = async () => {
    if (!sqlQuery || !question) return;

    setExecuting(true);
    setExecError(null);
    setFormattedAnswer(null);
    setRawResult(null);
    setChartConfig(null);

    try {
      const res = await fetch(`${API_BASE}/api/execute_sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sql: sqlQuery }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || "Failed to execute SQL");
      }

      setFormattedAnswer(data.formattedAnswer);
      setRawResult(data.rawResult);
      if (data.chartConfig) setChartConfig(data.chartConfig);
    } catch (err: any) {
      setExecError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6"];

  const renderChart = () => {
    if (!chartConfig || chartConfig.type === "none" || !rawResult || rawResult.length === 0) return null;

    const { type, xAxisKey, yAxisKey } = chartConfig;
    if (!xAxisKey && type !== "pie") return null;

    const data = rawResult.map((row) => ({
      ...row,
      [yAxisKey || "value"]: Number(row[yAxisKey || "value"]) || row[yAxisKey || "value"],
    }));

    const tooltipStyle = {
      backgroundColor: "#12161c",
      borderColor: "#1e2530",
      color: "#e8ecf1",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13,
      borderRadius: 8,
    };

    return (
      <div className="ai-chart">
        <ResponsiveContainer width="100%" height={400}>
          {type === "bar" ? (
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
              <XAxis dataKey={xAxisKey} stroke="#7a8599" tick={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif" }} />
              <YAxis stroke="#7a8599" tick={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13 }} />
              <Bar dataKey={yAxisKey!} fill="#3b82f6">
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : type === "line" ? (
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
              <XAxis dataKey={xAxisKey} stroke="#7a8599" tick={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif" }} />
              <YAxis stroke="#7a8599" tick={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13 }} />
              <Line type="monotone" dataKey={yAxisKey!} stroke="#22c55e" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          ) : type === "scatter" ? (
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
              <XAxis dataKey={xAxisKey} name={xAxisKey} stroke="#7a8599" tick={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif" }} />
              <YAxis dataKey={yAxisKey} name={yAxisKey} stroke="#7a8599" tick={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13 }} />
              <Scatter name="Data" data={data} fill="#f59e0b" />
            </ScatterChart>
          ) : type === "pie" && xAxisKey && yAxisKey ? (
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13 }} />
              <Pie data={data} dataKey={yAxisKey} nameKey={xAxisKey} cx="50%" cy="50%" outerRadius={120} fill="#a855f7" label={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
                {data.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <div />
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="ai-root">
      {/* ── NAV ── */}
      <nav className="ai-nav">
        <span className="ai-nav__title">NewsAlpha</span>
        <div className="ai-nav__links">
          <Link to="/" className="ai-nav-link">Home</Link>
          <Link to="/analysis" className="ai-nav-link">Analysis</Link>
          <Link to="/paper" className="ai-nav-link">Paper</Link>
          <Link to="/ai-analyst" className="ai-nav-link ai-nav-link--active">AI Analyst</Link>
          <Link to="/about" className="ai-nav-link">About</Link>
        </div>
      </nav>

      {/* ── PAGE HEADER ── */}
      <div className="ai-header">
        <p className="ai-header__label">Natural Language to SQL</p>
        <h1 className="ai-header__h1">AI Analyst</h1>
        <p className="ai-header__subtitle">
          Ask questions about the dataset in plain English. The AI generates a safe SELECT query,
          you verify it, then it runs against the live MySQL database.
        </p>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="ai-container">
        {/* Question form */}
        <div className="ai-form">
          <textarea
            autoFocus
            className="ai-textarea"
            placeholder="e.g. Which news source has the highest prediction accuracy?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerateSql();
              }
            }}
          />
          <button
            className="ai-btn"
            onClick={handleGenerateSql}
            disabled={loadingSql || !question.trim()}
          >
            {loadingSql ? "Generating SQL..." : "Generate SQL"}
          </button>

          {sqlError && <div className="ai-error">{sqlError}</div>}
        </div>

        {/* SQL verification */}
        {sqlQuery && (
          <div className="ai-sql-box">
            <h3>Generated SQL for Verification</h3>
            <p className="ai-sql-box__hint">
              Review the query below before executing. Only SELECT statements are permitted.
            </p>
            <pre>{sqlQuery}</pre>
            <div className="ai-sql-box__actions">
              <button
                className="ai-btn ai-btn--green"
                onClick={handleExecuteSql}
                disabled={executing}
              >
                {executing ? "Executing..." : "Run Query"}
              </button>
            </div>
            {execError && <div className="ai-error">{execError}</div>}
          </div>
        )}

        {/* Answer */}
        {formattedAnswer && (
          <div className="ai-answer">
            <h3>Answer</h3>
            <p>{formattedAnswer}</p>
          </div>
        )}

        {/* Chart */}
        {renderChart()}

        {/* Raw data */}
        {rawResult && (
          <div>
            <button className="ai-raw-toggle" onClick={() => setShowRaw(!showRaw)}>
              {showRaw ? "Hide Raw Data" : "Show Raw Data"}
            </button>

            {showRaw && rawResult.length > 0 && (
              <div className="ai-table-wrap">
                <table className="ai-table">
                  <thead>
                    <tr>
                      {Object.keys(rawResult[0]).map((k) => (
                        <th key={k}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawResult.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val: any, j) => (
                          <td key={j}>{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showRaw && rawResult.length === 0 && (
              <p className="ai-no-results">No results found for this query.</p>
            )}
          </div>
        )}

        {/* Sample queries */}
        <div className="ai-samples">
          <p className="ai-samples__label">Try a sample query:</p>
          <div className="ai-samples__grid">
            {sampleQueries.map((q, i) => (
              <button
                key={i}
                className="ai-sample-btn"
                onClick={() => setQuestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}