# ── calcMetrics: compute rejection metrics from simulation results ────────────
# Ported from app_muce.R calcMetrics function
#
# Arguments:
#   result    - list with `final.prob.H1` matrix (simN x nbasket),
#               `futility` and `efficacy` matrices (simN x nbasket),
#               `final.basket.n` matrix (simN x nbasket)
#   p.true    - numeric vector of true response rates (length nbasket)
#   q0        - numeric vector of null response rates (length nbasket)
#   threshold - numeric vector of rejection thresholds (length nbasket)
#
# Returns a list with:
#   reject.rate, type1.error, power, FWER, disjunctive.power,
#   conjunctive.power, null.baskets, alt.baskets

calcMetrics <- function(result, p.true, q0, threshold) {
  nbasket <- ncol(result$final.prob.H1)
  simN <- nrow(result$final.prob.H1)

  # Identify null and alternative baskets
  null.baskets <- which(abs(p.true - q0) < 0.001)
  alt.baskets <- which(p.true > q0 + 0.001)

  # Per-basket rejection rates
  reject <- result$final.prob.H1 > matrix(rep(threshold, simN), nrow = simN, byrow = TRUE)
  reject.rate <- colMeans(reject)

  # Type I error (for null baskets)
  type1.error <- reject.rate[null.baskets]

  # Power (for alternative baskets)
  power <- reject.rate[alt.baskets]

  # FWER: probability of at least one false positive among null baskets
  if (length(null.baskets) > 0) {
    FWER <- mean(rowSums(reject[, null.baskets, drop = FALSE]) >= 1)
  } else {
    FWER <- NA
  }

  # Disjunctive power: probability of at least one true positive among alt baskets
  if (length(alt.baskets) > 0) {
    disjunctive.power <- mean(rowSums(reject[, alt.baskets, drop = FALSE]) >= 1)
  } else {
    disjunctive.power <- NA
  }

  # Conjunctive power: probability all alternative baskets are positive
  if (length(alt.baskets) > 0) {
    conjunctive.power <- mean(rowSums(reject[, alt.baskets, drop = FALSE]) == length(alt.baskets))
  } else {
    conjunctive.power <- NA
  }

  list(
    reject.rate = reject.rate,
    type1.error = type1.error,
    power = power,
    FWER = FWER,
    disjunctive.power = disjunctive.power,
    conjunctive.power = conjunctive.power,
    null.baskets = null.baskets,
    alt.baskets = alt.baskets
  )
}
