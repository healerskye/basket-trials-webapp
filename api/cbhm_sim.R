Tcal <- function(y, N) {
  O <- c(y, N-y)
  p <- sum(y)/sum(N)
  E <- c(N*p, N*(1-p))
  sum((O - E)^2/E)
}

ab_gen <- function(q0, q1, N, var.small, var.big, seed) {
  R <- 5000; T <- rep(NA, R)
  dat <- cbind(N, q1)
  for (i in 1:R) {
    set.seed(seed+i)
    y <- apply(dat, 1, function(x) rbinom(1, x[1], x[2]))
    temp <- Tcal(y, N)
    T[i] <- ifelse(is.nan(temp), 0, temp)
  }
  HB <- median(T)

  J <- length(N)
  HB_ <- rep(NA, J-1)
  for (j in 1:(J-1)) {
    dat <- cbind(N, c(q1[1:j], q0[(j+1):J]))
    for (i in 1:R) {
      set.seed(seed+i)
      y <- apply(dat, 1, function(x) rbinom(1, x[1], x[2]))
      temp <- Tcal(y, N)
      T[i] <- ifelse(is.nan(temp), 0, temp)
    }
    HB_[j] <- median(T)
  }
  HB_ <- min(HB_)

  b <- (log(var.big)-log(var.small))/(log(HB_)-log(HB))
  a <- log(var.small)-log(HB)*b
  c(a, b)
}

cbhm_logit <- function(p) log(p/(1-p))
cbhm_logit_inv <- function(theta) 1-1/(1+exp(theta))

cbhm_runsimFun <- function(seed, simN, ndose, ntype, q0, q1, p.true, cohortsize,
                            futstop = 0, futthr = 0.05, effstop = 0, effthr = 1,
                            param = list(mu0 = mean(log(q0/(1-q0))), sigma0 = 10,
                                         var_min = 1, var_max = 80)) {
  mu0 <- param$mu0
  sigma0 <- param$sigma0
  var_min <- param$var_min
  var_max <- param$var_max

  basket <- data.frame(d = sort(rep(1:ndose, ntype)), type = rep(1:ntype, ndose), p.eff = p.true)
  basket <- basket[order(basket[,1], basket[,2]),]
  theta0 <- cbhm_logit(q0)
  theta_mid <- cbhm_logit((q0+q1)/2)
  nbasket <- ndose * ntype
  ncohort <- nrow(cohortsize)

  ab <- ab_gen(q0, q1, colSums(cohortsize), var_min, var_max, seed)

  sigma.theta <- 1
  mcmcsize <- 11000; burn <- 0.09; thin <- 10

  final.basket.n <- matrix(0, simN, nbasket)
  final.basket.y <- matrix(0, simN, nbasket)
  final.prob.gt.p0 <- matrix(NA, simN, nbasket)
  final.phat <- matrix(NA, simN, nbasket)
  futility <- matrix(0, simN, nbasket)
  efficacy <- matrix(0, simN, nbasket)

  set.seed(seed)

  for (sim in 1:simN) {
    b.y <- b.n <- matrix(0, ntype, ndose)
    stopping <- numeric(nbasket)

    for (i in 1:ncohort) {
      for (type.temp in 1:ntype) {
        for (d.temp in 1:ndose) {
          b.index <- (d.temp-1)*ntype + type.temp
          if (stopping[b.index] == 0) {
            eff.resp.temp <- rbinom(1, cohortsize[i, b.index], basket$p.eff[b.index])
            b.y[type.temp, d.temp] <- b.y[type.temp, d.temp] + eff.resp.temp
            b.n[type.temp, d.temp] <- b.n[type.temp, d.temp] + cohortsize[i, b.index]
          }
        }
      }
      T_temp <- Tcal(b.y, b.n)
      if (is.nan(T_temp) || T_temp <= 1) {
        sigma <- sqrt(exp(ab[1]))
      } else {
        sigma <- sqrt(exp(ab[1] + ab[2]*log(T_temp)))
      }

      mcmc.r <- cbhm_mcmc(basket$d, basket$type, q0, q1,
                           b.y, b.n,
                           sigma.theta, mu0, sigma0, sigma,
                           mcmcsize, seed+sim)
      cbhm.r <- matrix(as.numeric(unlist(mcmc.r)), ncol = nbasket+1, byrow = TRUE)
      theta <- cbhm.r[seq(floor(mcmcsize*burn)+1, mcmcsize, thin), 1:nbasket]

      if (i != ncohort) {
        prob.gt.pmid <- colMeans(t(t(theta) > theta_mid))
        if (futstop) {
          futility[sim, which(prob.gt.pmid < futthr)] <- 1
          stopping[which(prob.gt.pmid < futthr)] <- 1
        }
        if (effstop) {
          efficacy[sim, which(prob.gt.pmid > effthr)] <- 1
          stopping[which(prob.gt.pmid > effthr)] <- 1
        }
        if (!(0 %in% stopping)) {
          prob.gt.p0 <- colMeans(t(t(theta) > theta0))
          theta.temp <- exp(theta)
          final.basket.y[sim,] <- b.y
          final.basket.n[sim,] <- b.n
          final.phat[sim,] <- colMeans(theta.temp/(1+theta.temp))
          final.prob.gt.p0[sim,] <- prob.gt.p0
          break
        }
      } else {
        prob.gt.p0 <- colMeans(t(t(theta) > theta0))
        theta.temp <- exp(theta)
        final.basket.y[sim,] <- b.y
        final.basket.n[sim,] <- b.n
        final.phat[sim,] <- colMeans(theta.temp/(1+theta.temp))
        final.prob.gt.p0[sim,] <- prob.gt.p0
      }
    }
  }

  list(final.basket.y=final.basket.y, final.basket.n=final.basket.n,
       final.phat=final.phat, final.prob.H1=final.prob.gt.p0,
       futility=futility, efficacy=efficacy)
}
