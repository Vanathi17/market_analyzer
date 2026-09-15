import json


# ============================================================
# LOAD RULES
# ============================================================

with open("rules.json", "r") as file:
    rules_data = json.load(file)

rules = rules_data["stockEvaluator"]


# ============================================================
# EVALUATE EACH STOCK PARAMETER
# ============================================================

def evaluate_stock(stock):

    feedback = {}

    for metric in rules.keys():

        value = stock.get(metric)

        if value is None:
            feedback[metric] = f"No data available for {metric}."
            continue


        # ====================================================
        # ROE
        # ====================================================

        if metric == "returnOnEquity":

            display_value = value * 100

            if display_value < 8:

                comment = (
                    f"The ROE of {display_value:.2f}% is below average."
                )

            elif display_value <= 15:

                comment = (
                    f"The ROE of {display_value:.2f}% is healthy."
                )

            else:

                comment = (
                    f"The ROE of {display_value:.2f}% is very strong, "
                    "showing efficient profit generation."
                )


        # ====================================================
        # ROA
        # ====================================================

        elif metric == "returnOnAssets":

            display_value = value * 100

            if display_value < 5:

                comment = (
                    f"The ROA of {display_value:.2f}% is modest."
                )

            elif display_value <= 10:

                comment = (
                    f"The ROA of {display_value:.2f}% indicates "
                    "efficient asset utilization."
                )

            else:

                comment = (
                    f"The ROA of {display_value:.2f}% is excellent, "
                    "showing superb asset productivity."
                )


        # ====================================================
        # P/E RATIO
        # ====================================================

        elif metric == "priceEarningsRatio":

            if value < 15:

                comment = (
                    f"The P/E ratio of {value:.2f} suggests the stock "
                    "is cheap relative to earnings."
                )

            elif value <= 30:

                comment = (
                    f"The P/E ratio of {value:.2f} is fairly typical."
                )

            else:

                comment = (
                    f"The P/E ratio of {value:.2f} indicates the stock "
                    "is relatively expensive compared to its earnings."
                )


        # ====================================================
        # EPS
        # ====================================================

        elif metric == "earningsPerShare":

            if value < 1:

                comment = (
                    f"The EPS of {value:.2f} is low; "
                    "profitability may be a concern."
                )

            elif value < 5:

                comment = (
                    f"The EPS of {value:.2f} shows modest profitability."
                )

            else:

                comment = (
                    f"The EPS of {value:.2f} is a strong indicator "
                    "of the company's profitability."
                )


        # ====================================================
        # DIVIDEND YIELD
        # ====================================================

        elif metric == "dividendYield":

            if value < 1:

                comment = (
                    f"The dividend yield of {value:.2f}% is lower "
                    "than the market average."
                )

            elif value <= 3:

                comment = (
                    f"The dividend yield of {value:.2f}% is around "
                    "the market norm."
                )

            else:

                comment = (
                    f"The dividend yield of {value:.2f}% is attractive "
                    "for income-focused investors."
                )


        # ====================================================
        # MARKET CAP
        # ====================================================

        elif metric == "marketCap":

            trillion = 1_000_000_000_000

            market_cap_trillion = value / trillion

            if value >= 500 * trillion:

                comment = (
                    f"The market cap of {market_cap_trillion:.2f} trillion "
                    "makes it one of the world's giants."
                )

            elif value >= 100 * trillion:

                comment = (
                    f"The market cap of {market_cap_trillion:.2f} trillion "
                    "indicates a very large, stable company."
                )

            else:

                comment = (
                    f"The market capitalization of "
                    f"{market_cap_trillion:.2f} trillion indicates "
                    "a sizable player."
                )


        # ====================================================
        # DEBT TO EQUITY
        # ====================================================

        elif metric == "debtToEquityRatio":

            if value < 0.5:

                comment = (
                    f"The debt-to-equity ratio of {value:.2f} suggests "
                    "very little leverage."
                )

            elif value <= 1.5:

                comment = (
                    f"The debt-to-equity ratio of {value:.2f} suggests "
                    "a moderate level of leverage."
                )

            else:

                comment = (
                    f"The debt-to-equity ratio of {value:.2f} indicates "
                    "high leverage; watch for risk."
                )


        # ====================================================
        # CURRENT RATIO
        # ====================================================

        elif metric == "currentRatio":

            if value < 1:

                comment = (
                    f"The current ratio of {value:.2f} signals potential "
                    "short-term liquidity issues."
                )

            elif value <= 2:

                comment = (
                    f"The current ratio of {value:.2f} suggests the company "
                    "has a good short-term liquidity position."
                )

            else:

                comment = (
                    f"The current ratio of {value:.2f} indicates a very "
                    "comfortable liquidity cushion."
                )


        # ====================================================
        # QUICK RATIO
        # ====================================================

        elif metric == "quickRatio":

            if value < 1:

                comment = (
                    f"The quick ratio of {value:.2f} may be insufficient "
                    "for immediate obligations."
                )

            elif value <= 2:

                comment = (
                    f"The quick ratio of {value:.2f} indicates a strong "
                    "ability to meet short-term obligations."
                )

            else:

                comment = (
                    f"The quick ratio of {value:.2f} shows an exceptionally "
                    "strong liquidity position."
                )


        # ====================================================
        # BOOK VALUE PER SHARE
        # ====================================================

        elif metric == "bookValuePerShare":

            comment = (
                f"The book value per share of {value:.2f} is a measure "
                "of the company's net asset value on a per-share basis."
            )


        else:

            comment = f"No evaluation rule found for {metric}."


        feedback[metric] = comment


    return feedback


# ============================================================
# GET STATUS OF EACH PARAMETER
# ============================================================

def get_metric_status(metric, value):

    if value is None:
        return "neutral"

    # --------------------------------------------------------
    # P/E
    # --------------------------------------------------------

    if metric == "priceEarningsRatio":

        if value < 15:
            return "green"

        elif value <= 30:
            return "yellow"

        else:
            return "red"


    # --------------------------------------------------------
    # EPS
    # --------------------------------------------------------

    if metric == "earningsPerShare":

        if value < 1:
            return "red"

        elif value < 5:
            return "yellow"

        else:
            return "green"


    # --------------------------------------------------------
    # Dividend Yield
    # --------------------------------------------------------

    if metric == "dividendYield":

        if value < 1:
            return "red"

        elif value <= 3:
            return "yellow"

        else:
            return "green"


    # --------------------------------------------------------
    # Market Cap
    # --------------------------------------------------------

    if metric == "marketCap":

        trillion = 1_000_000_000_000

        if value >= 500 * trillion:
            return "green"

        elif value >= 100 * trillion:
            return "green"

        else:
            return "yellow"


    # --------------------------------------------------------
    # Debt / Equity
    # --------------------------------------------------------

    if metric == "debtToEquityRatio":

        if value < 0.5:
            return "green"

        elif value <= 1.5:
            return "yellow"

        else:
            return "red"


    # --------------------------------------------------------
    # ROE
    # --------------------------------------------------------

    if metric == "returnOnEquity":

        percentage = value * 100

        if percentage < 8:
            return "red"

        elif percentage <= 15:
            return "yellow"

        else:
            return "green"


    # --------------------------------------------------------
    # ROA
    # --------------------------------------------------------

    if metric == "returnOnAssets":

        percentage = value * 100

        if percentage < 5:
            return "red"

        elif percentage <= 10:
            return "green"

        else:
            return "green"


    # --------------------------------------------------------
    # Current Ratio
    # --------------------------------------------------------

    if metric == "currentRatio":

        if value < 1:
            return "red"

        elif value <= 2:
            return "green"

        else:
            return "green"


    # --------------------------------------------------------
    # Quick Ratio
    # --------------------------------------------------------

    if metric == "quickRatio":

        if value < 1:
            return "red"

        elif value <= 2:
            return "green"

        else:
            return "green"


    # --------------------------------------------------------
    # Book Value
    # --------------------------------------------------------

    if metric == "bookValuePerShare":
        return "blue"


    return "neutral"


# ============================================================
# STATUS TEXT
# ============================================================

def get_status_text(metric, status):

    status_text = {

        "priceEarningsRatio": {
            "green": "Lower valuation",
            "yellow": "Fairly typical",
            "red": "Relatively expensive",
        },

        "earningsPerShare": {
            "green": "Strong earnings",
            "yellow": "Modest earnings",
            "red": "Low earnings",
        },

        "dividendYield": {
            "green": "Attractive yield",
            "yellow": "Around market norm",
            "red": "Lower than market average",
        },

        "marketCap": {
            "green": "Very large company",
            "yellow": "Sizable player",
            "red": "Sizable player",
        },

        "debtToEquityRatio": {
            "green": "Very little leverage",
            "yellow": "Moderate leverage",
            "red": "High leverage",
        },

        "returnOnEquity": {
            "green": "Very strong",
            "yellow": "Healthy",
            "red": "Below average",
        },

        "returnOnAssets": {
            "green": "Efficient",
            "yellow": "Efficient",
            "red": "Modest efficiency",
        },

        "currentRatio": {
            "green": "Good liquidity",
            "yellow": "Good liquidity",
            "red": "Liquidity concern",
        },

        "quickRatio": {
            "green": "Strong liquidity",
            "yellow": "Strong liquidity",
            "red": "Insufficient liquidity",
        },

        "bookValuePerShare": {
            "blue": "Reference value",
        },
    }

    return status_text.get(metric, {}).get(status, "")


# ============================================================
# SCORE
# ============================================================

def calculate_score(stock):

    score = 0
    maximum_score = 0

    for metric in rules.keys():

        # Book value is informational only.
        if metric == "bookValuePerShare":
            continue

        value = stock.get(metric)

        if value is None:
            continue

        status = get_metric_status(metric, value)

        maximum_score += 2

        if status == "green":
            score += 2

        elif status == "yellow":
            score += 1

        elif status == "red":
            score += 0


    if maximum_score == 0:
        return 0

    return round((score / maximum_score) * 100)


# ============================================================
# OVERALL RATING
# ============================================================

def get_rating(score):

    if score >= 80:
        return "FINANCIALLY STRONG"

    elif score >= 60:
        return "FINANCIALLY HEALTHY"

    elif score >= 40:
        return "MODERATE"

    else:
        return "NEEDS ATTENTION"


# ============================================================
# CATEGORY ANALYSIS
# ============================================================

def get_categories(stock):

    statuses = {}

    for metric in rules.keys():

        if metric == "bookValuePerShare":
            continue

        value = stock.get(metric)

        if value is not None:
            statuses[metric] = get_metric_status(metric, value)


    # -------------------------
    # PROFITABILITY
    # -------------------------

    profitability = [
        statuses.get("earningsPerShare"),
        statuses.get("returnOnEquity"),
        statuses.get("returnOnAssets"),
    ]

    profitability = [x for x in profitability if x]

    if profitability:

        green = profitability.count("green")
        red = profitability.count("red")

        if green >= 2:
            profitability_result = "Strong"

        elif red >= 2:
            profitability_result = "Needs Attention"

        else:
            profitability_result = "Moderate"

    else:
        profitability_result = "Not Available"


    # -------------------------
    # LIQUIDITY
    # -------------------------

    liquidity = [
        statuses.get("currentRatio"),
        statuses.get("quickRatio"),
    ]

    liquidity = [x for x in liquidity if x]

    if liquidity:

        if all(x == "green" for x in liquidity):
            liquidity_result = "Strong"

        elif any(x == "red" for x in liquidity):
            liquidity_result = "Needs Attention"

        else:
            liquidity_result = "Moderate"

    else:
        liquidity_result = "Not Available"


    # -------------------------
    # LEVERAGE
    # -------------------------

    leverage_status = statuses.get("debtToEquityRatio")

    if leverage_status == "green":
        leverage_result = "Low"

    elif leverage_status == "yellow":
        leverage_result = "Moderate"

    elif leverage_status == "red":
        leverage_result = "High"

    else:
        leverage_result = "Not Available"


    # -------------------------
    # VALUATION
    # -------------------------

    pe_status = statuses.get("priceEarningsRatio")

    if pe_status == "green":
        valuation_result = "Attractive"

    elif pe_status == "yellow":
        valuation_result = "Typical"

    elif pe_status == "red":
        valuation_result = "Caution"

    else:
        valuation_result = "Not Available"


    # -------------------------
    # DIVIDEND
    # -------------------------

    dividend_status = statuses.get("dividendYield")

    if dividend_status == "green":
        dividend_result = "Attractive"

    elif dividend_status == "yellow":
        dividend_result = "Moderate"

    elif dividend_status == "red":
        dividend_result = "Low"

    else:
        dividend_result = "Not Available"


    return {
        "profitability": profitability_result,
        "liquidity": liquidity_result,
        "leverage": leverage_result,
        "valuation": valuation_result,
        "dividend": dividend_result,
    }


# ============================================================
# PROS / CONS / WATCH AREAS
# ============================================================

def create_insights(stock):

    pros = []
    cons = []
    watch_areas = []

    metric_names = {

        "priceEarningsRatio": "P/E ratio",
        "earningsPerShare": "EPS",
        "dividendYield": "Dividend yield",
        "marketCap": "Market capitalization",
        "debtToEquityRatio": "Debt-to-equity",
        "returnOnEquity": "ROE",
        "returnOnAssets": "ROA",
        "currentRatio": "Current ratio",
        "quickRatio": "Quick ratio",
    }


    for metric in metric_names:

        value = stock.get(metric)

        if value is None:
            continue

        status = get_metric_status(metric, value)

        text = get_status_text(metric, status)

        name = metric_names[metric]


        if status == "green":

            pros.append(f"{name}: {text}.")

        elif status == "red":

            cons.append(f"{name}: {text}.")

        elif status == "yellow":

            watch_areas.append(f"{name}: {text}.")


    return {
        "pros": pros,
        "cons": cons,
        "watchAreas": watch_areas,
    }


# ============================================================
# INVESTOR TAKEAWAY
# ============================================================

def create_takeaway(stock, categories, score):

    strengths = []

    concerns = []


    if categories["profitability"] == "Strong":
        strengths.append("strong profitability")

    if categories["liquidity"] == "Strong":
        strengths.append("healthy liquidity")

    if categories["leverage"] == "Low":
        strengths.append("low financial leverage")


    if categories["valuation"] == "Caution":
        concerns.append("valuation appears relatively high")

    if categories["leverage"] == "High":
        concerns.append("high financial leverage")

    if categories["profitability"] == "Needs Attention":
        concerns.append("profitability needs attention")

    if categories["liquidity"] == "Needs Attention":
        concerns.append("liquidity needs attention")


    if strengths and concerns:

        return (
            f"The stock shows {', '.join(strengths)}, "
            f"while {', '.join(concerns)}."
        )

    elif strengths:

        return (
            f"The stock shows {', '.join(strengths)} "
            "based on the evaluated fundamentals."
        )

    elif concerns:

        return (
            f"The analysis highlights {', '.join(concerns)}."
        )

    else:

        return (
            "The stock presents a mixed fundamental picture "
            "based on the evaluated parameters."
        )


# ============================================================
# SUMMARY
# ============================================================

def create_summary(stock, feedback):

    summary_parts = rules_data["summary"]["summaryParts"]

    summary = []

    for metric in summary_parts:

        if metric in feedback:
            summary.append(feedback[metric])

    separator = rules_data["summary"].get(
        "separator",
        " "
    )

    return separator.join(summary)