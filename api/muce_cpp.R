##########################################################################
## Function of simulating trials using EXNEX (runsimFun=exnexFun)
## write by Shijie in 2020/02/22, revised by Jiaying Lyu, in 2020/3/27
##########################################################################


# rm(list = ls())
library(Rcpp)

# file_path=rstudioapi::getSourceEditorContext()$path
# cppfile_path=paste0(dirname(file_path),"/muce_function.cpp")
# sourceCpp(file = cppfile_path)
sourceCpp(file = "muce_function.cpp")

#### MUCE design with interim analysis ----
## =================
#### trial & design inputs: 
# seed: (value) random seed
# simN: (value) # of simulations
# ndose: (value) # of doses, in basket trials ndose=1
# ntype: (value) # of indications for expansion, so there are nbasket arms
# q0: (vector, length(q0)=ntype) the reference response rate for each basket 
# q1: (vector, length(q1)=nbasket) the targetted response rate for each basket. ordered as below (indication 1 * dose 1), (indication 2 * dose 1),..., (indication nindication * dose 1), (inication 1 * dose 2), ...
# p.true:     (vector, length(q1)=nbasket) the true response rate in each scenario 
# cohortsize: (matrix, nrow = # of interims, ncol=nbasket) the # of patients treated between each interim, colSums(cohortsize)=samplesize, the maximum sample size for each basket

#### interim inputs:
# futstop: (0-1 value) the indicator whether futility stopping is included
# futthr: (value) the futility threshold
# effstop: (0-1 value) the indicator whether efficacy stopping is included
# effthr: (value) the efficacy threshold

#### advanced parameters:
# scale1, scale3: the scale parameter of truncated Cauchy dist. for theta under each hypothesis
# sigma.z: Z_{ij} ~ N(\xi_i+\eta_j,sigma.z^2)
# sigma.xi, sigma.eta: \xi_{i} ~ N(\xi_0,sigma.xi^2), \eta_{j} ~ N(\eta_0,sigma.eta^2)
# mu1,mu2,sigma1,sigma2: \xi_0 ~ N(mu1,sigma1^2), \eta_0 ~ N(mu2,sigma2^2)

## =================
## Output: 
# final.basket.n: (matrix,nsim*nbasket) the number of patients enrolled in each basket (arm) for each simulated trial
# final.basket.y: (matrix,nsim*nbasket) the number of responses happened in each basket (arm) for each simulated trial
# final.phat: (matrix,nsim*nbasket) the estimated posterior mean of response rate of each basket (arm) for each simulated trial
# final.prob.H1: (matrix,nsim*nbasket) the posterior probability that p is greater than p0
# futility: (0-1 matrix,nsim*nbasket) the indicator whether each arm is stopped for futility 
# efficacy: (0-1 matrix,nsim*nbasket) the indicator whether each arm is stopped for efficacy 

runsimFun = function(seed, simN, ndose, ntype, q0, q1, p.true, cohortsize,
                   futstop = 0, futthr = 0.25, effstop = 0, effthr = 1,
                   param = list(scale1 = 2.5, scale3 = 2.5, # the prior for \theta
                                sigma.z = 1, # the prior for Z
                                # the prior for \xi and \eta
                                sigma.xi = 1, sigma.eta = 1, mu1 = 0, mu2 = 0, sigma1 = 1, sigma2 = 1)){
  
  scale1 = param$scale1 
  scale3 = param$scale3
  sigma.z = param$sigma.z
  sigma.xi = param$sigma.xi
  sigma.eta = param$sigma.eta
  mu1 = param$mu1
  sigma1 = param$sigma1
  mu2 = param$mu2
  sigma2 = param$sigma2
  
  ## preparation
  basket = data.frame(d = sort(rep(1:ndose,ntype)), type = rep(1:ntype,ndose), p.eff = p.true)
  basket = basket[order(basket[,1],basket[,2]),]
  theta0 = theta1 = log(q0/(1-q0))
  nbasket = ndose*ntype
  ncohort=nrow(cohortsize)
  
  # mcmc parameters
  sigma.theta = 0.5; # the proposal density when sampleing theta
  mcmcsize = 11000; burn = 0.09; thin = 10
  
  ##++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  final.basket.n = matrix(0,simN,nbasket) # the number of patients enrolled in each basket (arm) for each simulated trial
  final.basket.y = matrix(0,simN,nbasket) # the number of responses happened in each basket (arm) for each simulated trial
  futility = matrix(0,simN,nbasket) # declaring as futility in interim analysis
  efficacy = matrix(0,simN,nbasket) # declaring as efficacy in interim analysis
  final.phat = matrix(0,simN,nbasket) # posterior mean of response rate for each basket
  final.prob.H1 = matrix(0,simN,nbasket) # the posterior probability of H1
  
  ## Simulation begins
  set.seed(seed)
  
  for (sim in 1:simN) {
    
    b.y = b.n = matrix(0,ntype,ndose) # the number of patients enrolled and the number of response in each basket (arm)
    stopping=numeric(nbasket)
    
    # # 1. Generate data
    for(i in 1:ncohort){
      for (type.temp in 1:ntype) {
        for (d.temp in 1:ndose) {
          b.index = (d.temp-1)*ntype+type.temp
          if (stopping[b.index]==0){ # if not futility stopped
            eff.resp.temp = rbinom(1,cohortsize[i,b.index],basket$p.eff[b.index])
            b.y[type.temp,d.temp] = b.y[type.temp,d.temp]+eff.resp.temp
            b.n[type.temp,d.temp] = b.n[type.temp,d.temp]+cohortsize[i,b.index]
          }
        }
      }
      
      # # MCMC draws
      mcmc.r = muce_mcmc(seed=seed+sim,
                         basket$d,basket$type,basket$p.eff,
                         b.y,b.n,theta0,theta1,sigma.z,
                         mu1,sigma1,sigma.xi,mu2,sigma2,sigma.eta,scale1,scale3,sigma.theta,
                         mcmcsize)
      
      Z = matrix(as.numeric(unlist(mcmc.r[[1]])),ncol = nbasket,byrow = T)
      Z = Z[seq(floor(mcmcsize*burn)+1,mcmcsize,thin),]
      lambda.prob = rbind(colMeans(Z<=0),1-colMeans(Z<=0))
      
      
      # # 2. interim analysis
      if (i!=ncohort){
        
        interim.prob=lambda.prob[2,]
        
        if(futstop){ # futility stopping
          stopping[which(interim.prob<futthr)]<-1
          futility[sim,which(interim.prob<futthr)] <- 1
        }
        if (effstop) { #efficacy stopping
          stopping[which(interim.prob>effthr)]<-1
          efficacy[sim,which(interim.prob>effthr)] <- 1
        }
        
        if (!(0 %in% stopping)){# when all groups have stopped for futility
          theta=matrix(as.numeric(unlist(mcmc.r[[2]])),ncol = nbasket,byrow = T)
          theta=theta[seq(floor(mcmcsize*burn)+1,mcmcsize,thin),]
          theta.temp = exp(theta)
          
          final.basket.y[sim,] = b.y
          final.basket.n[sim,] = b.n
          final.phat[sim,] = colMeans(theta.temp/(1+theta.temp))
          final.prob.H1[sim,] = lambda.prob[2,]
          break
        }
        
      } else {
        # # 3. final analysis
        theta=matrix(as.numeric(unlist(mcmc.r[[2]])),ncol = nbasket,byrow = T)
        theta=theta[seq(floor(mcmcsize*burn)+1,mcmcsize,thin),]
        theta.temp = exp(theta)
        
        final.basket.y[sim,] = b.y
        final.basket.n[sim,] = b.n
        final.phat[sim,] = colMeans(theta.temp/(1+theta.temp))
        final.prob.H1[sim,] = lambda.prob[2,]
        
      }
      
    } # One simulated trial ends.
 
  } # Simulation Ends. 
  
  return(list(final.basket.y=final.basket.y,final.basket.n=final.basket.n,final.phat=final.phat,final.prob.H1=final.prob.H1,futility=futility,efficacy=efficacy))
  
}

