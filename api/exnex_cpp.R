####==================================================================#####
##  Function of simulating trials using EXNEX (runsimFun=exnexFun)
##  write by Shijie in 2020/02/22, revised by Jiaying Lyu, in 2020/3/27
##########################################################################

# rm(list = ls())
library(Rcpp)

# file_path=rstudioapi::getSourceEditorContext()$path
# cppfile_path=paste0(dirname(file_path),"/exnex_function.cpp")
# sourceCpp(file = cppfile_path)
sourceCpp(file = "exnex_function.cpp")

logit=function(p){return(log(p/(1-p)))}

logit_inv=function(theta){return(1-1/(1+exp(theta)))}

#### EXNEX design with interim analysis ----
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
# w: the wight for each EX and NEX components for each arm
# mu0, sigma0: the prior for EX: \mu~N(mu0,sigma0)
# scale: the half-normal prior for tau (the sd) in two EX components
# m, v: NEX: N(m,v)

## =================
## Output: 
# final.basket.n: (matrix,nsim*nbasket) the number of patients enrolled in each basket (arm) for each simulated trial
# final.basket.y: (matrix,nsim*nbasket) the number of responses happened in each basket (arm) for each simulated trial
# final.phat: (matrix,nsim*nbasket) the estimated posterior mean of response rate of each basket (arm) for each simulated trial
# final.prob.H1: (matrix,nsim*nbasket) the posterior probability that p is greater than p0
# futility: (0-1 matrix,nsim*nbasket) the indicator whether each arm is stopped for futility 
# efficacy: (0-1 matrix,nsim*nbasket) the indicator whether each arm is stopped for efficacy 

runsimFun = function(seed, simN, ndose, ntype, q0, q1, p.true, cohortsize,
                    futstop = 0, futthr = 0.05, effstop = 0, effthr = 1,
                    param = list(w = c(0.25,0.25,0.5), #weight for EX and NEX
                                 #EX:
                                 # the prior for mu 
                                 mu0 = c(log(mean(q0)/(1-mean(q0))),log(mean(q1)/(1-mean(q1)))), 
                                 sigma0 = c(sqrt(1/mean(q0)+1/(1-mean(q0))-1), sqrt(1/mean(q1)+1/(1-mean(q1))-1)),
                                 # the prior for tau
                                 scale = c(1,1),
                                 #NEX: N(m,v^2)
                                 m=log(mean(q0+q1)/(2-mean(q0+q1))),v=sqrt(1/mean((q1+q0)/2)+1/(1-mean((q1+q0)/2))))){
  
  ## preparation
  basket = data.frame(d = sort(rep(1:ndose,ntype)), type = rep(1:ntype,ndose), p.eff = p.true)
  basket = basket[order(basket[,1],basket[,2]),]
  theta0 = logit(q0)
  theta_mid = logit((q0+q1)/2)
  nbasket = ndose*ntype
  ncohort=nrow(cohortsize)
  
  w = param$w
  mu0 = param$mu0
  sigma0 = param$sigma0
  scale = param$scale
  m = rep(param$m,nbasket)
  v = rep(param$v,nbasket)
  
  # mcmc parameters
  sigma.theta = 1.5 # the proposal density when sampleing theta
  sigma.mu = 2 # the proposal density when sampleing mu
  sigma.tau = 1 # the proposal density when sampleing tau
  mcmcsize = 11000; burn = 0.09; thin = 10
  
  ##++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  final.basket.n = matrix(0,simN,nbasket) # the number of patients enrolled in each basket (arm) for each simulated trial
  final.basket.y = matrix(0,simN,nbasket) # the number of responses happened in each basket (arm) for each simulated trial
  final.prob.gt.p0 = matrix(NA,simN,nbasket) # prob.greaterthan.p0: (array) the posterior probability that p is greater than p0
  final.phat = matrix(NA,simN,nbasket) # estimate of posterior mean of response rate for each basket
  futility = matrix(0,simN,nbasket) # 0-1 value declaring as futility in interim analysis
  efficacy = matrix(0,simN,nbasket) # 0-1 value declaring as efficacy in interim analysis
  
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
      
      # MCMC drawing
      mcmc.r = exnex_mcmc(basket$d,basket$type,q0,q1,
                          b.y,b.n,
                          sigma.theta,sigma.mu,sigma.tau,
                          mu0,sigma0,scale,m,v,w,
                          mcmcsize,seed+sim)
      exnex.r=matrix(as.numeric(unlist(mcmc.r)),ncol = nbasket+2*length(mu0),byrow = T)
      theta=exnex.r[seq(floor(mcmcsize*burn)+1,mcmcsize,thin),1:nbasket]
      
      # # 2. interim analysis
      if (i!=ncohort){
        
        prob.gt.pmid=colMeans(t(t(theta)>theta_mid))
        
        if(futstop){ # futility stopping
          futility[sim,which(prob.gt.pmid<futthr)] <- 1
          stopping[which(prob.gt.pmid<futthr)]<-1
        }
        if (effstop) { #efficacy stopping
          efficacy[sim,which(prob.gt.pmid>effthr)] <- 1
          stopping[which(prob.gt.pmid>effthr)]<-1
        }
        
        if (!(0 %in% stopping)){# when all groups have stopped early
          
          prob.gt.p0=colMeans(t(t(theta)>theta0))
          theta.temp = exp(theta)
          
          final.basket.y[sim,] = b.y
          final.basket.n[sim,] = b.n
          final.phat[sim,] = colMeans(theta.temp/(1+theta.temp))
          final.prob.gt.p0[sim,] = prob.gt.p0
          break
        }
        
      } else {
        
        # # 3. Final analysis
        prob.gt.p0=colMeans(t(t(theta)>theta0))
        theta.temp = exp(theta)
        
        final.basket.y[sim,] = b.y
        final.basket.n[sim,] = b.n
        final.phat[sim,] = colMeans(theta.temp/(1+theta.temp))
        final.prob.gt.p0[sim,] = prob.gt.p0
      }
      
    } # One simulated trial ends.
    
  } # Simulation Ends. 
  
  return(list(final.basket.y=final.basket.y,final.basket.n=final.basket.n,final.phat=final.phat,final.prob.H1=final.prob.gt.p0,futility=futility,efficacy=efficacy))
  
}
