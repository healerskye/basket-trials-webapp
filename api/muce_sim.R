muce_runsimFun <- function(seed, simN, ndose, ntype, q0, q1, p.true, cohortsize,
                            futstop = 0, futthr = 0.25, effstop = 0, effthr = 1,
                            param = list(scale1 = 2.5, scale3 = 2.5,
                                         sigma.z = 1,
                                         sigma.xi = 1, sigma.eta = 1,
                                         mu1 = 0, mu2 = 0, sigma1 = 1, sigma2 = 1)) {
  scale1 <- param$scale1
  scale3 <- param$scale3
  sigma.z <- param$sigma.z
  sigma.xi <- param$sigma.xi
  sigma.eta <- param$sigma.eta
  mu1 <- param$mu1
  sigma1 <- param$sigma1
  mu2 <- param$mu2
  sigma2 <- param$sigma2

  basket <- data.frame(d = sort(rep(1:ndose, ntype)), type = rep(1:ntype, ndose), p.eff = p.true)
  basket <- basket[order(basket[,1], basket[,2]),]
  theta0 <- theta1 <- log(q0/(1-q0))
  nbasket <- ndose * ntype
  ncohort <- nrow(cohortsize)

  sigma.theta <- 0.5
  mcmcsize <- 11000; burn <- 0.09; thin <- 10

  final.basket.n <- matrix(0, simN, nbasket)
  final.basket.y <- matrix(0, simN, nbasket)
  futility <- matrix(0, simN, nbasket)
  efficacy <- matrix(0, simN, nbasket)
  final.phat <- matrix(0, simN, nbasket)
  final.prob.H1 <- matrix(0, simN, nbasket)

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

      mcmc.r <- muce_mcmc(seed=seed+sim,
                           basket$d, basket$type, basket$p.eff,
                           b.y, b.n, theta0, theta1, sigma.z,
                           mu1, sigma1, sigma.xi, mu2, sigma2, sigma.eta,
                           scale1, scale3, sigma.theta,
                           mcmcsize)

      Z <- matrix(as.numeric(unlist(mcmc.r[[1]])), ncol = nbasket, byrow = TRUE)
      Z <- Z[seq(floor(mcmcsize*burn)+1, mcmcsize, thin),]
      lambda.prob <- rbind(colMeans(Z<=0), 1-colMeans(Z<=0))

      if (i != ncohort) {
        interim.prob <- lambda.prob[2,]
        if (futstop) {
          stopping[which(interim.prob < futthr)] <- 1
          futility[sim, which(interim.prob < futthr)] <- 1
        }
        if (effstop) {
          stopping[which(interim.prob > effthr)] <- 1
          efficacy[sim, which(interim.prob > effthr)] <- 1
        }
        if (!(0 %in% stopping)) {
          theta <- matrix(as.numeric(unlist(mcmc.r[[2]])), ncol = nbasket, byrow = TRUE)
          theta <- theta[seq(floor(mcmcsize*burn)+1, mcmcsize, thin),]
          theta.temp <- exp(theta)
          final.basket.y[sim,] <- b.y
          final.basket.n[sim,] <- b.n
          final.phat[sim,] <- colMeans(theta.temp/(1+theta.temp))
          final.prob.H1[sim,] <- lambda.prob[2,]
          break
        }
      } else {
        theta <- matrix(as.numeric(unlist(mcmc.r[[2]])), ncol = nbasket, byrow = TRUE)
        theta <- theta[seq(floor(mcmcsize*burn)+1, mcmcsize, thin),]
        theta.temp <- exp(theta)
        final.basket.y[sim,] <- b.y
        final.basket.n[sim,] <- b.n
        final.phat[sim,] <- colMeans(theta.temp/(1+theta.temp))
        final.prob.H1[sim,] <- lambda.prob[2,]
      }
    }
  }

  list(final.basket.y=final.basket.y, final.basket.n=final.basket.n,
       final.phat=final.phat, final.prob.H1=final.prob.H1,
       futility=futility, efficacy=efficacy)
}
