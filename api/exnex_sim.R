exnex_logit <- function(p) log(p/(1-p))
exnex_logit_inv <- function(theta) 1-1/(1+exp(theta))

exnex_runsimFun <- function(seed, simN, ndose, ntype, q0, q1, p.true, cohortsize,
                             futstop = 0, futthr = 0.05, effstop = 0, effthr = 1,
                             param = list(w = c(0.25,0.25,0.5),
                                          mu0 = c(log(mean(q0)/(1-mean(q0))), log(mean(q1)/(1-mean(q1)))),
                                          sigma0 = c(sqrt(1/mean(q0)+1/(1-mean(q0))-1), sqrt(1/mean(q1)+1/(1-mean(q1))-1)),
                                          scale = c(1,1),
                                          m = log(mean(q0+q1)/(2-mean(q0+q1))),
                                          v = sqrt(1/mean((q1+q0)/2)+1/(1-mean((q1+q0)/2))))) {

  basket <- data.frame(d = sort(rep(1:ndose, ntype)), type = rep(1:ntype, ndose), p.eff = p.true)
  basket <- basket[order(basket[,1], basket[,2]),]
  theta0 <- exnex_logit(q0)
  theta_mid <- exnex_logit((q0+q1)/2)
  nbasket <- ndose * ntype
  ncohort <- nrow(cohortsize)

  w <- param$w
  mu0 <- param$mu0
  sigma0 <- param$sigma0
  scale <- param$scale
  m <- rep(param$m, nbasket)
  v <- rep(param$v, nbasket)

  sigma.theta <- 1.5
  sigma.mu <- 2
  sigma.tau <- 1
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

      mcmc.r <- exnex_mcmc(basket$d, basket$type, q0, q1,
                            b.y, b.n,
                            sigma.theta, sigma.mu, sigma.tau,
                            mu0, sigma0, scale, m, v, w,
                            mcmcsize, seed+sim)
      exnex.r <- matrix(as.numeric(unlist(mcmc.r)), ncol = nbasket+2*length(mu0), byrow = TRUE)
      theta <- exnex.r[seq(floor(mcmcsize*burn)+1, mcmcsize, thin), 1:nbasket]

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
