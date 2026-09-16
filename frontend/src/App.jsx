import { useState } from "react";
import "./App.css";

//const API_URL = "https://market-analyzer-backend-i98w.onrender.com";
const API_URL = "http://127.0.0.1:5000";

function App() {
  const [page, setPage] = useState(
  localStorage.getItem("marketAnalyzerLoggedIn") === "true"
    ? "home"
    : "login"
);
  const [isRegistering, setIsRegistering] = useState(false);

  const [email, setEmail] = useState(
  localStorage.getItem("marketAnalyzerEmail") || ""
);
  const [password, setPassword] = useState("");

  const [authMessage, setAuthMessage] = useState("");
  const [stockMessage, setStockMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [stock, setStock] = useState({
    symbol: "",
    peRatio: "",
    eps: "",
    dividendYield: "",
    marketCap: "",
    debtToEquity: "",
    roe: "",
    roa: "",
    currentRatio: "",
    quickRatio: "",
    bookValuePerShare: "",
  });

  const [analysisResult, setAnalysisResult] = useState(null);

  const [history, setHistory] = useState({
    stocks: [],
    portfolios: []
  });

  // =========================================================
  // PORTFOLIO STATE
  // =========================================================

  const createEmptyFund = () => ({
    fundCode: "",
    amount: "",
    expanded: true,
    holdings: [
      { stock: "", allocation: "" }
    ],
    sectors: [
      { sector: "", allocation: "" }
    ],
    performance: {
      oneYearReturn: "",
      threeYearReturn: "",
      fiveYearReturn: ""
    }
  });

  const [clientId, setClientId] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [funds, setFunds] = useState([createEmptyFund()]);
  const [portfolioMessage, setPortfolioMessage] = useState("");
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioResult, setPortfolioResult] = useState(null);

  const fetchHistory = async () => {
    try {
      const [stockRes, portfolioRes] = await Promise.all([
        fetch(
          `${API_URL}/api/stocks/history?email=${encodeURIComponent(email)}`
        ),
        fetch(
          `${API_URL}/api/portfolio/history?email=${encodeURIComponent(email)}`
        )
      ]);

      const stockData = await stockRes.json();
      const portfolioData = await portfolioRes.json();

      setHistory({
        stocks: stockData.history || [],
        portfolios: portfolioData.history || []
      });
    } catch (err) {
      console.error("Failed to load history", err);
      setHistory({
        stocks: [],
        portfolios: []
      });
    }
  };

  // =========================================================
  // AUTHENTICATION
  // =========================================================

  const handleAuth = async (e) => {

    e.preventDefault();

    setAuthMessage("");

    if (!email.endsWith("@gmail.com")) {

      setAuthMessage(
        "Please enter a valid Gmail address."
      );

      return;
    }

    if (password.length < 6) {

      setAuthMessage(
        "Password must contain at least 6 characters."
      );

      return;
    }

    setLoading(true);


    try {

      const endpoint = isRegistering
        ? `${API_URL}/api/register`
        : `${API_URL}/api/login`;


      const response = await fetch(
        endpoint,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email,
            password,
          }),
        }
      );


      const data = await response.json();


      if (!response.ok) {

        setAuthMessage(
          data.message
        );

        return;
      }

      localStorage.setItem("marketAnalyzerLoggedIn", "true");
      localStorage.setItem("marketAnalyzerEmail", email);

      setPage("home");

      setAuthMessage("");

    } catch (error) {

      setAuthMessage(
        "Unable to connect to backend."
      );

    } finally {

      setLoading(false);
    }
  };


  // =========================================================
  // STOCK INPUT
  // =========================================================

  const handleStockChange = (e) => {

    const { name, value } = e.target;


    setStock((previous) => ({
      ...previous,
      [name]: value,
    }));


    setStockMessage("");
  };


  // =========================================================
  // ANALYZE STOCK
  // =========================================================

  const analyzeStock = async () => {

    setStockMessage("");

    setAnalysisResult(null);


    const requiredFields = Object.values(stock);


    if (
      requiredFields.some(
        (value) => value === ""
      )
    ) {

      setStockMessage(
        "Please enter all stock parameters."
      );

      return;
    }
    
    if (
      Number(stock.currentRatio) < 0 ||
      Number(stock.quickRatio) < 0 ||
      Number(stock.marketCap) < 0
    ) {
      setStockMessage(
        "Liquidity ratios and Market Cap cannot be negative."
      );
      return;
    }

    setLoading(true);

    try {

      const backendStock = {

        stockSymbol:
          stock.symbol.toUpperCase(),

        priceEarningsRatio:
          Number(stock.peRatio),

        earningsPerShare:
          Number(stock.eps),

        dividendYield:
          Number(stock.dividendYield),

        marketCap:
          Number(stock.marketCap),

        debtToEquityRatio:
          Number(stock.debtToEquity),

        returnOnEquity:
          Number(stock.roe) > 1 ? Number(stock.roe) / 100 : Number(stock.roe),

        returnOnAssets:
          Number(stock.roa) > 1 ? Number(stock.roa) / 100 : Number(stock.roa),

        currentRatio:
          Number(stock.currentRatio),

        quickRatio:
          Number(stock.quickRatio),

        bookValuePerShare:
          Number(stock.bookValuePerShare),
      };


      const response = await fetch(
        `${API_URL}/api/stocks/analyze`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(
            {
              ...backendStock,
              userEmail: email,
            }
          ),
        }
      );


      const data =
        await response.json();


      if (!response.ok) {

        setStockMessage(
          data.message ||
          "Analysis failed."
        );

        return;
      }


      setAnalysisResult(data);
      await fetchHistory();


      setTimeout(() => {

        document
          .getElementById(
            "analysis-result"
          )
          ?.scrollIntoView({
            behavior: "smooth",
          });

      }, 100);


    } catch (error) {

      setStockMessage(
        "Unable to connect to backend."
      );

    } finally {

      setLoading(false);
    }
  };

  // =========================================================
// PORTFOLIO FUNCTIONS
// =========================================================

const toggleFund = (index) => {

  setFunds((previous) =>
    previous.map((fund, i) =>
      i === index
        ? {
            ...fund,
            expanded: !fund.expanded
          }
        : fund
    )
  );
};


const addFund = () => {

  setFunds((previous) => [
    ...previous,
    createEmptyFund()
  ]);
};


const removeFund = (index) => {

  if (funds.length === 1) {
    return;
  }

  setFunds((previous) =>
    previous.filter(
      (_, i) => i !== index
    )
  );
};


const handleFundChange = (
  index,
  field,
  value
) => {

  setFunds((previous) =>
    previous.map((fund, i) =>
      i === index
        ? {
            ...fund,
            [field]: value
          }
        : fund
    )
  );

  setPortfolioMessage("");
};


const handlePerformanceChange = (
  index,
  field,
  value
) => {

  setFunds((previous) =>
    previous.map((fund, i) =>
      i === index
        ? {
            ...fund,
            performance: {
              ...fund.performance,
              [field]: value
            }
          }
        : fund
    )
  );

  setPortfolioMessage("");
};


const handleHoldingChange = (
  fundIndex,
  rowIndex,
  field,
  value
) => {

  setFunds((previous) =>
    previous.map((fund, i) => {

      if (i !== fundIndex) {
        return fund;
      }

      const updatedHoldings =
        [...fund.holdings];

      updatedHoldings[rowIndex] = {
        ...updatedHoldings[rowIndex],
        [field]: value
      };

      return {
        ...fund,
        holdings: updatedHoldings
      };
    })
  );
};


const handleSectorChange = (
  fundIndex,
  rowIndex,
  field,
  value
) => {

  setFunds((previous) =>
    previous.map((fund, i) => {

      if (i !== fundIndex) {
        return fund;
      }

      const updatedSectors =
        [...fund.sectors];

      updatedSectors[rowIndex] = {
        ...updatedSectors[rowIndex],
        [field]: value
      };

      return {
        ...fund,
        sectors: updatedSectors
      };
    })
  );
};


const addHolding = (fundIndex) => {

  setFunds((previous) =>
    previous.map((fund, i) => {

      if (i !== fundIndex) {
        return fund;
      }

      return {
        ...fund,
        holdings: [
          ...fund.holdings,
          {
            stock: "",
            allocation: ""
          }
        ]
      };
    })
  );
};


const addSector = (fundIndex) => {

  setFunds((previous) =>
    previous.map((fund, i) => {

      if (i !== fundIndex) {
        return fund;
      }

      return {
        ...fund,
        sectors: [
          ...fund.sectors,
          {
            sector: "",
            allocation: ""
          }
        ]
      };
    })
  );
};


const removeHolding = (
  fundIndex,
  rowIndex
) => {

  setFunds((previous) =>
    previous.map((fund, i) => {

      if (i !== fundIndex) {
        return fund;
      }

      if (fund.holdings.length === 1) {
        return fund;
      }

      return {
        ...fund,
        holdings:
          fund.holdings.filter(
            (_, index) =>
              index !== rowIndex
          )
      };
    })
  );
};


const removeSector = (
  fundIndex,
  rowIndex
) => {

  setFunds((previous) =>
    previous.map((fund, i) => {

      if (i !== fundIndex) {
        return fund;
      }

      if (fund.sectors.length === 1) {
        return fund;
      }

      return {
        ...fund,
        sectors:
          fund.sectors.filter(
            (_, index) =>
              index !== rowIndex
          )
      };
    })
  );
};


  // =========================================================
  // ANALYZE PORTFOLIO
  // =========================================================

  const analyzePortfolio = async () => {
    setPortfolioMessage("");
    setPortfolioResult(null);

    if (!clientId.trim()) {
      setPortfolioMessage("Please enter a Client ID.");
      return;
    }

    if (!funds.length) {
      setPortfolioMessage("Please add at least one fund.");
      return;
    }

    for (let i = 0; i < funds.length; i++) {
      const fund = funds[i];

      if (!fund.fundCode.trim()) {
        setPortfolioMessage(`Please enter a fund code for Fund ${i + 1}.`);
        return;
      }

      if (!fund.amount || Number(fund.amount) <= 0) {
        setPortfolioMessage(`Please enter a valid investment amount for ${fund.fundCode}.`);
        return;
      }

      const sectorTotal = fund.sectors.reduce(
        (sum, item) => sum + (Number(item.allocation) || 0),
        0
      );

      const holdingTotal = fund.holdings.reduce(
        (sum, item) => sum + (Number(item.allocation) || 0),
        0
      );

      if (sectorTotal > 100.01) {
        setPortfolioMessage(`Sector allocation for ${fund.fundCode} cannot exceed 100%.`);
        return;
      }

      if (holdingTotal > 100.01) {
        setPortfolioMessage(`Holding allocation for ${fund.fundCode} cannot exceed 100%.`);
        return;
      }

      if (fund.sectors.some((item) => item.sector.trim() && Number(item.allocation) < 0)) {
        setPortfolioMessage(`Sector allocation cannot be negative for ${fund.fundCode}.`);
        return;
      }

      if (fund.holdings.some((item) => item.stock.trim() && Number(item.allocation) < 0)) {
        setPortfolioMessage(`Holding allocation cannot be negative for ${fund.fundCode}.`);
        return;
      }
    }

    setPortfolioLoading(true);

    try {
      const backendFunds = funds.map((fund) => ({
        fundCode: fund.fundCode.trim().toUpperCase(),
        amount: Number(fund.amount),
        holdings: fund.holdings
          .filter((item) => item.stock.trim() && item.allocation !== "")
          .map((item) => ({
            stock: item.stock.trim().toUpperCase(),
            allocation: Number(item.allocation) / 100
          })),
        sectors: fund.sectors
          .filter((item) => item.sector.trim() && item.allocation !== "")
          .map((item) => ({
            sector: item.sector.trim(),
            allocation: Number(item.allocation) / 100
          })),
        performance: {
          oneYearReturn: Number(fund.performance.oneYearReturn || 0),
          threeYearReturn: Number(fund.performance.threeYearReturn || 0),
          fiveYearReturn: Number(fund.performance.fiveYearReturn || 0)
        }
      }));

      const response = await fetch(
        `${API_URL}/api/portfolio/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userEmail: email,
            clientId: clientId.trim(),
            currency,
            funds: backendFunds
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setPortfolioMessage(
          data.message || "Portfolio analysis failed."
        );
        return;
      }

      setPortfolioResult(data);
      await fetchHistory();

      setTimeout(() => {
        document
          .getElementById("portfolio-result")
          ?.scrollIntoView({
            behavior: "smooth"
          });
      }, 100);
    } catch (error) {
      console.error(error);
      setPortfolioMessage("Unable to connect to backend.");
    } finally {
      setPortfolioLoading(false);
    }
  };

  // =========================================================
  // LOGIN / REGISTER
  // =========================================================

  if (page === "login") {

    return (
      <div className="auth-page">

        <div className="auth-card">

          <div className="brand-mark">
            NM
          </div>


          <h1>
            NextGen Market Analyzer
          </h1>


          <p className="auth-subtitle">
            Smarter insights for better
            investment decisions
          </p>


          <form onSubmit={handleAuth}>

            <label>
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your Gmail address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />


            <label>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />


            {authMessage && (
              <div className="error-message">
                {authMessage}
              </div>
            )}


            <button
              className="primary-button"
              type="submit"
            >
              {loading
                ? "Please wait..."
                : isRegistering
                ? "Create Account"
                : "Login"}
            </button>

          </form>


          <div className="auth-switch">

            {isRegistering
              ? "Already have an account?"
              : "Don't have an account?"}


            <button
              className="text-button"
              onClick={() => {

                setIsRegistering(
                  !isRegistering
                );

                setAuthMessage("");
              }}
            >
              {isRegistering
                ? "Login"
                : "Register"}
            </button>

          </div>

        </div>

      </div>
    );
  }


  // =========================================================
  // HOME
  // =========================================================

  if (page === "home") {

    return (
      <div className="app-page">

        <header className="top-header">

          <div>

            <div className="small-brand">
              NEXTGEN MARKET ANALYZER
            </div>

            <h2>
              Market Intelligence
            </h2>

          </div>


          <button
            className="logout-button"
            onClick={() => {
              setPage("login");
              setAnalysisResult(null);
            }}
          >
            Logout
          </button>

        </header>


        <main className="dashboard">

          <section className="welcome-section">

            <p className="eyebrow">
              DASHBOARD
            </p>

            <h1>
              What would you like to analyze?
            </h1>

            <p>
              Evaluate stocks and understand
              financial fundamentals through
              explainable analysis.
            </p>

          </section>


          <div className="feature-grid">


            <div
              className="feature-card active-feature"
              onClick={() =>{
                setPage("stock")
              }}
            >

              <div className="feature-icon">
                ↗
              </div>

              <div>

                <span className="feature-label">
                  01
                </span>

                <h3>
                  Stock Evaluator
                </h3>

                <p>
                  Analyze valuation,
                  profitability, liquidity
                  and financial strength.
                </p>

              </div>

              <span className="arrow">
                →
              </span>

            </div>


            <div
              className="feature-card"
              onClick={() =>
                setPage("portfolio")
              }
            >

              <div className="feature-icon">
                ◫
              </div>

              <div>

                <span className="feature-label">
                  02
                </span>

                <h3>
                  Portfolio Analyzer
                </h3>

                <p>
                  Review portfolio allocation
                  and diversification.
                </p>

              </div>

              <span className="arrow">
                →
              </span>

            </div>


            <div
              className="feature-card"
              onClick={() =>{
                fetchHistory();
                setPage("history")
              }}
            >

              <div className="feature-icon">
                ◷
              </div>

              <div>

                <span className="feature-label">
                  03
                </span>

                <h3>
                  Analysis History
                </h3>

                <p>
                  View your stock and portfolio
                  analysis history.
                </p>

              </div>

              <span className="arrow">
                →
              </span>

            </div>

          </div>

        </main>

      </div>
    );
  }


  // =========================================================
  // STOCK EVALUATOR
  // =========================================================

  if (page === "stock") {

    const metrics = [

      {
        name: "peRatio",
        label: "P/E Ratio",
        description:
          "Price compared with earnings",
        placeholder: "e.g. 20",
        prefix: "",
        suffix: "",
      },

      {
        name: "eps",
        label: "EPS",
        description:
          "Earnings per share",
        placeholder: "e.g. 5",
        prefix: "₹",
        suffix: "",
      },

      {
        name: "dividendYield",
        label: "Dividend Yield",
        description:
          "Dividend return",
        placeholder: "e.g. 2",
        prefix: "",
        suffix: "%",
      },

      {
        name: "marketCap",
        label: "Market Capitalization",
        description:
          "Total company market value",
        placeholder: "e.g. 2.3e12",
        prefix: "₹",
        suffix: "",
      },

      {
        name: "debtToEquity",
        label: "Debt / Equity",
        description:
          "Financial leverage",
        placeholder: "e.g. 1.2",
        prefix: "",
        suffix: "",
      },

      {
        name: "roe",
        label: "ROE",
        description:
          "Return on shareholders' equity",
        placeholder: "e.g. 0.15",
        prefix: "",
        suffix: "%",
      },

      {
        name: "roa",
        label: "ROA",
        description:
          "Return generated from assets",
        placeholder: "e.g. 0.08",
        prefix: "",
        suffix: "%",
      },

      {
        name: "currentRatio",
        label: "Current Ratio",
        description:
          "Short-term liquidity",
        placeholder: "e.g. 2.5",
        prefix: "",
        suffix: "",
      },

      {
        name: "quickRatio",
        label: "Quick Ratio",
        description:
          "Immediate liquidity strength",
        placeholder: "e.g. 1.3",
        prefix: "",
        suffix: "",
      },

      {
        name: "bookValuePerShare",
        label: "Book Value / Share",
        description:
          "Net asset value per share",
        placeholder: "e.g. 10",
        prefix: "₹",
        suffix: "",
      },
    ];


    return (
      <div className="app-page">


        {/* HEADER */}

        <header className="top-header">

          <div className="header-left">

            <button
              className="back-button"
              onClick={() =>
                setPage("home")
              }
            >
              ←
            </button>


            <div>

              <div className="small-brand">
                NEXTGEN MARKET ANALYZER
              </div>

              <h2>
                Stock Evaluator
              </h2>

            </div>

          </div>


          <button
            className="logout-button"
            onClick={() =>
              setPage("login")
            }
          >
            Logout
          </button>

        </header>


        <main className="stock-page">


          {/* INTRO */}

          <section className="stock-intro">

            <div>

              <p className="eyebrow">
                FUNDAMENTAL ANALYSIS
              </p>

              <h1>
                Evaluate a Stock
              </h1>

              <p>
                Enter the fundamental parameters
                to generate an explainable
                financial evaluation.
              </p>

            </div>


            <div className="analysis-badge">

              <span>
                RULE BASED
              </span>

              <small>
                10 parameters
              </small>

            </div>

          </section>


          {/* SYMBOL */}

          <section className="company-input-section">

            <div>

              <label>
                Stock Symbol
              </label>

              <p>
                Enter the stock symbol you want
                to evaluate.
              </p>

            </div>


            <input
              className="symbol-input"
              type="text"
              name="symbol"
              placeholder="e.g. INFY"
              value={stock.symbol}
              onChange={handleStockChange}
            />

          </section>


          {/* METRICS */}

          <section className="metrics-section">

            <div className="section-heading">

              <div>

                <p className="eyebrow">
                  INPUT PARAMETERS
                </p>

                <h2>
                  Key Financial Metrics
                </h2>

              </div>

              <span>
                10 parameters
              </span>

            </div>


            <div className="metrics-grid">

              {metrics.map((metric) => {

                const status =
                  getMetricStatus(
                    metric.name,
                    stock[metric.name]
                  );


                return (

                  <div
                    className={`metric-input-card ${status.className}`}
                    key={metric.name}
                  >

                    <div className="metric-top">

                      <label>
                        {metric.label}
                      </label>


                      {stock[metric.name] !== "" && (

                        <span
                          className={`status-dot ${status.className}`}
                        >
                        </span>

                      )}

                    </div>


                    <p>
                      {metric.description}
                    </p>


                    {stock[metric.name] !== "" && (

                      <div
                        className={`metric-status ${status.className}`}
                      >
                        {status.text}
                      </div>

                    )}


                    <div className="input-wrapper">

                      {metric.prefix && (

                        <span className="input-prefix">
                          {metric.prefix}
                        </span>

                      )}


                      <input
                        type="number"
                        step="any"
                        name={metric.name}
                        placeholder={
                          metric.placeholder
                        }
                        value={
                          stock[metric.name]
                        }
                        onChange={
                          handleStockChange
                        }
                      />


                      {metric.suffix && (

                        <span className="input-suffix">
                          {metric.suffix}
                        </span>

                      )}

                    </div>

                  </div>
                );
              })}

            </div>

          </section>


          {/* ERROR */}

          {stockMessage && (

            <div className="analysis-error">
              {stockMessage}
            </div>

          )}


          {/* BUTTON */}

          <div className="analyze-container">

            <button
              className="analyze-button"
              onClick={analyzeStock}
              disabled={loading}
            >
              {loading
                ? "Analyzing..."
                : "Analyse Stock →"}
            </button>

          </div>


          {/* =================================================
              ANALYSIS RESULT
          ================================================= */}

          {analysisResult && (

            <section
              id="analysis-result"
              className="result-section"
            >


              {/* RESULT HEADER */}

              <div className="result-header">

                <div>

                  <p className="eyebrow">
                    ANALYSIS RESULT
                  </p>

                  <h2>
                    {analysisResult.stockSymbol}
                  </h2>

                </div>


                <div className="result-status">
                  ANALYSIS COMPLETE
                </div>

              </div>


              {/* OVERALL SCORE */}

              <div className="overall-card">

                <div className="score-side">

                  <div className="score-label">
                    OVERALL SCORE
                  </div>

                  <div className="score-number">
                    {analysisResult.score}
                  </div>

                  <div className="score-out-of">
                    / 100
                  </div>

                </div>


                <div className="overall-info">

                  <div
                    className={`rating-badge ${getRatingClass(
                      analysisResult.score
                    )}`}
                  >
                    {analysisResult.rating}
                  </div>


                  <p className="takeaway">
                    {analysisResult.takeaway}
                  </p>

                </div>

              </div>


              {/* FINANCIAL HEALTH */}

              <section className="result-block">

                <div className="section-heading">

                  <div>

                    <p className="eyebrow">
                      FINANCIAL HEALTH
                    </p>

                    <h2>
                      Fundamental Snapshot
                    </h2>

                  </div>

                </div>


                <div className="category-grid">

                  <CategoryCard
                    title="Profitability"
                    value={
                      analysisResult.categories
                        .profitability
                    }
                    icon="◈"
                  />

                  <CategoryCard
                    title="Liquidity"
                    value={
                      analysisResult.categories
                        .liquidity
                    }
                    icon="◌"
                  />

                  <CategoryCard
                    title="Leverage"
                    value={
                      analysisResult.categories
                        .leverage
                    }
                    icon="◇"
                  />

                  <CategoryCard
                    title="Valuation"
                    value={
                      analysisResult.categories
                        .valuation
                    }
                    icon="◫"
                  />

                  <CategoryCard
                    title="Dividend"
                    value={
                      analysisResult.categories
                        .dividend
                    }
                    icon="◆"
                  />

                </div>

              </section>


              {/* PROS CONS */}

              <section className="insights-section">

                <div className="insight-column pros-column">

                  <div className="insight-heading green-heading">
                    <span>✓</span>
                    <h2>
                      Pros
                    </h2>
                  </div>


                  {analysisResult.pros.length > 0 ? (

                    <div className="insight-list">

                      {analysisResult.pros.map(
                        (item, index) => (

                          <div
                            className="insight-item"
                            key={index}
                          >
                            <span className="insight-check">
                              ✓
                            </span>

                            <p>
                              {item}
                            </p>
                          </div>

                        )
                      )}

                    </div>

                  ) : (

                    <p className="empty-insight">
                      No major strengths identified.
                    </p>

                  )}

                </div>


                <div className="insight-column cons-column">

                  <div className="insight-heading red-heading">
                    <span>!</span>
                    <h2>
                      Cons
                    </h2>
                  </div>


                  {analysisResult.cons.length > 0 ? (

                    <div className="insight-list">

                      {analysisResult.cons.map(
                        (item, index) => (

                          <div
                            className="insight-item"
                            key={index}
                          >
                            <span className="insight-warning">
                              !
                            </span>

                            <p>
                              {item}
                            </p>
                          </div>

                        )
                      )}

                    </div>

                  ) : (

                    <p className="empty-insight">
                      No major concerns identified.
                    </p>

                  )}

                </div>

              </section>


              {/* DETAILED ANALYSIS */}

              <section className="feedback-section">

                <div className="section-heading">

                  <div>

                    <p className="eyebrow">
                      DETAILED ANALYSIS
                    </p>

                    <h2>
                      Parameter Insights
                    </h2>

                  </div>

                  <span>
                    Explainable rule-based results
                  </span>

                </div>


                <div className="feedback-grid">

                  {Object.entries(
                    analysisResult.feedback
                  ).map(
                    ([key, value]) => (

                      <div
                        className="feedback-card"
                        key={key}
                      >

                        <div className="feedback-card-top">

                          <span className="feedback-dot">
                          </span>

                          <h3>
                            {formatMetricName(
                              key
                            )}
                          </h3>

                        </div>


                        <p>
                          {value}
                        </p>

                      </div>

                    )
                  )}

                </div>

              </section>


              {/* ORIGINAL SUMMARY */}

              <details className="technical-summary">

                <summary>
                  View full rule-engine summary
                </summary>

                <p>
                  {analysisResult.summary}
                </p>

              </details>

            </section>

          )}

        </main>

      </div>
    );
  }


  // =========================================================
  // PORTFOLIO
  // =========================================================

  // =========================================================
// PORTFOLIO ANALYZER
// =========================================================

if (page === "portfolio") {

  return (

    <div className="app-page portfolio-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="top-header">

        <div className="header-left">

          <button
            className="back-button"
            onClick={() =>
              setPage("home")
            }
          >
            ←
          </button>

          <div>

            <div className="small-brand">
              NEXTGEN MARKET ANALYZER
            </div>

            <h2>
              Portfolio Analyzer
            </h2>

          </div>

        </div>


        <button
          className="logout-button"
          onClick={() => {
            localStorage.removeItem("marketAnalyzerLoggedIn");
            localStorage.removeItem("marketAnalyzerEmail");
            setPage("login");
            setEmail("");
            setPassword("");
          }}
        >
          Logout
        </button>

      </header>


      <main className="portfolio-dashboard">


        {/* =================================================
            INTRO
        ================================================= */}

        <section className="portfolio-hero">

          <div>

            <p className="eyebrow">
              PORTFOLIO INTELLIGENCE
            </p>

            <h1>
              Understand your
              <br />
              investment portfolio.
            </h1>

            <p>
              Add multiple funds and discover
              how your investments are distributed,
              how much they overlap and where your
              portfolio could be better diversified.
            </p>

          </div>


          <div className="portfolio-hero-badge">

            <span>
              MULTI-FUND ANALYSIS
            </span>

            <strong>
              {funds.length}
            </strong>

            <small>
              {funds.length === 1
                ? "Fund added"
                : "Funds added"}
            </small>

          </div>

        </section>


        {/* =================================================
            CLIENT DETAILS
        ================================================= */}

        <section className="portfolio-client-card">

          <div className="portfolio-field">

            <label>
              Client ID
            </label>

            <input
              type="text"
              placeholder="e.g. C101"
              value={clientId}
              onChange={(e) =>
                setClientId(
                  e.target.value
                )
              }
            />

          </div>


          <div className="portfolio-field">

            <label>
              Currency
            </label>

            <select
              value={currency}
              onChange={(e) =>
                setCurrency(
                  e.target.value
                )
              }
            >
              <option value="INR">
                INR — Indian Rupee
              </option>

              <option value="USD">
                USD — US Dollar
              </option>
            </select>

          </div>


          <div className="portfolio-user-info">

            <span>
              ACCOUNT
            </span>

            <strong>
              {email}
            </strong>

          </div>

        </section>


        {/* =================================================
            FUNDS
        ================================================= */}

        <section className="fund-builder-section">

          <div className="portfolio-section-heading">

            <div>

              <p className="eyebrow">
                YOUR INVESTMENTS
              </p>

              <h2>
                Funds in your portfolio
              </h2>

            </div>

            <span>
              {funds.length} fund
              {funds.length !== 1
                ? "s"
                : ""}
            </span>

          </div>


          <div className="fund-list">

            {funds.map(
              (fund, fundIndex) => (

                <div
                  className={`fund-card ${
                    fund.expanded
                      ? "fund-expanded"
                      : ""
                  }`}
                  key={fundIndex}
                >

                  {/* ======================================
                      FUND HEADER
                  ====================================== */}

                  <div
                    className="fund-header"
                    onClick={() =>
                      toggleFund(
                        fundIndex
                      )
                    }
                  >

                    <div className="fund-title-area">

                      <div className="fund-number">
                        {String(
                          fundIndex + 1
                        ).padStart(2, "0")}
                      </div>


                      <div>

                        <strong>
                          {fund.fundCode ||
                            `Fund ${String(
                              fundIndex + 1
                            ).padStart(2, "0")}`}
                        </strong>

                        <span>
                          {fund.amount
                            ? `₹${Number(
                                fund.amount
                              ).toLocaleString(
                                "en-IN"
                              )}`
                            : "Enter fund amount"}
                        </span>

                      </div>

                    </div>


                    <div className="fund-header-right">

                      {fund.amount && (

                        <span className="fund-value-pill">
                          ₹
                          {Number(
                            fund.amount
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </span>

                      )}


                      {funds.length > 1 && (

                        <button
                          className="remove-fund-button"
                          onClick={(e) => {

                            e.stopPropagation();

                            removeFund(
                              fundIndex
                            );

                          }}
                        >
                          Remove
                        </button>

                      )}


                      <span className="fund-chevron">
                        {fund.expanded
                          ? "⌃"
                          : "⌄"}
                      </span>

                    </div>

                  </div>


                  {/* ======================================
                      FUND BODY
                  ====================================== */}

                  {fund.expanded && (

                    <div className="fund-body">


                      {/* FUND BASIC INFO */}

                      <div className="fund-basic-grid">

                        <div className="portfolio-input-group">

                          <label>
                            Fund Code
                          </label>

                          <input
                            type="text"
                            placeholder="e.g. FUND_A"
                            value={
                              fund.fundCode
                            }
                            onChange={(e) =>
                              handleFundChange(
                                fundIndex,
                                "fundCode",
                                e.target.value
                              )
                            }
                          />

                        </div>


                        <div className="portfolio-input-group">

                          <label>
                            Investment Amount
                          </label>

                          <div className="money-input">

                            <span>
                              ₹
                            </span>

                            <input
                              type="number"
                              placeholder="e.g. 1000000"
                              value={
                                fund.amount
                              }
                              onChange={(e) =>
                                handleFundChange(
                                  fundIndex,
                                  "amount",
                                  e.target.value
                                )
                              }
                            />

                          </div>

                        </div>

                      </div>


                      {/* ==================================
                          HOLDINGS
                      ================================== */}

                      <div className="fund-data-section">

                        <div className="fund-subheading">

                          <div>

                            <h3>
                              Holdings
                            </h3>

                            <p>
                              Stocks contained
                              within this fund
                            </p>

                          </div>

                          <button
                            className="small-add-button"
                            onClick={() =>
                              addHolding(
                                fundIndex
                              )
                            }
                          >
                            + Add Holding
                          </button>

                        </div>


                        <div className="allocation-table">

                          <div className="allocation-header">

                            <span>
                              Stock
                            </span>

                            <span>
                              Allocation
                            </span>

                            <span>
                            </span>

                          </div>


                          {fund.holdings.map(
                            (
                              holding,
                              rowIndex
                            ) => (

                              <div
                                className="allocation-row"
                                key={rowIndex}
                              >

                                <input
                                  type="text"
                                  placeholder="INFY"
                                  value={
                                    holding.stock
                                  }
                                  onChange={(e) =>
                                    handleHoldingChange(
                                      fundIndex,
                                      rowIndex,
                                      "stock",
                                      e.target.value
                                    )
                                  }
                                />


                                <div className="percentage-input">

                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    placeholder="30"
                                    value={
                                      holding.allocation
                                    }
                                    onChange={(e) =>
                                      handleHoldingChange(
                                        fundIndex,
                                        rowIndex,
                                        "allocation",
                                        e.target.value
                                      )
                                    }
                                  />

                                  <span>
                                    %
                                  </span>

                                </div>


                                <button
                                  className="remove-row-button"
                                  onClick={() =>
                                    removeHolding(
                                      fundIndex,
                                      rowIndex
                                    )
                                  }
                                >
                                  ×
                                </button>

                              </div>

                            )
                          )}

                        </div>

                      </div>


                      {/* ==================================
                          SECTORS
                      ================================== */}

                      <div className="fund-data-section">

                        <div className="fund-subheading">

                          <div>

                            <h3>
                              Sector Allocation
                            </h3>

                            <p>
                              How this fund is
                              distributed across sectors
                            </p>

                          </div>

                          <button
                            className="small-add-button"
                            onClick={() =>
                              addSector(
                                fundIndex
                              )
                            }
                          >
                            + Add Sector
                          </button>

                        </div>


                        <div className="allocation-table">

                          <div className="allocation-header">

                            <span>
                              Sector
                            </span>

                            <span>
                              Allocation
                            </span>

                            <span>
                            </span>

                          </div>


                          {fund.sectors.map(
                            (
                              sector,
                              rowIndex
                            ) => (

                              <div
                                className="allocation-row"
                                key={rowIndex}
                              >

                                <input
                                  type="text"
                                  placeholder="IT"
                                  value={
                                    sector.sector
                                  }
                                  onChange={(e) =>
                                    handleSectorChange(
                                      fundIndex,
                                      rowIndex,
                                      "sector",
                                      e.target.value
                                    )
                                  }
                                />


                                <div className="percentage-input">

                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    placeholder="30"
                                    value={
                                      sector.allocation
                                    }
                                    onChange={(e) =>
                                      handleSectorChange(
                                        fundIndex,
                                        rowIndex,
                                        "allocation",
                                        e.target.value
                                      )
                                    }
                                  />

                                  <span>
                                    %
                                  </span>

                                </div>


                                <button
                                  className="remove-row-button"
                                  onClick={() =>
                                    removeSector(
                                      fundIndex,
                                      rowIndex
                                    )
                                  }
                                >
                                  ×
                                </button>

                              </div>

                            )
                          )}

                        </div>

                      </div>


                      {/* ==================================
                          PERFORMANCE
                      ================================== */}

                      <div className="fund-data-section">

                        <div className="fund-subheading">

                          <div>

                            <h3>
                              Fund Performance
                            </h3>

                            <p>
                              Historical return
                              information
                            </p>

                          </div>

                        </div>


                        <div className="performance-input-grid">

                          <div className="portfolio-input-group">

                            <label>
                              1 Year Return
                            </label>

                            <div className="percentage-input">

                              <input
                                type="number"
                                step="0.1"
                                placeholder="12"
                                value={
                                  fund.performance
                                    .oneYearReturn
                                }
                                onChange={(e) =>
                                  handlePerformanceChange(
                                    fundIndex,
                                    "oneYearReturn",
                                    e.target.value
                                  )
                                }
                              />

                              <span>
                                %
                              </span>

                            </div>

                          </div>


                          <div className="portfolio-input-group">

                            <label>
                              3 Year Return
                            </label>

                            <div className="percentage-input">

                              <input
                                type="number"
                                step="0.1"
                                placeholder="18"
                                value={
                                  fund.performance
                                    .threeYearReturn
                                }
                                onChange={(e) =>
                                  handlePerformanceChange(
                                    fundIndex,
                                    "threeYearReturn",
                                    e.target.value
                                  )
                                }
                              />

                              <span>
                                %
                              </span>

                            </div>

                          </div>


                          <div className="portfolio-input-group">

                            <label>
                              5 Year Return
                            </label>

                            <div className="percentage-input">

                              <input
                                type="number"
                                step="0.1"
                                placeholder="24"
                                value={
                                  fund.performance
                                    .fiveYearReturn
                                }
                                onChange={(e) =>
                                  handlePerformanceChange(
                                    fundIndex,
                                    "fiveYearReturn",
                                    e.target.value
                                  )
                                }
                              />

                              <span>
                                %
                              </span>

                            </div>

                          </div>

                        </div>

                      </div>

                    </div>

                  )}

                </div>

              )
            )}

          </div>


          {/* ADD FUND */}

          <button
            className="add-fund-button"
            onClick={addFund}
          >
            <span>
              +
            </span>

            Add Another Fund

          </button>

        </section>


        {/* ERROR */}

        {portfolioMessage && (

          <div className="portfolio-error">
            {portfolioMessage}
          </div>

        )}


        {/* ANALYZE */}

        <div className="portfolio-analyze-container">

          <button
            className="portfolio-analyze-button"
            onClick={analyzePortfolio}
            disabled={portfolioLoading}
          >

            {portfolioLoading
              ? "Analyzing Portfolio..."
              : "Analyze My Portfolio →"}

          </button>

        </div>


        {/* =================================================
            RESULT
        ================================================= */}

        {portfolioResult && (

          <section
            id="portfolio-result"
            className="portfolio-result"
          >

            {/* RESULT HEADER */}

            <div className="portfolio-result-heading">

              <div>

                <p className="eyebrow">
                  PORTFOLIO INSIGHTS
                </p>

                <h2>
                  Your Portfolio Dashboard
                </h2>

                <p>
                  Consolidated analysis for
                  {` ${clientId}`}
                </p>

              </div>


              <div className="portfolio-result-status">
                ANALYSIS COMPLETE
              </div>

            </div>


            {/* TOP METRIC CARDS */}

            <div className="portfolio-stat-grid">

              <div className="portfolio-stat-card">

                <span>
                  TOTAL PORTFOLIO
                </span>

                <strong>
                  ₹
                  {Number(
                    portfolioResult
                      .portfolioAnalysis
                      .totalValue
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>


              <div className="portfolio-stat-card">

                <span>
                  FUNDS
                </span>

                <strong>
                  {
                    portfolioResult
                      .portfolioAnalysis
                      .fundCount
                  }
                </strong>

              </div>


              <div className="portfolio-stat-card">

                <span>
                  RISK LEVEL
                </span>

                <strong
                  className={
                    portfolioResult
                      .portfolioAnalysis
                      .riskLevel === "Low"
                      ? "risk-low"
                      : portfolioResult
                          .portfolioAnalysis
                          .riskLevel === "Moderate"
                      ? "risk-moderate"
                      : "risk-high"
                  }
                >
                  {
                    portfolioResult
                      .portfolioAnalysis
                      .riskLevel
                  }
                </strong>

              </div>


              <div className="portfolio-stat-card">

                <span>
                  TRADER TYPE
                </span>

                <strong>
                  {
                    portfolioResult
                      .traderType
                  }
                </strong>

              </div>

            </div>


            {/* VISUAL ROW */}

            <div className="portfolio-visual-grid">


              {/* SECTOR PIE */}

              <div className="portfolio-chart-card">

                <div className="chart-card-heading">

                  <div>

                    <p>
                      ALLOCATION
                    </p>

                    <h3>
                      Sector Diversification
                    </h3>

                  </div>

                  <span>
                    {
                      Object.keys(
                        portfolioResult
                          .portfolioAnalysis
                          .sectorDiversification
                      ).length
                    } sectors
                  </span>

                </div>


                <SectorDonut
                  sectors={
                    portfolioResult
                      .portfolioAnalysis
                      .sectorDiversification
                  }
                />

              </div>


              {/* PERFORMANCE */}

              <div className="portfolio-chart-card">

                <div className="chart-card-heading">

                  <div>

                    <p>
                      PERFORMANCE
                    </p>

                    <h3>
                      Portfolio Returns
                    </h3>

                  </div>

                </div>


                <PerformanceChart
                  performance={
                    portfolioResult
                      .portfolioAnalysis
                      .performance
                  }
                />

              </div>

            </div>


            {/* SECOND ROW */}

            <div className="portfolio-bottom-grid">


              {/* DIVERSIFICATION SCORE */}

              <div className="portfolio-insight-card">

                <p className="eyebrow">
                  DIVERSIFICATION HEALTH
                </p>

                <h3>
                  {portfolioResult
                    .portfolioAnalysis
                    .diversificationScore}
                  /100
                </h3>

                <div className="score-bar">

                  <div
                    style={{
                      width: `${
                        portfolioResult
                          .portfolioAnalysis
                          .diversificationScore
                      }%`
                    }}
                  />

                </div>

                <div className="score-details">

                  <span>
                    Fund Overlap
                    <strong>
                      {
                        portfolioResult
                          .portfolioAnalysis
                          .averageFundOverlap
                      }%
                    </strong>
                  </span>

                  <span>
                    Sector Score
                    <strong>
                      {
                        portfolioResult
                          .portfolioAnalysis
                          .sectorScore
                      }
                    </strong>
                  </span>

                </div>

              </div>


              {/* SUMMARY */}

              <div className="portfolio-summary-card">

                <p className="eyebrow">
                  INVESTOR TAKEAWAY
                </p>

                <h3>
                  What your portfolio is telling you
                </h3>

                <p>
                  {
                    portfolioResult.summary
                  }
                </p>

              </div>

            </div>


            {/* FUND ALLOCATION */}

            <div className="portfolio-chart-card full-width-card">

              <div className="chart-card-heading">

                <div>

                  <p>
                    FUND DISTRIBUTION
                  </p>

                  <h3>
                    Where your money is invested
                  </h3>

                </div>

              </div>


              <div className="fund-allocation-list">

                {
                  portfolioResult
                    .portfolioAnalysis
                    .fundAllocation
                    .map(
                      (fund) => (

                        <div
                          className="fund-allocation-row"
                          key={
                            fund.fundCode
                          }
                        >

                          <div>

                            <strong>
                              {
                                fund.fundCode
                              }
                            </strong>

                            <span>
                              ₹
                              {Number(
                                fund.amount
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </span>

                          </div>


                          <div className="fund-allocation-track">

                            <div
                              style={{
                                width:
                                  `${fund.percentage}%`
                              }}
                            />

                          </div>


                          <strong>
                            {
                              fund.percentage
                            }%
                          </strong>

                        </div>

                      )
                    )
                }

              </div>

            </div>


            {/* DIVERSIFICATION */}

            <div className="portfolio-recommendations-card">

              <div className="chart-card-heading">

                <div>

                  <p>
                    PERSONALIZED INSIGHT
                  </p>

                  <h3>
                    Possible Diversification
                  </h3>

                </div>

              </div>


              <div className="recommendation-grid">

                {
                  portfolioResult
                    .possibleDiversification
                    .map(
                      (
                        item,
                        index
                      ) => (

                        <div
                          className="recommendation-item"
                          key={index}
                        >

                          <div className="recommendation-icon">
                            +
                          </div>

                          <div>

                            <strong>
                              {
                                item.sector
                              }
                            </strong>

                            <p>
                              {
                                item.recommendation
                              }
                            </p>

                          </div>

                        </div>

                      )
                    )
                }

              </div>

            </div>


            {/* DISCLOSURE */}

            <div className="portfolio-disclaimer">

              <strong>
                Educational analysis only.
              </strong>

              This dashboard uses the supplied
              portfolio allocations and deterministic
              calculations to highlight concentration,
              diversification and performance patterns.
              It is not personalized financial advice
              or a recommendation to buy or sell
              any investment.

            </div>

          </section>

        )}

      </main>

    </div>

  );
}


  // =========================================================
  // HISTORY
  // =========================================================

  if (page === "history") {
    const stockHistory = history.stocks || [];
    const portfolioHistory = history.portfolios || [];

    return (
      <div className="app-page">
        <header className="top-header">
          <div>
            <div className="small-brand">
              NEXTGEN MARKET ANALYZER
            </div>
            <h2>Analysis History</h2>
          </div>

          <button
            className="back-button"
            onClick={() => setPage("home")}
          >
            ← Dashboard
          </button>
        </header>

        <main className="dashboard">
          <section className="welcome-section">
            <p className="eyebrow">SAVED ANALYSES</p>
            <h1>Analysis History</h1>
            <p>Past stock evaluations and portfolio analyses performed for {email}.</p>
          </section>

          {/* STOCK HISTORY */}
          <section className="feedback-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">STOCK ANALYSIS</p>
                <h2>📈 Stock Evaluation History</h2>
              </div>
              <span>{stockHistory.length} evaluation{stockHistory.length !== 1 ? "s" : ""}</span>
            </div>

            {stockHistory.length === 0 ? (
              <p className="empty-insight">No stock evaluations found yet.</p>
            ) : (
              <div className="feedback-grid">
                {stockHistory.map((item, idx) => (
                  <div className="feedback-card" key={idx}>
                    <div
                      className="feedback-card-top"
                      style={{ justifyContent: "space-between" }}
                    >
                      <h3>{item.stock_symbol}</h3>
                      <span className={`rating-badge ${getRatingClass(item.score)}`}>
                        {item.score}/100 — {item.rating}
                      </span>
                    </div>
                    <p>{item.summary}</p>
                    <small style={{ color: "#8a929f", display: "block", marginTop: "10px" }}>
                      Evaluated on: {item.created_at}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* PORTFOLIO HISTORY */}
          <section className="feedback-section" style={{ marginTop: "50px" }}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">PORTFOLIO ANALYSIS</p>
                <h2>💼 Portfolio Analysis History</h2>
              </div>
              <span>{portfolioHistory.length} analysis{portfolioHistory.length !== 1 ? "es" : ""}</span>
            </div>

            {portfolioHistory.length === 0 ? (
              <p className="empty-insight">No portfolio analyses found yet.</p>
            ) : (
              <div className="feedback-grid">
                {portfolioHistory.map((item, idx) => (
                  <div className="feedback-card" key={idx}>
                    <div
                      className="feedback-card-top"
                      style={{ justifyContent: "space-between" }}
                    >
                      <div>
                        <span className="eyebrow">CLIENT</span>
                        <h3>{item.client_id}</h3>
                      </div>
                      <span
                        className={`rating-badge ${
                          item.risk_level === "Low"
                            ? "rating-green"
                            : item.risk_level === "Moderate"
                            ? "rating-yellow"
                            : "rating-red"
                        }`}
                      >
                        {item.risk_level} Risk
                      </span>
                    </div>

                    <p>{item.summary}</p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginTop: "16px" }}>
                      <div>
                        <small style={{ color: "#8a929f" }}>Portfolio Value</small>
                        <strong style={{ display: "block" }}>
                          ₹{Number(item.total_value || 0).toLocaleString("en-IN")}
                        </strong>
                      </div>
                      <div>
                        <small style={{ color: "#8a929f" }}>Funds</small>
                        <strong style={{ display: "block" }}>{item.fund_count}</strong>
                      </div>
                      <div>
                        <small style={{ color: "#8a929f" }}>Trader Type</small>
                        <strong style={{ display: "block" }}>{item.trader_type}</strong>
                      </div>
                      <div>
                        <small style={{ color: "#8a929f" }}>Diversification</small>
                        <strong style={{ display: "block" }}>{item.diversification_score}/100</strong>
                      </div>
                    </div>

                    <small style={{ color: "#8a929f", display: "block", marginTop: "16px" }}>
                      Analyzed on: {item.created_at}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  return null;
}


// =========================================================
// CATEGORY CARD
// =========================================================

function CategoryCard({
  title,
  value,
  icon,
}) {

  const status =
    getCategoryStatus(value);


  return (

    <div
      className={`category-card ${status}`}
    >

      <div className="category-icon">
        {icon}
      </div>

      <div>

        <span className="category-title">
          {title}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}


// =========================================================
// CATEGORY STATUS
// =========================================================

function getCategoryStatus(value) {

  if (
    value === "Strong" ||
    value === "Low" ||
    value === "Attractive"
  ) {
    return "green";
  }


  if (
    value === "Caution" ||
    value === "High" ||
    value === "Needs Attention"
  ) {
    return "red";
  }


  return "yellow";
}


// =========================================================
// METRIC STATUS FOR INPUTS
// =========================================================

function getMetricStatus(
  name,
  value
) {

  const number =
    Number(value);


  if (
    value === "" ||
    Number.isNaN(number)
  ) {

    return {
      className: "",
      text: "",
    };
  }


  switch (name) {

    case "peRatio":

      if (number < 15) {

        return {
          className: "green",
          text: "Lower valuation",
        };

      } else if (number <= 30) {

        return {
          className: "yellow",
          text: "Fairly typical",
        };

      }

      return {
        className: "red",
        text: "Relatively expensive",
      };


    case "eps":

      if (number < 1) {

        return {
          className: "red",
          text: "Low earnings",
        };

      } else if (number < 5) {

        return {
          className: "yellow",
          text: "Modest earnings",
        };

      }

      return {
        className: "green",
        text: "Strong earnings",
      };


    case "dividendYield":

      if (number < 1) {

        return {
          className: "red",
          text: "Lower than market average",
        };

      } else if (number <= 3) {

        return {
          className: "yellow",
          text: "Around market norm",
        };

      }

      return {
        className: "green",
        text: "Attractive yield",
      };


    case "marketCap":

      if (number >= 100000000000000) {

        return {
          className: "green",
          text: "Very large company",
        };

      }

      return {
        className: "yellow",
        text: "Sizable player",
      };


    case "debtToEquity":

      if (number < 0.5) {

        return {
          className: "green",
          text: "Very little leverage",
        };

      } else if (number <= 1.5) {

        return {
          className: "yellow",
          text: "Moderate leverage",
        };

      }

      return {
        className: "red",
        text: "High leverage",
      };


    case "roe": {

      const percentage =
        number * 100;


      if (percentage < 8) {

        return {
          className: "red",
          text: "Below average",
        };

      } else if (percentage <= 15) {

        return {
          className: "yellow",
          text: "Healthy",
        };

      }

      return {
        className: "green",
        text: "Very strong",
      };
    }


    case "roa": {

      const percentage =
        number * 100;


      if (percentage < 5) {

        return {
          className: "red",
          text: "Modest efficiency",
        };

      }

      return {
        className: "green",
        text: percentage <= 10
          ? "Efficient"
          : "Excellent",
      };
    }


    case "currentRatio":

      if (number < 1) {

        return {
          className: "red",
          text: "Potential liquidity issue",
        };

      }

      return {
        className: "green",
        text: number <= 2
          ? "Good liquidity"
          : "Comfortable cushion",
      };


    case "quickRatio":

      if (number < 1) {

        return {
          className: "red",
          text: "Insufficient liquidity",
        };

      }

      return {
        className: "green",
        text: number <= 2
          ? "Strong liquidity"
          : "Exceptionally strong",
      };


    case "bookValuePerShare":

      return {
        className: "blue",
        text: "Reference value",
      };


    default:

      return {
        className: "neutral",
        text: "",
      };
  }
}


// =========================================================
// RATING CLASS
// =========================================================

function getRatingClass(score) {

  if (score >= 80) {
    return "rating-green";
  }

  if (score >= 60) {
    return "rating-yellow";
  }

  return "rating-red";
}


// =========================================================
// DISPLAY NAMES
// =========================================================

function formatMetricName(key) {

  const names = {

    priceEarningsRatio:
      "P/E Ratio",

    earningsPerShare:
      "EPS",

    dividendYield:
      "Dividend Yield",

    marketCap:
      "Market Capitalization",

    debtToEquityRatio:
      "Debt / Equity",

    returnOnEquity:
      "ROE",

    returnOnAssets:
      "ROA",

    currentRatio:
      "Current Ratio",

    quickRatio:
      "Quick Ratio",

    bookValuePerShare:
      "Book Value / Share",
  };


  return names[key] || key;
}

// =========================================================
// SECTOR DONUT
// =========================================================

function SectorDonut({ sectors }) {

  const entries =
    Object.entries(sectors || {});

  const total =
    entries.reduce(
      (sum, [, value]) =>
        sum + Number(value),
      0
    );

  const colors = [
    "#4f46e5",
    "#06b6d4",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6"
  ];


  let current = 0;

  const gradientParts =
    entries.map(
      ([, value], index) => {

        const percentage =
          (Number(value) / total) * 100;

        const start =
          current;

        const end =
          current + percentage;

        current = end;

        return `${
          colors[index % colors.length]
        } ${start}% ${end}%`;
      }
    );


  const gradient =
    gradientParts.join(", ");


  return (

    <div className="donut-layout">

      <div
        className="sector-donut"
        style={{
          background:
            `conic-gradient(${gradient})`
        }}
      >

        <div className="donut-center">

          <strong>
            {entries.length}
          </strong>

          <span>
            sectors
          </span>

        </div>

      </div>


      <div className="sector-legend">

        {entries.map(
          ([sector, value], index) => (

            <div
              className="legend-row"
              key={sector}
            >

              <div>

                <span
                  className="legend-dot"
                  style={{
                    background:
                      colors[
                        index %
                        colors.length
                      ]
                  }}
                />

                <span>
                  {sector}
                </span>

              </div>

              <strong>
                {value}%
              </strong>

            </div>

          )
        )}

      </div>

    </div>
  );
}


// =========================================================
// PERFORMANCE CHART
// =========================================================

function PerformanceChart({
  performance
}) {

  const values = [
    Number(
      performance.oneYearReturn || 0
    ),

    Number(
      performance.threeYearReturn || 0
    ),

    Number(
      performance.fiveYearReturn || 0
    )
  ];


  const labels = [
    "1 Year",
    "3 Years",
    "5 Years"
  ];


  const maxValue =
    Math.max(
      ...values,
      1
    );


  const points =
    values.map(
      (value, index) => {

        const x =
          45 +
          index * 145;

        const y =
          170 -
          (value / maxValue) * 120;

        return {
          x,
          y,
          value
        };
      }
    );


  const path =
    points
      .map(
        (point, index) =>
          `${
            index === 0
              ? "M"
              : "L"
          } ${point.x} ${point.y}`
      )
      .join(" ");


  return (

    <div className="performance-chart">

      <svg
        viewBox="0 0 340 210"
        preserveAspectRatio="none"
      >

        {/* GRID */}

        <line
          x1="40"
          y1="170"
          x2="320"
          y2="170"
          className="chart-grid"
        />

        <line
          x1="40"
          y1="110"
          x2="320"
          y2="110"
          className="chart-grid"
        />

        <line
          x1="40"
          y1="50"
          x2="320"
          y2="50"
          className="chart-grid"
        />


        {/* AREA */}

        <path
          d={`${path} L 335 170 L 45 170 Z`}
          className="performance-area"
        />


        {/* LINE */}

        <path
          d={path}
          className="performance-line"
        />


        {/* POINTS */}

        {points.map(
          (point, index) => (

            <g key={index}>

              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                className="performance-point"
              />

              <text
                x={point.x}
                y={point.y - 12}
                textAnchor="middle"
                className="performance-value"
              >
                {point.value}%
              </text>

            </g>

          )
        )}

      </svg>


      <div className="performance-labels">

        {labels.map(
          (label) => (
            <span key={label}>
              {label}
            </span>
          )
        )}

      </div>

    </div>
  );
}

export default App;
