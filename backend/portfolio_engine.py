# ============================================================
# PORTFOLIO ANALYSIS ENGINE
# ============================================================

from itertools import combinations


# ------------------------------------------------------------
# FUND OVERLAP
# ------------------------------------------------------------

def calculate_fund_overlap(fund_a, fund_b):
    """
    Calculates overlap between two funds.

    Example:
    Fund A: INFY 30%, HDFC 50%, ITC 20%
    Fund B: INFY 40%, HDFC 30%

    Overlap:
    min(30,40) + min(50,30) + min(20,0)
    = 30 + 30 + 0
    = 60%
    """

    holdings_a = fund_a.get("holdings", {})
    holdings_b = fund_b.get("holdings", {})

    all_stocks = set(holdings_a) | set(holdings_b)

    overlap = 0.0

    for stock in all_stocks:
        allocation_a = float(holdings_a.get(stock, 0))
        allocation_b = float(holdings_b.get(stock, 0))

        overlap += min(allocation_a, allocation_b)

    return overlap * 100


def calculate_average_overlap(funds):
    """
    Calculates average pairwise fund overlap.
    """

    if len(funds) < 2:
        return 0.0

    overlaps = []

    for fund_a, fund_b in combinations(funds, 2):
        overlap = calculate_fund_overlap(fund_a, fund_b)
        overlaps.append(overlap)

    return sum(overlaps) / len(overlaps)


# ------------------------------------------------------------
# COMBINED HOLDINGS
# ------------------------------------------------------------

def calculate_combined_holdings(funds):
    """
    Calculates the portfolio-level holding exposure.

    Each fund is weighted by its share of total portfolio value.
    """

    total_value = sum(float(fund["amount"]) for fund in funds)

    if total_value == 0:
        return {}

    combined = {}

    for fund in funds:

        fund_amount = float(fund["amount"])

        fund_weight = fund_amount / total_value

        for stock, allocation in fund.get("holdings", {}).items():

            contribution = fund_weight * float(allocation)

            combined[stock] = (
                combined.get(stock, 0) + contribution
            )

    return {
        stock: round(value * 100, 2)
        for stock, value in combined.items()
    }


# ------------------------------------------------------------
# SECTOR DIVERSIFICATION
# ------------------------------------------------------------

def calculate_sector_diversification(funds):
    """
    Calculates weighted sector exposure.

    Example:

    Fund A share = 40%
    Fund B share = 40%
    Fund C share = 20%

    IT =
    (0.40 × 0.30)
    + (0.40 × 0.40)
    + (0.20 × 0.80)

    = 44%
    """

    total_value = sum(float(fund["amount"]) for fund in funds)

    if total_value == 0:
        return {}

    sectors = {}

    for fund in funds:

        fund_amount = float(fund["amount"])

        fund_weight = fund_amount / total_value

        for sector, allocation in fund.get(
            "sectors", {}
        ).items():

            contribution = (
                fund_weight * float(allocation)
            )

            sectors[sector] = (
                sectors.get(sector, 0)
                + contribution
            )

    return {
        sector: round(value * 100, 2)
        for sector, value in sectors.items()
    }


# ------------------------------------------------------------
# HHI — HERFINDAHL-HIRSCHMAN INDEX
# ------------------------------------------------------------

def calculate_hhi(sector_diversification):

    if not sector_diversification:
        return 1.0

    hhi = 0.0

    for percentage in sector_diversification.values():

        decimal_value = percentage / 100

        hhi += decimal_value ** 2

    return hhi


def calculate_sector_score(sector_diversification):

    hhi = calculate_hhi(sector_diversification)

    score = (1 - hhi) * 100

    return round(score, 2)


# ------------------------------------------------------------
# FINAL DIVERSIFICATION SCORE
# ------------------------------------------------------------

def calculate_diversification_score(
    average_overlap,
    sector_score
):

    overlap_score = 100 - average_overlap

    final_score = (
        0.5 * overlap_score
        + 0.5 * sector_score
    )

    return round(final_score, 2)


# ------------------------------------------------------------
# RISK LEVEL
# ------------------------------------------------------------

def get_risk_level(diversification_score):

    if diversification_score >= 70:
        return "Low"

    if diversification_score >= 50:
        return "Moderate"

    return "High"


# ------------------------------------------------------------
# PORTFOLIO PERFORMANCE
# ------------------------------------------------------------

def calculate_performance(funds):

    total_value = sum(
        float(fund["amount"])
        for fund in funds
    )

    if total_value == 0:
        return {
            "oneYearReturn": 0,
            "threeYearReturn": 0,
            "fiveYearReturn": 0
        }

    one_year = 0
    three_year = 0
    five_year = 0

    for fund in funds:

        weight = (
            float(fund["amount"])
            / total_value
        )

        performance = fund.get(
            "performance",
            {}
        )

        one_year += (
            weight
            * float(
                performance.get(
                    "oneYearReturn", 0
                )
            )
        )

        three_year += (
            weight
            * float(
                performance.get(
                    "threeYearReturn", 0
                )
            )
        )

        five_year += (
            weight
            * float(
                performance.get(
                    "fiveYearReturn", 0
                )
            )
        )

    return {
        "oneYearReturn": round(one_year, 2),
        "threeYearReturn": round(three_year, 2),
        "fiveYearReturn": round(five_year, 2)
    }


# ------------------------------------------------------------
# TRADER TYPE
# ------------------------------------------------------------

def get_trader_type(performance, risk_level):

    one_year = performance["oneYearReturn"]
    three_year = performance["threeYearReturn"]
    five_year = performance["fiveYearReturn"]

    if (
        one_year >= 12
        and three_year >= 18
        and five_year >= 20
    ):
        return "Growth Investor"

    if (
        one_year >= 8
        and three_year >= 12
    ):
        return "Balanced Investor"

    return "Conservative Investor"


# ------------------------------------------------------------
# DIVERSIFICATION RECOMMENDATIONS
# ------------------------------------------------------------

def create_diversification_recommendations(
    sector_diversification
):

    recommendations = []

    existing_sectors = {
        sector.lower()
        for sector in sector_diversification
    }

    possible_sectors = {

        "Consumer Staples": (
            "Consider adding Consumer Staples "
            "stocks or funds to introduce more "
            "defensive exposure."
        ),

        "Utilities": (
            "Utilities can provide relatively "
            "stable demand and help balance "
            "higher-growth sectors."
        ),

        "Healthcare": (
            "Healthcare exposure can add another "
            "source of diversification and reduce "
            "dependence on a small number of sectors."
        ),

        "Industrials": (
            "Industrials can broaden exposure "
            "beyond technology and financial sectors."
        ),

        "Real Estate": (
            "Real Estate exposure may provide "
            "additional diversification across "
            "different economic drivers."
        )
    }

    for sector, recommendation in possible_sectors.items():

        if sector.lower() not in existing_sectors:

            recommendations.append({
                "sector": sector,
                "recommendation": recommendation
            })

    # Return only the top 3 suggestions
    return recommendations[:3]


# ------------------------------------------------------------
# PORTFOLIO SUMMARY
# ------------------------------------------------------------

def create_portfolio_summary(
    sector_diversification,
    risk_level,
    performance,
    trader_type,
    recommendations
):

    sorted_sectors = sorted(
        sector_diversification.items(),
        key=lambda item: item[1],
        reverse=True
    )

    if sorted_sectors:

        top_sector = sorted_sectors[0][0]
        top_percentage = sorted_sectors[0][1]

    else:

        top_sector = "multiple sectors"
        top_percentage = 0

    if len(sorted_sectors) > 1:

        second_sector = sorted_sectors[1][0]

    else:

        second_sector = "other sectors"

    recommendation_text = ""

    if recommendations:

        names = [
            item["sector"]
            for item in recommendations[:2]
        ]

        recommendation_text = (
            f" Consider diversifying into "
            f"{' and '.join(names)} to improve "
            f"portfolio balance."
        )

    if performance["oneYearReturn"] >= 12:

        performance_text = (
            "Your recent performance is strong"
        )

    elif performance["oneYearReturn"] >= 8:

        performance_text = (
            "Your recent performance is moderate"
        )

    else:

        performance_text = (
            "Your recent performance is relatively modest"
        )

    return (
        f"Your portfolio is most concentrated in "
        f"{top_sector} ({top_percentage:.1f}%) "
        f"followed by {second_sector}. "
        f"The overall diversification profile is "
        f"{risk_level.lower()}.{recommendation_text} "
        f"{performance_text}, indicating a "
        f"{trader_type.lower()} investment style."
    )


# ------------------------------------------------------------
# COMPLETE PORTFOLIO ANALYSIS
# ------------------------------------------------------------

def analyze_portfolio(data):

    funds = data.get("funds", [])

    if not funds:

        raise ValueError(
            "At least one fund is required."
        )

    total_value = sum(
        float(fund["amount"])
        for fund in funds
    )

    if total_value <= 0:

        raise ValueError(
            "Total portfolio value must be greater than zero."
        )

    # ------------------------------------------
    # Sector analysis
    # ------------------------------------------

    sector_diversification = (
        calculate_sector_diversification(funds)
    )

    sector_score = calculate_sector_score(
        sector_diversification
    )

    # ------------------------------------------
    # Fund overlap
    # ------------------------------------------

    average_overlap = (
        calculate_average_overlap(funds)
    )

    overlap_score = 100 - average_overlap

    # ------------------------------------------
    # Final diversification
    # ------------------------------------------

    diversification_score = (
        calculate_diversification_score(
            average_overlap,
            sector_score
        )
    )

    # ------------------------------------------
    # Risk
    # ------------------------------------------

    risk_level = get_risk_level(
        diversification_score
    )

    # ------------------------------------------
    # Performance
    # ------------------------------------------

    performance = calculate_performance(
        funds
    )

    # ------------------------------------------
    # Trader type
    # ------------------------------------------

    trader_type = get_trader_type(
        performance,
        risk_level
    )

    # ------------------------------------------
    # Recommendations
    # ------------------------------------------

    recommendations = (
        create_diversification_recommendations(
            sector_diversification
        )
    )

    # ------------------------------------------
    # Summary
    # ------------------------------------------

    summary = create_portfolio_summary(
        sector_diversification,
        risk_level,
        performance,
        trader_type,
        recommendations
    )

    # ------------------------------------------
    # Fund allocation
    # ------------------------------------------

    fund_allocation = []

    for fund in funds:

        amount = float(fund["amount"])

        percentage = (
            amount / total_value
        ) * 100

        fund_allocation.append({

            "fundCode": fund["fundCode"],

            "amount": amount,

            "percentage": round(
                percentage,
                2
            )
        })

    # ------------------------------------------
    # Combined holdings
    # ------------------------------------------

    combined_holdings = (
        calculate_combined_holdings(funds)
    )

    # ------------------------------------------
    # Final response
    # ------------------------------------------

    return {

        "portfolioAnalysis": {

            "totalValue": total_value,

            "fundCount": len(funds),

            "fundAllocation": fund_allocation,

            "combinedHoldings": combined_holdings,

            "sectorDiversification":
                sector_diversification,

            "riskLevel": risk_level,

            "diversificationScore":
                diversification_score,

            "overlapScore":
                round(overlap_score, 2),

            "averageFundOverlap":
                round(average_overlap, 2),

            "sectorScore":
                sector_score,

            "performance": performance
        },

        "possibleDiversification":
            recommendations,

        "traderType":
            trader_type,

        "summary":
            summary
    }