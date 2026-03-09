##########################################################################
## Function of simulating trials using CBHM (runsimFun=cbhmFun)
## write by Shijie in 2020/02/12, revised by Jiaying Lyu, in 2020/3/27
##########################################################################

# rm(list = ls())
library(Rcpp)

# file_path=rstudioapi::getSourceEditorContext()$path
# cppfile_path=paste0(dirname(file_path),"/cbhm_function.cpp")
# sourceCpp(file = cppfile_path)
sourceCpp(file = "cbhm_function.cpp")


Tcal = function(y,N){
  # O1=y; O0=N-y
  # E1=N*sum(y)/sum(N); E0=N-E1
  # return(sum((O1-E1)^2/E1)+sum((O0-E0)^2/E0))
  
  O=c(y,N-y)
  p=sum(y)/sum(N)
  E=c(N*p,N*(1-p))
  return(sum((O - E)^2/E))
}

ab_gen = function(q0,q1,N,var.small,var.big,seed){
  # browser()
  R=5000;T=rep(NA,R)
  
  dat=cbind(N,q1)
  for(i in 1:R){
    set.seed(seed+i)
    y=apply(dat,1,function(x){return(rbinom(1,x[1],x[2]))})
    temp = Tcal(y,N)
    T[i] = ifelse(is.nan(temp),0,temp)
  }
  HB=median(T)
  
  J=length(N)
  HB_=rep(NA,J-1)
  for(j in 1:(J-1)){
    dat=cbind(N,c(q1[1:j],q0[(j+1):J]))
    for(i in 1:R){
      set.seed(seed+i)
      y=apply(dat,1,function(x){return(rbinom(1,x[1],x[2]))})
      temp = Tcal(y,N)
      T[i] = ifelse(is.nan(temp),0,temp)
    }
    HB_[j]=median(T)
  }
  HB_=min(HB_)
  
  b=(log(var.big)-log(var.small))/(log(HB_)-log(HB))
  a=log(var.small)-log(HB)*b
  
  return(c(a,b))
}

logit=function(p){return(log(p/(1-p)))}

logit_inv=function(theta){return(1-1/(1+exp(theta)))}

#### CBHM design with interim analysis ----
## =================
#### trial & design inputs: 
# seed: (value) random seed
# simN: (value) # of simulations
# ndose: (value) # of doses, in basket trials ndose=1
# ntype: (value) # of indications for expansion, so there are ndose*ntype arms
# q0: (vector, length(q0)=ntype) the reference response rate for each basket 
# q1: (vector, length(q1)=ndose*ntype) the targetted response rate for each basket. ordered as below (indication 1 * dose 1), (indication 2 * dose 1),..., (indication nindication * dose 1), (inication 1 * dose 2), ...
# p.true:     (vector, length(q1)=ndose*ntype) the true response rate in each scenario 
# cohortsize: (matrix, nrow = # of interims, ncol=ndose*ntype) the # of patients treated between each interim, colSums(cohortsize)=samplesize, the maximum sample size for each basket

#### interim inputs:
# futstop: (0-1 value) the indicator whether futility stopping is included
# futthr: (value) the futility threshold
# effstop: (0-1 value) the indicator whether efficacy stopping is included
# effthr: (value) the efficacy threshold

#### advanced parameters:
# mu0, sigma0: the prior for \mu~N(mu0,sigma0)
# var_min, var_max: the small/large value guess of \sigma^2

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
                   param = list(mu0 = mean(log(q0/(1-q0))), sigma0 = 10, # the prior for \mu
                                # the prior guess for \sigma^2
                                var_min = 1,var_max = 80)){
  
  mu0 = param$mu0;
  sigma0 = param$sigma0
  var_min = param$var_min
  var_max = param$var_max
  
  ## preparation
  basket = data.frame(d = sort(rep(1:ndose,ntype)), type = rep(1:ntype,ndose), p.eff = p.true)
  basket = basket[order(basket[,1],basket[,2]),]
  theta0 = logit(q0)
  theta_mid = logit((q0+q1)/2)
  nbasket = ndose*ntype
  ncohort=nrow(cohortsize)
  
  # the parameter for calculating sigma^2 = exp(a+b*T)
  ab=ab_gen(q0,q1,colSums(cohortsize),var_min,var_max,seed)
  
  # mcmc parameters
  sigma.theta = 1; # the proposal density when sampleing theta
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
      T_temp = Tcal(b.y,b.n)
      if(is.nan(T_temp) || T_temp<=1){
        sigma=sqrt(exp(ab[1]))
      }else{
        sigma=sqrt(exp(ab[1]+ab[2]*log(T_temp)))
      }
      
      # MCMC drawing
      mcmc.r = cbhm_mcmc(basket$d,basket$type,q0,q1,
                         b.y,b.n,
                         sigma.theta,mu0,sigma0,sigma,
                         mcmcsize,seed+sim)
      cbhm.r=matrix(as.numeric(unlist(mcmc.r)),ncol = nbasket+1,byrow = T)
      theta=cbhm.r[seq(floor(mcmcsize*burn)+1,mcmcsize,thin),1:nbasket]
      
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
        
        # # 3. final analysis
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
