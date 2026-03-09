library(plumber)
library(jsonlite)
library(Rcpp)

# ── Compile C++ MCMC backends at startup ─────────────────────────────────────
sourceCpp(file = "/api/bhm_function.cpp")
sourceCpp(file = "/api/cbhm_function.cpp")
sourceCpp(file = "/api/exnex_function.cpp")
sourceCpp(file = "/api/muce_function.cpp")

# ── Source R simulation wrappers ─────────────────────────────────────────────
# We source modified versions that use absolute paths
source("/api/bhm_sim.R")
source("/api/cbhm_sim.R")
source("/api/exnex_sim.R")
source("/api/muce_sim.R")
source("/api/calc_metrics.R")

# ── Type coercion helpers ────────────────────────────────────────────────────
`%||%` <- function(x, y) if (!is.null(x) && length(x) > 0 && !identical(x, "")) x else y
.toNum <- function(x, default = NA_real_) { if (is.null(x) || identical(x, "")) return(default); as.numeric(x) }
.toInt <- function(x, default = NA_integer_) { if (is.null(x) || identical(x, "")) return(default); as.integer(x) }
.toBool <- function(x, default = FALSE) { if (is.null(x) || identical(x, "")) return(default); isTRUE(as.logical(x)) }
.toNumVec <- function(x, default = NULL) {
  if (is.null(x)) return(default)
  if (is.character(x)) x <- strsplit(x, ",")[[1]]
  as.numeric(x)
}
.cleanNum <- function(x) {
  if (is.null(x)) return(NULL)
  x <- as.numeric(x)
  x[is.infinite(x) | is.nan(x)] <- NA_real_
  x
}

# ── Cohort size generation (from main_basket_trial.R) ────────────────────────
cohortsize_gen <- function(futstop, effstop, speed, samplesize) {
  narm <- length(samplesize)
  if (futstop == 1 || effstop == 1) {
    speed.time <- samplesize / speed
    if (length(unique(speed.time)) == 1) {
      cohortsize <- rbind(ceiling(0.5 * samplesize), ceiling(0.75 * samplesize), samplesize)
    } else {
      speed.fast <- which(speed.time == min(speed.time))
      arm.fast <- if (length(speed.fast) == 1) speed.fast else speed.fast[which.min(samplesize[speed.fast])]
      interim1_size <- ceiling(samplesize[arm.fast] / 2 * speed / speed[arm.fast])
      speed.slow <- which(speed.time == max(speed.time))
      arm.slow <- if (length(speed.slow) == 1) speed.slow else speed.slow[which.max(samplesize[speed.slow])]
      interim2_size <- ceiling(samplesize[arm.slow] / 2 * speed / speed[arm.slow])
      interim2_size[interim2_size > samplesize] <- samplesize[interim2_size > samplesize]
      cohortsize <- rbind(interim1_size, interim2_size, samplesize)
    }
    cohortsize[3, ] <- cohortsize[3, ] - cohortsize[2, ]
    cohortsize[2, ] <- cohortsize[2, ] - cohortsize[1, ]
  } else {
    cohortsize <- matrix(samplesize, ncol = narm, byrow = TRUE)
  }
  return(cohortsize)
}

# ── Run simulation and compute outputs ───────────────────────────────────────
run_basket_sim <- function(design, seed, simN, narm, p0, p1, alpha, samplesize,
                           speed, resp.rate, futstop, futthr, effstop, effthr,
                           param, null_scenario = FALSE) {

  cohortsize <- cohortsize_gen(futstop, effstop, speed, samplesize)

  runsimFun <- switch(design,
    bbhm = bbhm_runsimFun,
    cbhm = cbhm_runsimFun,
    exnex = exnex_runsimFun,
    muce = muce_runsimFun,
    stop(paste("Unknown design:", design))
  )

  res <- runsimFun(
    seed = seed, simN = simN, ndose = 1, ntype = narm,
    q0 = p0, q1 = p1, cohortsize = cohortsize, p.true = resp.rate,
    futstop = futstop, futthr = futthr, effstop = effstop, effthr = effthr,
    param = param
  )

  # Calibrate final thresholds
  if (null_scenario) {
    finalthr <- rep(NA, narm)
    for (i in 1:narm) {
      remaining <- (1 - alpha[i]) * simN - sum(res$efficacy[, i]) - sum(res$futility[, i])
      if (remaining > 0) {
        mask <- ((!res$efficacy) & (!res$futility))[, i]
        finalthr[i] <- sort(res$final.prob.H1[mask, i], decreasing = TRUE)[alpha[i] * simN - sum(res$efficacy[, i]) + 1]
      } else {
        finalthr[i] <- 0
      }
    }
  } else {
    finalthr <- 1 - alpha
  }

  # Power calculations
  power.temp <- (t(t(res$final.prob.H1) > finalthr) | (res$efficacy)) & (!res$futility)
  power.arm <- colMeans(power.temp)

  less.index <- which(resp.rate <= p0)
  high.index <- which(resp.rate > p0)

  if (length(less.index) == 0) {
    fwer <- 0
    fwpower1 <- mean(apply(power.temp[, high.index, drop = FALSE], 1, sum) != 0)
    fwpower2 <- mean(apply(power.temp[, high.index, drop = FALSE], 1, sum) == length(high.index))
  } else if (length(high.index) == 0) {
    fwer <- mean(apply(cbind(NULL, power.temp[, less.index, drop = FALSE]), 1, sum) != 0)
    fwpower1 <- 0
    fwpower2 <- 0
  } else {
    fwer <- mean(apply(cbind(NULL, power.temp[, less.index, drop = FALSE]), 1, sum) != 0)
    fwpower1 <- mean(apply(cbind(NULL, power.temp[, high.index, drop = FALSE]), 1, sum) != 0 &
                      apply(cbind(NULL, power.temp[, less.index, drop = FALSE]), 1, sum) == 0)
    fwpower2 <- mean(apply(cbind(NULL, power.temp[, high.index, drop = FALSE]), 1, sum) == length(high.index) &
                      apply(cbind(NULL, power.temp[, less.index, drop = FALSE]), 1, sum) == 0)
  }

  # Bias
  bias.temp <- t(res$final.phat) - resp.rate
  bias <- apply(bias.temp, 1, mean)
  bias.sd <- sqrt(apply((bias.temp - bias)^2, 1, mean))

  # Patient counts
  npats.mean <- apply(res$final.basket.n, 2, mean)
  npats.sd <- sqrt(apply((t(res$final.basket.n) - npats.mean)^2, 1, mean))

  # Interim stopping
  prob.fut1 <- prob.fut2 <- prob.eff1 <- prob.eff2 <- rep(NA, narm)
  if (futstop == 1 || effstop == 1) {
    cum1 <- cohortsize[1, ]
    cum2 <- cohortsize[1, ] + cohortsize[2, ]
  }
  if (futstop == 1) {
    prob.fut1 <- apply(t(t(res$final.basket.n) == cohortsize[1, ]) & res$futility, 2, mean)
    prob.fut2 <- apply(t(t(res$final.basket.n) == (cohortsize[1, ] + cohortsize[2, ])) & res$futility, 2, mean)
  }
  if (effstop == 1) {
    prob.eff1 <- apply(t(t(res$final.basket.n) == cohortsize[1, ]) & res$efficacy, 2, mean)
    prob.eff2 <- apply(t(t(res$final.basket.n) == (cohortsize[1, ] + cohortsize[2, ])) & res$efficacy, 2, mean)
  }

  list(
    armIndex = 1:narm,
    referenceRate = .cleanNum(p0),
    targetRate = .cleanNum(p1),
    typeIError = .cleanNum(alpha),
    trueRate = .cleanNum(resp.rate),
    finalThreshold = .cleanNum(round(finalthr, 4)),
    powerPerArm = .cleanNum(round(power.arm, 4)),
    fwer = .cleanNum(round(fwer, 4)),
    fwPower1 = .cleanNum(round(fwpower1, 4)),
    fwPower2 = .cleanNum(round(fwpower2, 4)),
    bias = .cleanNum(round(bias, 4)),
    biasSD = .cleanNum(round(bias.sd, 4)),
    avgPatients = .cleanNum(round(npats.mean, 2)),
    sdPatients = .cleanNum(round(npats.sd, 2)),
    interimCum1 = if (futstop == 1 || effstop == 1) as.integer(cum1) else rep(NA, narm),
    probFutility1 = .cleanNum(round(prob.fut1, 4)),
    probEfficacy1 = .cleanNum(round(prob.eff1, 4)),
    interimCum2 = if (futstop == 1 || effstop == 1) as.integer(cum2) else rep(NA, narm),
    probFutility2 = .cleanNum(round(prob.fut2, 4)),
    probEfficacy2 = .cleanNum(round(prob.eff2, 4))
  )
}

# ── CORS filter ──────────────────────────────────────────────────────────────
#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req$REQUEST_METHOD == "OPTIONS") { res$status <- 204; return(list()) }
  plumber::forward()
}

# ── Health endpoint ──────────────────────────────────────────────────────────
#* @get /health
function() {
  list(status = "ok", time = format(Sys.time(), tz = "UTC", usetz = TRUE))
}

# ── BBHM endpoint ───────────────────────────────────────────────────────────
#* @post /bbhm
function(req, res) {
  tryCatch({
    body <- req$body
    seed <- .toInt(body$seed, 12345L)
    simN <- .toInt(body$simN, 100L)
    narm <- .toInt(body$narm, 3L)
    p0 <- .toNumVec(body$p0, rep(0.15, narm))
    p1 <- .toNumVec(body$p1, rep(0.35, narm))
    alpha <- .toNumVec(body$alpha, rep(0.1, narm))
    samplesize <- .toNumVec(body$samplesize, rep(27, narm))
    speed <- .toNumVec(body$speed, rep(1, narm))
    respRate <- .toNumVec(body$respRate, p0)
    futstop <- .toInt(body$futstop, 0L)
    futthr <- .toNum(body$futthr, 0.1)
    effstop <- .toInt(body$effstop, 0L)
    effthr <- .toNum(body$effthr, 1.0)
    nullScenario <- .toBool(body$nullScenario, TRUE)

    # BBHM priors
    mu0 <- .toNum(body$mu0, mean(log(p0 / (1 - p0)) - log(p1 / (1 - p1))))
    sigma0 <- .toNum(body$sigma0, 10)
    lambda1 <- .toNum(body$lambda1, 0.0005)
    lambda2 <- .toNum(body$lambda2, 0.000005)
    param <- list(mu0 = mu0, sigma0 = sigma0, lambda1 = lambda1, lambda2 = lambda2)

    result <- run_basket_sim(
      design = "bbhm", seed = seed, simN = simN, narm = narm,
      p0 = p0, p1 = p1, alpha = alpha, samplesize = samplesize,
      speed = speed, resp.rate = respRate, futstop = futstop, futthr = futthr,
      effstop = effstop, effthr = effthr, param = param, null_scenario = nullScenario
    )

    rCode <- paste0(
      "# BBHM Basket Trial Simulation\n",
      "library(Rcpp)\n",
      "sourceCpp('bhm_function.cpp')\n",
      "source('bhm_cpp.R')  # defines runsimFun\n\n",
      "seed <- ", seed, "\n",
      "simN <- ", simN, "\n",
      "narm <- ", narm, "\n",
      "p0 <- c(", paste(p0, collapse = ", "), ")\n",
      "p1 <- c(", paste(p1, collapse = ", "), ")\n",
      "alpha <- c(", paste(alpha, collapse = ", "), ")\n",
      "samplesize <- c(", paste(samplesize, collapse = ", "), ")\n",
      "speed <- c(", paste(speed, collapse = ", "), ")\n",
      "resp.rate <- c(", paste(respRate, collapse = ", "), ")\n\n",
      "param <- list(mu0 = ", mu0, ", sigma0 = ", sigma0,
      ", lambda1 = ", lambda1, ", lambda2 = ", lambda2, ")\n\n",
      "# Generate cohort sizes\n",
      "cohortsize <- matrix(samplesize, ncol = narm, byrow = TRUE)\n\n",
      "# Run simulation\n",
      "res <- runsimFun(\n",
      "  seed = seed, simN = simN, ndose = 1, ntype = narm,\n",
      "  q0 = p0, q1 = p1, cohortsize = cohortsize, p.true = resp.rate,\n",
      "  futstop = ", futstop, ", futthr = ", futthr,
      ", effstop = ", effstop, ", effthr = ", effthr, ",\n",
      "  param = param\n)\n"
    )

    list(success = TRUE, result = result, rCode = rCode)
  }, error = function(e) {
    res$status <- 400L
    list(success = FALSE, error = conditionMessage(e))
  })
}

# ── CBHM endpoint ───────────────────────────────────────────────────────────
#* @post /cbhm
function(req, res) {
  tryCatch({
    body <- req$body
    seed <- .toInt(body$seed, 12345L)
    simN <- .toInt(body$simN, 100L)
    narm <- .toInt(body$narm, 3L)
    p0 <- .toNumVec(body$p0, rep(0.15, narm))
    p1 <- .toNumVec(body$p1, rep(0.35, narm))
    alpha <- .toNumVec(body$alpha, rep(0.1, narm))
    samplesize <- .toNumVec(body$samplesize, rep(27, narm))
    speed <- .toNumVec(body$speed, rep(1, narm))
    respRate <- .toNumVec(body$respRate, p0)
    futstop <- .toInt(body$futstop, 0L)
    futthr <- .toNum(body$futthr, 0.1)
    effstop <- .toInt(body$effstop, 0L)
    effthr <- .toNum(body$effthr, 1.0)
    nullScenario <- .toBool(body$nullScenario, TRUE)

    # CBHM priors
    mu0 <- .toNum(body$mu0, mean(log(p0 / (1 - p0))))
    sigma0 <- .toNum(body$sigma0, 10)
    var_min <- .toNum(body$varMin, 1)
    var_max <- .toNum(body$varMax, 80)
    param <- list(mu0 = mu0, sigma0 = sigma0, var_min = var_min, var_max = var_max)

    result <- run_basket_sim(
      design = "cbhm", seed = seed, simN = simN, narm = narm,
      p0 = p0, p1 = p1, alpha = alpha, samplesize = samplesize,
      speed = speed, resp.rate = respRate, futstop = futstop, futthr = futthr,
      effstop = effstop, effthr = effthr, param = param, null_scenario = nullScenario
    )

    rCode <- paste0(
      "# CBHM Basket Trial Simulation\n",
      "library(Rcpp)\n",
      "sourceCpp('cbhm_function.cpp')\n",
      "source('cbhm_cpp.R')  # defines runsimFun\n\n",
      "seed <- ", seed, "\n",
      "simN <- ", simN, "\n",
      "narm <- ", narm, "\n",
      "p0 <- c(", paste(p0, collapse = ", "), ")\n",
      "p1 <- c(", paste(p1, collapse = ", "), ")\n",
      "alpha <- c(", paste(alpha, collapse = ", "), ")\n",
      "samplesize <- c(", paste(samplesize, collapse = ", "), ")\n",
      "speed <- c(", paste(speed, collapse = ", "), ")\n",
      "resp.rate <- c(", paste(respRate, collapse = ", "), ")\n\n",
      "param <- list(mu0 = ", mu0, ", sigma0 = ", sigma0,
      ", var_min = ", var_min, ", var_max = ", var_max, ")\n\n",
      "cohortsize <- matrix(samplesize, ncol = narm, byrow = TRUE)\n\n",
      "res <- runsimFun(\n",
      "  seed = seed, simN = simN, ndose = 1, ntype = narm,\n",
      "  q0 = p0, q1 = p1, cohortsize = cohortsize, p.true = resp.rate,\n",
      "  futstop = ", futstop, ", futthr = ", futthr,
      ", effstop = ", effstop, ", effthr = ", effthr, ",\n",
      "  param = param\n)\n"
    )

    list(success = TRUE, result = result, rCode = rCode)
  }, error = function(e) {
    res$status <- 400L
    list(success = FALSE, error = conditionMessage(e))
  })
}

# ── EXNEX endpoint ──────────────────────────────────────────────────────────
#* @post /exnex
function(req, res) {
  tryCatch({
    body <- req$body
    seed <- .toInt(body$seed, 12345L)
    simN <- .toInt(body$simN, 100L)
    narm <- .toInt(body$narm, 3L)
    p0 <- .toNumVec(body$p0, rep(0.15, narm))
    p1 <- .toNumVec(body$p1, rep(0.35, narm))
    alpha <- .toNumVec(body$alpha, rep(0.1, narm))
    samplesize <- .toNumVec(body$samplesize, rep(27, narm))
    speed <- .toNumVec(body$speed, rep(1, narm))
    respRate <- .toNumVec(body$respRate, p0)
    futstop <- .toInt(body$futstop, 0L)
    futthr <- .toNum(body$futthr, 0.1)
    effstop <- .toInt(body$effstop, 0L)
    effthr <- .toNum(body$effthr, 1.0)
    nullScenario <- .toBool(body$nullScenario, TRUE)

    # EXNEX priors
    mu0_1 <- .toNum(body$mu0_1, log(mean(p0) / (1 - mean(p0))))
    sigma0_1 <- .toNum(body$sigma0_1, sqrt(1 / mean(p0) + 1 / (1 - mean(p0)) - 1))
    mu0_2 <- .toNum(body$mu0_2, log(mean(p1) / (1 - mean(p1))))
    sigma0_2 <- .toNum(body$sigma0_2, sqrt(1 / mean(p1) + 1 / (1 - mean(p1)) - 1))
    scale1 <- .toNum(body$scale1, 1)
    scale2 <- .toNum(body$scale2, 1)
    nex_m <- .toNum(body$nexM, log(mean(p0 + p1) / (2 - mean(p0 + p1))))
    nex_v <- .toNum(body$nexV, sqrt(1 / mean((p1 + p0) / 2) + 1 / (1 - mean((p1 + p0) / 2))))

    param <- list(
      w = c(0.25, 0.25, 0.5),
      mu0 = c(mu0_1, mu0_2),
      sigma0 = c(sigma0_1, sigma0_2),
      scale = c(scale1, scale2),
      m = nex_m, v = nex_v
    )

    result <- run_basket_sim(
      design = "exnex", seed = seed, simN = simN, narm = narm,
      p0 = p0, p1 = p1, alpha = alpha, samplesize = samplesize,
      speed = speed, resp.rate = respRate, futstop = futstop, futthr = futthr,
      effstop = effstop, effthr = effthr, param = param, null_scenario = nullScenario
    )

    rCode <- paste0(
      "# EXNEX Basket Trial Simulation\n",
      "library(Rcpp)\n",
      "sourceCpp('exnex_function.cpp')\n",
      "source('exnex_cpp.R')  # defines runsimFun\n\n",
      "seed <- ", seed, "\n",
      "simN <- ", simN, "\n",
      "narm <- ", narm, "\n",
      "p0 <- c(", paste(p0, collapse = ", "), ")\n",
      "p1 <- c(", paste(p1, collapse = ", "), ")\n",
      "alpha <- c(", paste(alpha, collapse = ", "), ")\n",
      "samplesize <- c(", paste(samplesize, collapse = ", "), ")\n",
      "speed <- c(", paste(speed, collapse = ", "), ")\n",
      "resp.rate <- c(", paste(respRate, collapse = ", "), ")\n\n",
      "param <- list(\n",
      "  w = c(0.25, 0.25, 0.5),\n",
      "  mu0 = c(", mu0_1, ", ", mu0_2, "),\n",
      "  sigma0 = c(", sigma0_1, ", ", sigma0_2, "),\n",
      "  scale = c(", scale1, ", ", scale2, "),\n",
      "  m = ", nex_m, ", v = ", nex_v, "\n)\n\n",
      "cohortsize <- matrix(samplesize, ncol = narm, byrow = TRUE)\n\n",
      "res <- runsimFun(\n",
      "  seed = seed, simN = simN, ndose = 1, ntype = narm,\n",
      "  q0 = p0, q1 = p1, cohortsize = cohortsize, p.true = resp.rate,\n",
      "  futstop = ", futstop, ", futthr = ", futthr,
      ", effstop = ", effstop, ", effthr = ", effthr, ",\n",
      "  param = param\n)\n"
    )

    list(success = TRUE, result = result, rCode = rCode)
  }, error = function(e) {
    res$status <- 400L
    list(success = FALSE, error = conditionMessage(e))
  })
}

# ── MUCE endpoint ───────────────────────────────────────────────────────────
#* @post /muce
function(req, res) {
  tryCatch({
    body <- req$body
    seed <- .toInt(body$seed, 12345L)
    simN <- .toInt(body$simN, 100L)
    narm <- .toInt(body$narm, 3L)
    p0 <- .toNumVec(body$p0, rep(0.15, narm))
    p1 <- .toNumVec(body$p1, rep(0.35, narm))
    alpha <- .toNumVec(body$alpha, rep(0.1, narm))
    samplesize <- .toNumVec(body$samplesize, rep(27, narm))
    speed <- .toNumVec(body$speed, rep(1, narm))
    respRate <- .toNumVec(body$respRate, p0)
    futstop <- .toInt(body$futstop, 0L)
    futthr <- .toNum(body$futthr, 0.1)
    effstop <- .toInt(body$effstop, 0L)
    effthr <- .toNum(body$effthr, 1.0)
    nullScenario <- .toBool(body$nullScenario, TRUE)

    # MUCE priors
    scale1 <- .toNum(body$scale1, 2.5)
    scale3 <- .toNum(body$scale3, 2.5)
    sigma.z <- .toNum(body$sigmaZ, 1)
    sigma.xi <- .toNum(body$sigmaXi, 1)
    sigma.eta <- .toNum(body$sigmaEta, 1)
    mu1 <- .toNum(body$mu1, 0)
    sigma1 <- .toNum(body$sigma1, 1)
    mu2 <- .toNum(body$mu2, 0)
    sigma2 <- .toNum(body$sigma2, 1)

    param <- list(
      scale1 = scale1, scale3 = scale3,
      sigma.z = sigma.z, sigma.xi = sigma.xi, sigma.eta = sigma.eta,
      mu1 = mu1, sigma1 = sigma1, mu2 = mu2, sigma2 = sigma2
    )

    result <- run_basket_sim(
      design = "muce", seed = seed, simN = simN, narm = narm,
      p0 = p0, p1 = p1, alpha = alpha, samplesize = samplesize,
      speed = speed, resp.rate = respRate, futstop = futstop, futthr = futthr,
      effstop = effstop, effthr = effthr, param = param, null_scenario = nullScenario
    )

    rCode <- paste0(
      "# MUCE Basket Trial Simulation\n",
      "library(Rcpp)\n",
      "sourceCpp('muce_function.cpp')\n",
      "source('muce_cpp.R')  # defines runsimFun\n\n",
      "seed <- ", seed, "\n",
      "simN <- ", simN, "\n",
      "narm <- ", narm, "\n",
      "p0 <- c(", paste(p0, collapse = ", "), ")\n",
      "p1 <- c(", paste(p1, collapse = ", "), ")\n",
      "alpha <- c(", paste(alpha, collapse = ", "), ")\n",
      "samplesize <- c(", paste(samplesize, collapse = ", "), ")\n",
      "speed <- c(", paste(speed, collapse = ", "), ")\n",
      "resp.rate <- c(", paste(respRate, collapse = ", "), ")\n\n",
      "param <- list(\n",
      "  scale1 = ", scale1, ", scale3 = ", scale3, ",\n",
      "  sigma.z = ", sigma.z, ", sigma.xi = ", sigma.xi, ", sigma.eta = ", sigma.eta, ",\n",
      "  mu1 = ", mu1, ", sigma1 = ", sigma1, ", mu2 = ", mu2, ", sigma2 = ", sigma2, "\n)\n\n",
      "cohortsize <- matrix(samplesize, ncol = narm, byrow = TRUE)\n\n",
      "res <- runsimFun(\n",
      "  seed = seed, simN = simN, ndose = 1, ntype = narm,\n",
      "  q0 = p0, q1 = p1, cohortsize = cohortsize, p.true = resp.rate,\n",
      "  futstop = ", futstop, ", futthr = ", futthr,
      ", effstop = ", effstop, ", effthr = ", effthr, ",\n",
      "  param = param\n)\n"
    )

    list(success = TRUE, result = result, rCode = rCode)
  }, error = function(e) {
    res$status <- 400L
    list(success = FALSE, error = conditionMessage(e))
  })
}

# ══════════════════════════════════════════════════════════════════════════════
# BATCH ENDPOINTS — run simulation across multiple scenarios x thresholds
# ══════════════════════════════════════════════════════════════════════════════

run_batch_sim <- function(design, body) {
  seed       <- .toInt(body$seed, 12345L)
  simN       <- .toInt(body$simN, 100L)
  narm       <- .toInt(body$narm, 3L)
  p0         <- .toNumVec(body$p0, rep(0.15, narm))
  p1         <- .toNumVec(body$p1, rep(0.35, narm))
  samplesize <- .toNumVec(body$samplesize, rep(27, narm))
  speed      <- .toNumVec(body$speed, rep(1, narm))
  futstop    <- .toInt(body$futstop, 0L)
  futthr     <- .toNum(body$futthr, 0.1)
  effstop    <- .toInt(body$effstop, 0L)
  effthr     <- .toNum(body$effthr, 1.0)

  scenarios_raw  <- body$scenarios
  thresholds_raw <- body$thresholds
  param          <- body$designParams

  if (is.null(scenarios_raw) || length(scenarios_raw) == 0) {
    stop("scenarios must be a non-empty array")
  }
  if (is.null(thresholds_raw) || length(thresholds_raw) == 0) {
    stop("thresholds must be a non-empty array")
  }

  # jsonlite may parse array-of-objects as data.frame — normalize to list-of-lists
  .to_row_list <- function(x) {
    if (is.data.frame(x)) {
      lapply(seq_len(nrow(x)), function(i) {
        row <- as.list(x[i, , drop = FALSE])
        # Unlist any list-columns (e.g. respRate parsed as list of vectors)
        lapply(row, function(v) if (is.list(v)) unlist(v) else v)
      })
    } else {
      x
    }
  }
  scenarios  <- .to_row_list(scenarios_raw)
  thresholds <- .to_row_list(thresholds_raw)

  cohortsize <- cohortsize_gen(futstop, effstop, speed, samplesize)

  runsimFun <- switch(design,
    bbhm = bbhm_runsimFun,
    cbhm = cbhm_runsimFun,
    exnex = exnex_runsimFun,
    muce = muce_runsimFun,
    stop(paste("Unknown design:", design))
  )

  all_results <- list()

  for (si in seq_along(scenarios)) {
    sc <- scenarios[[si]]
    sc_name   <- sc$name %||% paste("Scenario", si)
    resp_rate <- as.numeric(sc$respRate)
    if (length(resp_rate) != narm) {
      stop(paste("Scenario", si, "respRate length must equal narm"))
    }

    # Run simulation once per scenario (seed offset for reproducibility)
    sim_res <- runsimFun(
      seed = seed + si - 1L, simN = simN, ndose = 1, ntype = narm,
      q0 = p0, q1 = p1, cohortsize = cohortsize, p.true = resp_rate,
      futstop = futstop, futthr = futthr, effstop = effstop, effthr = effthr,
      param = param
    )

    avg_patients <- .cleanNum(round(colMeans(sim_res$final.basket.n), 2))
    sd_patients  <- .cleanNum(round(apply(sim_res$final.basket.n, 2, sd), 2))
    fut_rates <- .cleanNum(round(colMeans(sim_res$futility), 4))
    eff_rates <- .cleanNum(round(colMeans(sim_res$efficacy), 4))

    for (ti in seq_along(thresholds)) {
      tc <- thresholds[[ti]]
      tc_name  <- tc$name %||% paste("Threshold", ti)
      thr_vals <- as.numeric(tc$values)
      if (length(thr_vals) != narm) {
        stop(paste("Threshold", ti, "values length must equal narm"))
      }

      metrics <- calcMetrics(sim_res, p.true = resp_rate, q0 = p0, threshold = thr_vals)

      row <- list(
        scenario    = sc_name,
        threshold   = tc_name,
        fwer        = if (is.na(metrics$FWER)) NULL else round(metrics$FWER, 4),
        disjPower   = if (is.na(metrics$disjunctive.power)) NULL else round(metrics$disjunctive.power, 4),
        conjPower   = if (is.na(metrics$conjunctive.power)) NULL else round(metrics$conjunctive.power, 4),
        rejectRates = .cleanNum(round(metrics$reject.rate, 4)),
        type1Errors = .cleanNum(round(metrics$type1.error, 4)),
        powers      = .cleanNum(round(metrics$power, 4)),
        nullBaskets = as.integer(metrics$null.baskets),
        altBaskets  = as.integer(metrics$alt.baskets),
        futilityRates = fut_rates,
        efficacyRates = eff_rates,
        pTrue       = resp_rate,
        avgPatients = avg_patients,
        sdPatients  = sd_patients
      )
      all_results <- c(all_results, list(row))
    }
  }

  list(success = TRUE, results = all_results)
}

# ── Batch BBHM endpoint ─────────────────────────────────────────────────────
#* @post /batch/bbhm
function(req, res) {
  tryCatch({
    body <- req$body
    narm <- .toInt(body$narm, 3L)
    p0 <- .toNumVec(body$p0, rep(0.15, narm))
    p1 <- .toNumVec(body$p1, rep(0.35, narm))

    dp <- body$designParams
    if (is.null(dp)) dp <- list()
    dp$mu0     <- .toNum(dp$mu0, mean(log(p0 / (1 - p0)) - log(p1 / (1 - p1))))
    dp$sigma0  <- .toNum(dp$sigma0, 10)
    dp$lambda1 <- .toNum(dp$lambda1, 0.0005)
    dp$lambda2 <- .toNum(dp$lambda2, 0.000005)
    body$designParams <- dp

    run_batch_sim("bbhm", body)
  }, error = function(e) {
    res$status <- 400L
    list(success = FALSE, error = conditionMessage(e))
  })
}

# ── Batch CBHM endpoint ─────────────────────────────────────────────────────
#* @post /batch/cbhm
function(req, res) {
  tryCatch({
    body <- req$body
    narm <- .toInt(body$narm, 3L)
    p0 <- .toNumVec(body$p0, rep(0.15, narm))

    dp <- body$designParams
    if (is.null(dp)) dp <- list()
    dp$mu0     <- .toNum(dp$mu0, mean(log(p0 / (1 - p0))))
    dp$sigma0  <- .toNum(dp$sigma0, 10)
    dp$var_min <- .toNum(dp$var_min, 1)
    dp$var_max <- .toNum(dp$var_max, 80)
    body$designParams <- dp

    run_batch_sim("cbhm", body)
  }, error = function(e) {
    res$status <- 400L
    list(success = FALSE, error = conditionMessage(e))
  })
}

# ── Batch EXNEX endpoint ────────────────────────────────────────────────────
#* @post /batch/exnex
function(req, res) {
  tryCatch({
    body <- req$body
    narm <- .toInt(body$narm, 3L)
    p0 <- .toNumVec(body$p0, rep(0.15, narm))
    p1 <- .toNumVec(body$p1, rep(0.35, narm))

    dp <- body$designParams
    if (is.null(dp)) dp <- list()
    mu0_1    <- .toNum(dp$mu0_1, log(mean(p0) / (1 - mean(p0))))
    sigma0_1 <- .toNum(dp$sigma0_1, sqrt(1 / mean(p0) + 1 / (1 - mean(p0)) - 1))
    mu0_2    <- .toNum(dp$mu0_2, log(mean(p1) / (1 - mean(p1))))
    sigma0_2 <- .toNum(dp$sigma0_2, sqrt(1 / mean(p1) + 1 / (1 - mean(p1)) - 1))
    scale1   <- .toNum(dp$scale1, 1)
    scale2   <- .toNum(dp$scale2, 1)
    nex_m    <- .toNum(dp$nexM, log(mean(p0 + p1) / (2 - mean(p0 + p1))))
    nex_v    <- .toNum(dp$nexV, sqrt(1 / mean((p1 + p0) / 2) + 1 / (1 - mean((p1 + p0) / 2))))

    body$designParams <- list(
      w = c(0.25, 0.25, 0.5),
      mu0 = c(mu0_1, mu0_2),
      sigma0 = c(sigma0_1, sigma0_2),
      scale = c(scale1, scale2),
      m = nex_m, v = nex_v
    )

    run_batch_sim("exnex", body)
  }, error = function(e) {
    res$status <- 400L
    list(success = FALSE, error = conditionMessage(e))
  })
}

# ── Batch MUCE endpoint ─────────────────────────────────────────────────────
#* @post /batch/muce
function(req, res) {
  tryCatch({
    body <- req$body

    dp <- body$designParams
    if (is.null(dp)) dp <- list()
    dp$scale1    <- .toNum(dp$scale1, 2.5)
    dp$scale3    <- .toNum(dp$scale3, 2.5)
    dp$sigma.z   <- .toNum(dp$sigma.z, 1)
    dp$sigma.xi  <- .toNum(dp$sigma.xi, 1)
    dp$sigma.eta <- .toNum(dp$sigma.eta, 1)
    dp$mu1       <- .toNum(dp$mu1, 0)
    dp$sigma1    <- .toNum(dp$sigma1, 1)
    dp$mu2       <- .toNum(dp$mu2, 0)
    dp$sigma2    <- .toNum(dp$sigma2, 1)
    body$designParams <- dp

    run_batch_sim("muce", body)
  }, error = function(e) {
    res$status <- 400L
    list(success = FALSE, error = conditionMessage(e))
  })
}
