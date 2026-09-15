from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json

from werkzeug.security import generate_password_hash, check_password_hash

from rule_engine import (
    evaluate_stock,
    create_summary,
    calculate_score,
    get_rating,
    get_categories,
    create_insights,
    create_takeaway
)

# ============================================================
# APP SETUP
# ============================================================

app = Flask(__name__)
CORS(app)

DATABASE = "users.db"


# ============================================================
# DATABASE
# ============================================================

def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def create_database():
    connection = get_db()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            stock_symbol TEXT NOT NULL,
            score INTEGER NOT NULL,
            rating TEXT NOT NULL,
            summary TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS portfolio_evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            client_id TEXT NOT NULL,
            total_value REAL NOT NULL,
            fund_count INTEGER NOT NULL,
            risk_level TEXT NOT NULL,
            trader_type TEXT NOT NULL,
            diversification_score REAL,
            summary TEXT NOT NULL,
            result_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    connection.commit()
    connection.close()


# ============================================================
# HEALTH
# ============================================================

@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({"message": "Backend is working!"})

@app.route("/health")
def health():
    return jsonify({"status": "ok"})


# ============================================================
# REGISTER
# ============================================================

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({
            "message": "Email and password are required"
        }), 400

    connection = get_db()

    existing_user = connection.execute(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    if existing_user:
        connection.close()
        return jsonify({
            "message": "User already exists"
        }), 409

    connection.execute(
        """
        INSERT INTO users (email, password)
        VALUES (?, ?)
        """,
        (
            email,
            generate_password_hash(password)
        )
    )

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Registration successful!"
    }), 201


# ============================================================
# LOGIN
# ============================================================

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({
            "message": "Email and password are required"
        }), 400

    connection = get_db()

    user = connection.execute(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    connection.close()

    if not user or not check_password_hash(
        user["password"],
        password
    ):
        return jsonify({
            "message": "Invalid email or password"
        }), 401

    return jsonify({
        "message": "Login successful!"
    })


# ============================================================
# STOCK ANALYSIS
# ============================================================

@app.route("/api/stocks/analyze", methods=["POST"])
def analyze_stock():
    try:
        data = request.get_json() or {}

        # App(4).jsx sends the values at the top level.
        params = data.get("parameters", data)

        symbol = (
            data.get("stockSymbol")
            or params.get("stockSymbol")
        )

        required_fields = [
            "stockSymbol",
            "priceEarningsRatio",
            "earningsPerShare",
            "dividendYield",
            "marketCap",
            "debtToEquityRatio",
            "returnOnEquity",
            "returnOnAssets",
            "currentRatio",
            "quickRatio",
            "bookValuePerShare"
        ]

        if not symbol:
            return jsonify({
                "message": "Missing field: stockSymbol"
            }), 400

        for field in required_fields:
            if field not in data and field not in params:
                return jsonify({
                    "message": f"Missing field: {field}"
                }), 400

        stock = {
            "stockSymbol": str(symbol).upper(),
            "priceEarningsRatio": float(
                params["priceEarningsRatio"]
            ),
            "earningsPerShare": float(
                params["earningsPerShare"]
            ),
            "dividendYield": float(
                params["dividendYield"]
            ),
            "marketCap": float(
                params["marketCap"]
            ),
            "debtToEquityRatio": float(
                params["debtToEquityRatio"]
            ),
            "returnOnEquity": float(
                params["returnOnEquity"]
            ),
            "returnOnAssets": float(
                params["returnOnAssets"]
            ),
            "currentRatio": float(
                params["currentRatio"]
            ),
            "quickRatio": float(
                params["quickRatio"]
            ),
            "bookValuePerShare": float(
                params["bookValuePerShare"]
            )
        }

        feedback = evaluate_stock(stock)
        score = calculate_score(stock)
        rating = get_rating(score)
        categories = get_categories(stock)
        insights = create_insights(stock)

        takeaway = create_takeaway(
            stock,
            categories,
            score
        )

        summary = create_summary(
            stock,
            feedback
        )

        # Save stock analysis.
        try:
            connection = get_db()

            connection.execute(
                """
                INSERT INTO evaluations
                (
                    user_email,
                    stock_symbol,
                    score,
                    rating,
                    summary
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    data.get(
                        "userEmail",
                        "guest@gmail.com"
                    ),
                    stock["stockSymbol"],
                    score,
                    rating,
                    summary
                )
            )

            connection.commit()
            connection.close()

        except Exception as db_error:
            print(
                "Stock database save error:",
                db_error
            )

        return jsonify({
            "stockSymbol": stock["stockSymbol"],
            "score": score,
            "rating": rating,
            "takeaway": takeaway,
            "categories": categories,
            "pros": insights["pros"],
            "cons": insights["cons"],
            "feedback": feedback,
            "summary": summary
        })

    except ValueError:
        return jsonify({
            "message": "Please enter valid numerical values."
        }), 400

    except Exception as error:
        print("STOCK ERROR:", error)

        return jsonify({
            "message": "Something went wrong during analysis."
        }), 500


# ============================================================
# STOCK HISTORY
# ============================================================

@app.route("/api/stocks/history", methods=["GET"])
def get_history():
    email = request.args.get("email")

    if not email:
        return jsonify({"history": []})

    connection = get_db()

    rows = connection.execute(
        """
        SELECT
            stock_symbol,
            score,
            rating,
            summary,
            created_at
        FROM evaluations
        WHERE user_email = ?
        ORDER BY id DESC
        """,
        (email,)
    ).fetchall()

    connection.close()

    return jsonify({
        "history": [dict(row) for row in rows]
    })


# ============================================================
# PORTFOLIO HELPERS
# ============================================================

def allocation_to_dict(items, name_key):
    """
    App(4).jsx sends:
        [
            {"stock": "INFY", "allocation": 0.30},
            {"stock": "HDFC", "allocation": 0.70}
        ]

    The calculations below use:
        {"INFY": 0.30, "HDFC": 0.70}

    A dictionary is also accepted for compatibility.
    """

    if isinstance(items, dict):
        result = {}

        for name, value in items.items():
            result[str(name).strip()] = float(value)

        return result

    if not isinstance(items, list):
        return {}

    result = {}

    for item in items:
        if not isinstance(item, dict):
            continue

        name = str(
            item.get(name_key, "")
        ).strip()

        allocation = item.get("allocation")

        if name and allocation is not None:
            result[name] = float(allocation)

    return result


def calculate_fund_overlap(funds):
    """
    Pairwise overlap:
    sum(min(weight in fund A, weight in fund B))
    for every stock shared by the two funds.

    This follows the portfolio problem statement's
    Fund Overlap calculation.
    """

    if len(funds) < 2:
        return 0.0, 100.0

    overlaps = []

    for i in range(len(funds)):
        for j in range(i + 1, len(funds)):

            holdings_a = funds[i]["holdings"]
            holdings_b = funds[j]["holdings"]

            all_stocks = set(
                holdings_a.keys()
            ) | set(
                holdings_b.keys()
            )

            overlap = sum(
                min(
                    holdings_a.get(stock, 0),
                    holdings_b.get(stock, 0)
                )
                for stock in all_stocks
            )

            overlaps.append(
                overlap * 100
            )

    average_overlap = (
        sum(overlaps) / len(overlaps)
    )

    overlap_score = (
        1 - average_overlap / 100
    ) * 100

    return (
        round(average_overlap, 2),
        round(overlap_score, 2)
    )


def calculate_sector_metrics(funds, total_value):
    """
    Weight every fund's sector allocation by that
    fund's share of the total portfolio.

    Then calculate HHI and Sector Score.
    """

    sector_totals = {}

    for fund in funds:

        fund_weight = (
            fund["amount"] / total_value
        )

        for sector, allocation in fund["sectors"].items():

            sector_totals[sector] = (
                sector_totals.get(sector, 0)
                + fund_weight * allocation
            )

    sector_diversification = {
        sector: round(
            value * 100,
            2
        )
        for sector, value
        in sector_totals.items()
    }

    hhi = sum(
        value ** 2
        for value
        in sector_totals.values()
    )

    sector_score = max(
        0,
        min(
            100,
            (1 - hhi) * 100
        )
    )

    return (
        sector_diversification,
        round(sector_score, 2)
    )


# ============================================================
# PORTFOLIO ANALYSIS
# ============================================================

@app.route("/api/portfolio/analyze", methods=["POST"])
def analyze_portfolio():

    try:
        data = request.get_json() or {}

        user_email = data.get(
            "userEmail",
            "guest@gmail.com"
        )

        client_id = str(
            data.get(
                "clientId",
                ""
            )
        ).strip()

        currency = data.get(
            "currency",
            "INR"
        )

        raw_funds = data.get(
            "funds",
            []
        )

        # ----------------------------------------------------
        # BASIC VALIDATION
        # ----------------------------------------------------

        if not client_id:
            return jsonify({
                "message": "Client ID is required."
            }), 400

        if (
            not isinstance(raw_funds, list)
            or len(raw_funds) == 0
        ):
            return jsonify({
                "message":
                    "Please add at least one fund."
            }), 400

        # ----------------------------------------------------
        # CLEAN FUNDS
        # ----------------------------------------------------

        funds = []

        for index, raw_fund in enumerate(raw_funds):

            if not isinstance(raw_fund, dict):
                return jsonify({
                    "message":
                        f"Invalid data for Fund {index + 1}."
                }), 400

            fund_code = str(
                raw_fund.get(
                    "fundCode",
                    ""
                )
            ).strip().upper()

            if not fund_code:
                return jsonify({
                    "message":
                        f"Fund {index + 1} is missing a fund code."
                }), 400

            try:
                amount = float(
                    raw_fund.get(
                        "amount",
                        0
                    )
                )
            except (TypeError, ValueError):
                return jsonify({
                    "message":
                        f"Amount for {fund_code} must be a number."
                }), 400

            if amount <= 0:
                return jsonify({
                    "message":
                        f"Amount for {fund_code} must be greater than 0."
                }), 400

            holdings = allocation_to_dict(
                raw_fund.get(
                    "holdings",
                    []
                ),
                "stock"
            )

            sectors = allocation_to_dict(
                raw_fund.get(
                    "sectors",
                    []
                ),
                "sector"
            )

            if not holdings:
                return jsonify({
                    "message":
                        f"{fund_code} needs at least one holding."
                }), 400

            if not sectors:
                return jsonify({
                    "message":
                        f"{fund_code} needs at least one sector."
                }), 400

            # The frontend converts percentages to decimals.
            holding_total = sum(
                holdings.values()
            )

            sector_total = sum(
                sectors.values()
            )

            if any(
                value < 0
                for value in holdings.values()
            ):
                return jsonify({
                    "message":
                        f"Holding allocation cannot be negative for {fund_code}."
                }), 400

            if any(
                value < 0
                for value in sectors.values()
            ):
                return jsonify({
                    "message":
                        f"Sector allocation cannot be negative for {fund_code}."
                }), 400

            if abs(
                holding_total - 1.0
            ) > 0.01:
                return jsonify({
                    "message":
                        f"Holdings in {fund_code} must add up to 100%."
                }), 400

            if abs(
                sector_total - 1.0
            ) > 0.01:
                return jsonify({
                    "message":
                        f"Sector allocation in {fund_code} must add up to 100%."
                }), 400

            performance = raw_fund.get(
                "performance",
                {}
            )

            if not isinstance(
                performance,
                dict
            ):
                performance = {}

            funds.append({
                "fundCode": fund_code,
                "amount": amount,
                "holdings": holdings,
                "sectors": sectors,
                "performance": {
                    "oneYearReturn": float(
                        performance.get(
                            "oneYearReturn",
                            0
                        ) or 0
                    ),
                    "threeYearReturn": float(
                        performance.get(
                            "threeYearReturn",
                            0
                        ) or 0
                    ),
                    "fiveYearReturn": float(
                        performance.get(
                            "fiveYearReturn",
                            0
                        ) or 0
                    )
                }
            })

        # ----------------------------------------------------
        # TOTAL PORTFOLIO VALUE
        # ----------------------------------------------------

        total_value = sum(
            fund["amount"]
            for fund in funds
        )

        fund_count = len(funds)

        # ----------------------------------------------------
        # FUND ALLOCATION
        # ----------------------------------------------------

        fund_allocation = []

        for fund in funds:

            percentage = (
                fund["amount"]
                / total_value
                * 100
            )

            fund_allocation.append({
                "fundCode": fund["fundCode"],
                "amount": fund["amount"],
                "percentage": round(
                    percentage,
                    2
                )
            })

        # ----------------------------------------------------
        # FUND OVERLAP
        # ----------------------------------------------------

        (
            average_fund_overlap,
            overlap_score
        ) = calculate_fund_overlap(
            funds
        )

        # ----------------------------------------------------
        # SECTOR DIVERSIFICATION
        # ----------------------------------------------------

        (
            sector_diversification,
            sector_score
        ) = calculate_sector_metrics(
            funds,
            total_value
        )

        # ----------------------------------------------------
        # FINAL DIVERSIFICATION SCORE
        # ----------------------------------------------------

        # The supplied problem statement defines:
        #
        # Final Score =
        # 0.5 * Overlap Score +
        # 0.5 * Sector Score

        diversification_score = round(
            (
                overlap_score
                + sector_score
            ) / 2,
            2
        )

        # ----------------------------------------------------
        # RISK LEVEL
        # ----------------------------------------------------

        if diversification_score >= 70:
            risk_level = "Low"

        elif diversification_score >= 50:
            risk_level = "Moderate"

        else:
            risk_level = "High"

        # ----------------------------------------------------
        # PERFORMANCE
        # ----------------------------------------------------

        performance = {}

        for key in [
            "oneYearReturn",
            "threeYearReturn",
            "fiveYearReturn"
        ]:

            weighted_return = 0

            for fund in funds:

                fund_weight = (
                    fund["amount"]
                    / total_value
                )

                weighted_return += (
                    fund_weight
                    * fund["performance"].get(
                        key,
                        0
                    )
                )

            performance[key] = round(
                weighted_return,
                2
            )

        # ----------------------------------------------------
        # TRADER TYPE
        # ----------------------------------------------------

        one_year = performance[
            "oneYearReturn"
        ]

        three_year = performance[
            "threeYearReturn"
        ]

        five_year = performance[
            "fiveYearReturn"
        ]

        if (
            one_year >= 12
            and three_year >= 18
            and five_year >= 20
        ):
            trader_type = "Growth Investor"

        elif (
            one_year >= 8
            and three_year >= 12
        ):
            trader_type = "Balanced Investor"

        else:
            trader_type = "Conservative Investor"

        # ----------------------------------------------------
        # POSSIBLE DIVERSIFICATION
        # ----------------------------------------------------

        candidate_sectors = {
            "Consumer Staples":
                "Consider adding stocks or funds in the Consumer Staples sector to balance your portfolio.",

            "Utilities":
                "Investing in Utilities can provide stable dividends and lower volatility.",

            "Healthcare":
                "Consider Healthcare exposure to broaden your sector diversification.",

            "Industrials":
                "Industrials can provide another source of sector diversification."
        }

        possible_diversification = []

        for sector, recommendation in candidate_sectors.items():

            if sector not in sector_diversification:

                possible_diversification.append({
                    "sector": sector,
                    "recommendation": recommendation
                })

        possible_diversification = (
            possible_diversification[:2]
        )

        # ----------------------------------------------------
        # SUMMARY
        # ----------------------------------------------------

        if sector_diversification:

            largest_sector = max(
                sector_diversification,
                key=sector_diversification.get
            )

            largest_percentage = (
                sector_diversification[
                    largest_sector
                ]
            )

        else:
            largest_sector = "No sector data"
            largest_percentage = 0

        if average_fund_overlap >= 50:
            overlap_message = (
                f"Fund overlap is relatively high at "
                f"{average_fund_overlap:.1f}%."
            )
        elif average_fund_overlap > 0:
            overlap_message = (
                f"Average fund overlap is "
                f"{average_fund_overlap:.1f}%."
            )
        else:
            overlap_message = (
                "There is no measurable overlap between "
                "the funds."
            )

        summary = (
            f"Your portfolio is most concentrated in "
            f"{largest_sector} at "
            f"{largest_percentage:.1f}%. "
            f"{overlap_message} "
            f"The final diversification score is "
            f"{diversification_score:.1f}/100, "
            f"indicating {risk_level.lower()} diversification risk. "
            f"Your return profile suggests a "
            f"{trader_type.lower()} approach."
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        result = {
            "portfolioAnalysis": {

                "totalValue":
                    total_value,

                "currency":
                    currency,

                "fundCount":
                    fund_count,

                "fundAllocation":
                    fund_allocation,

                "averageFundOverlap":
                    average_fund_overlap,

                "overlapScore":
                    overlap_score,

                "sectorDiversification":
                    sector_diversification,

                "sectorScore":
                    sector_score,

                "diversificationScore":
                    diversification_score,

                "riskLevel":
                    risk_level,

                "performance":
                    performance
            },

            "possibleDiversification":
                possible_diversification,

            "traderType":
                trader_type,

            "summary":
                summary
        }

        # ----------------------------------------------------
        # SAVE PORTFOLIO RESULT
        # ----------------------------------------------------

        connection = get_db()

        connection.execute(
            """
            INSERT INTO portfolio_evaluations
            (
                user_email,
                client_id,
                total_value,
                fund_count,
                risk_level,
                trader_type,
                diversification_score,
                summary,
                result_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_email,
                client_id,
                total_value,
                fund_count,
                risk_level,
                trader_type,
                diversification_score,
                summary,
                json.dumps(result)
            )
        )

        connection.commit()
        connection.close()

        return jsonify(result), 200

    except ValueError:
        return jsonify({
            "message":
                "Please enter valid numerical values."
        }), 400

    except Exception as error:
        print(
            "PORTFOLIO ERROR:",
            error
        )

        return jsonify({
            "message":
                "Something went wrong during portfolio analysis."
        }), 500


# ============================================================
# PORTFOLIO HISTORY
# ============================================================

@app.route("/api/portfolio/history", methods=["GET"])
def get_portfolio_history():

    email = request.args.get("email")

    if not email:
        return jsonify({
            "history": []
        })

    connection = get_db()

    rows = connection.execute(
        """
        SELECT
            client_id,
            total_value,
            fund_count,
            risk_level,
            trader_type,
            diversification_score,
            summary,
            result_json,
            created_at
        FROM portfolio_evaluations
        WHERE user_email = ?
        ORDER BY id DESC
        """,
        (email,)
    ).fetchall()

    connection.close()

    history = []

    for row in rows:

        item = dict(row)

        try:
            item["result_json"] = json.loads(
                item["result_json"]
            )
        except Exception:
            pass

        history.append(item)

    return jsonify({
        "history": history
    })


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":
    create_database()

    app.run(
        debug=True,
        port=5000
    )
