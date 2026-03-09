##########################################################################
## Function of generating default scenarios
## write by Jiaying Lyu, in 2020/3/30
##########################################################################
defaultscGen = function(p0,p1,narm){
  
  default = NULL
  if (narm==2) {
    if (all(p0==p0[1]) & all(p1==p1[1])) {
      temp.p = c(p1[1],p0[2])
      default = rbind(default,temp.p)
    } else {
      temp.p = c(p1[1],p0[2])
      default = rbind(default,temp.p)
      temp.p = c(p0[1],p1[2])
      default = rbind(default,temp.p)
    }
  } else {
    if (narm<=4) {
      index = 1:(narm-1)
    } else if (narm==5){
      index = c(1,3,4)
    } else if (narm==6){
      index = c(1,3,5)
    } else if (narm==7 || narm==8){
      index = c(2,4,6)
    } else if (narm==9){
      index = c(2,4,5,7)
    } else {
      index = c(2,4,6,8)
    }
    
    for (i in index) {
      temp.p = c(p1[1:i],p0[(i+1):narm])
      default = rbind(default,temp.p)
    }

  }
  
  default = rbind(p0,p1,default)
  
  return(default)
  
}

narm = 3
p0 = rep(0.1,narm)
p1 = seq(from=0.2,by=0.1,length.out = narm)
default = defaultscGen(p0,p1,narm)
print(default)
print(apply(t(default)==p1,2,sum))