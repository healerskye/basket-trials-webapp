#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <cstdlib>
#include <iomanip>
#include <cmath>
#include <ctime>
#include <algorithm>
#include <numeric>
#include <Rcpp.h>
#include <Rmath.h>

using namespace std;

typedef vector<double> double_vector;
typedef vector<double_vector> double_matrix;
typedef vector<double_matrix> double_set;

typedef vector<int> int_vector;
typedef vector<int_vector> int_matrix;
typedef vector<int_matrix> int_set;

# define pi 3.14159265358979323846
// #################### Declaration ####################
// double unif();
// double c_rnorm(); //stanard normal random number generation
// int_vector c_int_unique(int_vector vector); //get unique number(s) of a vector
// double_vector vectorplus(double_vector a,double_vector b); //Add two vector
// double c_pnorm(double value); //distribution function of stanard normal
// double c_dnorm(double value,double mean,double sd); //probability density function of normal distribution
// double rinversegamma(double alpha,double lambda);
// double_matrix basketmcmc(int_vector dose,int_vector type,double_vector q0,double_vector q1,int_vector y,int_vector n,
                         // double sigma_theta,double sigma_mu,
                         // // double_vector mu0,double_vector sigma0,double_vector scale,double_vector m,double_vector v,double_matrix w,
                         // double_vector mu0,double_vector sigma0,double_vector scale,double_vector m,double_vector v,double_vector w,
                         // int mcmcsize);
                         
// ******************** FUNCTION ********************

double unif() {
  double u = 0;
  
  while (u <= 0 || u >= 1) { u = rand() / double(RAND_MAX); }
  
  return u;
}

double c_rnorm() {//Box-Muller Algorithm
  double v1, v2, s = 2, x;
  
  while (s > 1) {
    v1 = 2 * unif() - 1;v2 = 2 * unif() - 1;
    s = pow(v1, 2) + pow(v2, 2);
  }
  x = sqrt(-2 * log(s) / s) * v1;
  
  return x;
}

int_vector c_int_unique(int_vector vector) {
  int n = vector.size(), n_out, i = 0, duplicate;
  int_vector output;
  
  if (n == 0) { output.clear(); }
  else {
    output.push_back(vector[0]);i++;
    while (i < n) {
      duplicate = 0;
      n_out = output.size();
      for (int j = 0;j < n_out;j++) {
        if (vector[i] == output[j]) { duplicate = 1;break; }
      }
      if (duplicate == 0) { output.push_back(vector[i]); }
      i++;
    }
  }
  
  return(output);
}

double_vector vectorplus(double_vector a, double_vector b) {
  int na = a.size(), nb = b.size();
  
  for (int i = 0;i < na;i++) {
    a[i] = a[i] + b[i];
  }
  
  if (na != nb) { cout << "ERROR !!! vectorplus na!=nb" << endl; }
  
  return(a);
}

double c_pnorm(double q) { return 0.5 * erfc(-q * M_SQRT1_2); }

double c_dnorm(double value,double mean,double sd) { return exp(-pow((value-mean)/sd,2)/2)/(sd*sqrt(2*pi)); }

// MCMC code for BHM ----
// interim analysis: if Pr(p>p_{mid}|Data)<5%, stop for futility; if Pr(p>p_{mid}|Data)>90%, stop for efficacy. (p_{mid}=(p_0+p_1)/2)
// final analysis: depend on Pr(p>p_0|Data)
// =================
// Model: (Matching with MUCE)
// H_0: q_{j}<q_{0j} versus  H_1: q_{ij}>=q_{1j}, here j indexes arm j
// y_{j}|q_{j} ~ Binomial(n_{j},q_{j})    
// \theta_{j} = logit(q_{j})
// \theta_{j}|\mu,\tau,m_j,v_j ~ p_j N(\mu,\tau^2) + (1-p_j) N(m_j,v_j^2)
// \mu ~ N(\mu_0,\sigma_0^2)
// \tau ~ N(0,\tau_0^2)

// \sigma_theta, \sigma_mu, \sigma_tau

// [[Rcpp::export]]
double_matrix exnex_mcmc(int_vector dose,int_vector type,double_vector q0,double_vector q1,int_vector y,int_vector n,
                         double sigma_theta,double sigma_mu,double sigma_tau,
                         double_vector mu0,double_vector sigma0,double_vector scale,double_vector m,double_vector v,double_vector w,
                         int mcmcsize,int seed) {
  
  // int basket_n, i;
  int basket_n, K, i, j, k;
  
  // double mu_pre, mu_cand, mu_new, tau_pre, tau_cand, tau_new, theta_cand;
  // double_vector theta_pre,theta_new;
  double  mu_cand, tau_cand, theta_cand;
  double_vector theta_pre,theta_new,mu_pre,mu_new,tau_pre,tau_new;
  double theta_cand_pos, theta_pre_pos,temp, temp_a, temp_b;
  double_vector draws_vector,acr;
  double_matrix draws;
  
  basket_n = q0.size();//number of different arms
  K = w.size()-1;//number of EX distribution
  
  for (i = 0;i < basket_n;i++) {
    theta_pre.push_back(mu0[0]);
    acr.push_back(0);
  }
  // mu_pre = mu0;
  // tau_pre = tau0;
  for (k = 0;k < K;k++) {
    mu_pre.push_back(mu0[k]);
    acr.push_back(0);
    tau_pre.push_back(scale[k]);
    acr.push_back(0);
  }
  
  srand(seed);
  
  for (int mcmcsim = 0;mcmcsim < mcmcsize;mcmcsim++) {
    
    draws_vector.clear();
    
    
    //1)sample theta
    theta_new.clear();
    temp_b=1;
    for (i = 0;i < basket_n;i++) {
      
      theta_cand = sigma_theta * c_rnorm() + theta_pre[i];
      // theta_cand_pos = w[i]*c_dnorm(theta_cand,mu_pre,tau_pre)+(1-w[i])*c_dnorm(theta_cand,m[i],v[i]);
      // theta_pre_pos = w[i]*c_dnorm(theta_pre[i],mu_pre,tau_pre)+(1-w[i])*c_dnorm(theta_pre[i],m[i],v[i]);
      
      theta_cand_pos = 0;
      theta_pre_pos = 0;
      
      // EX part
      for(k = 0;k < K;k++){
        // theta_cand_pos += w[k][i]*c_dnorm(theta_cand,mu_pre[k],tau_pre[k]);
        // theta_pre_pos += w[k][i]*c_dnorm(theta_pre[i],mu_pre[k],tau_pre[k]);
        theta_cand_pos += w[k]*c_dnorm(theta_cand,mu_pre[k],tau_pre[k]);
        theta_pre_pos += w[k]*c_dnorm(theta_pre[i],mu_pre[k],tau_pre[k]);
      }
      
      // NEX part
      // theta_cand_pos += w[k][i]*c_dnorm(theta_cand,m[i],v[i]);
      // theta_pre_pos += w[k][i]*c_dnorm(theta_pre[i],m[i],v[i]);
      theta_cand_pos += w[k]*c_dnorm(theta_cand,m[i],v[i]);
      theta_pre_pos += w[k]*c_dnorm(theta_pre[i],m[i],v[i]);
      
      if (unif() < (
          exp(y[i] * (theta_cand - theta_pre[i]) - n[i] * (log(1 + exp(theta_cand)) - log(1 + exp(theta_pre[i]))))
            * theta_cand_pos/theta_pre_pos )
      ) {
        theta_new.push_back(theta_cand);
        draws_vector.push_back(theta_cand);
        temp_b *= theta_cand_pos;
        acr[i] += 1;
      }
      else {
        theta_new.push_back(theta_pre[i]);
        draws_vector.push_back(theta_pre[i]);
        temp_b *= theta_pre_pos;
      }
      
    }
    
    
    //2)sample mu
    mu_new.clear();
    for (k = 0;k<K;k++){
      mu_cand = sigma_mu * c_rnorm() + mu_pre[k];
      
      temp_a=1;
      for(i=0;i<basket_n;i++){
        temp=0;
        for(j=0;j<K;j++){
          if(j<k){temp += w[j]*c_dnorm(theta_new[i],mu_new[j],tau_pre[j]);}
          else if(j==k){temp += w[j]*c_dnorm(theta_new[i],mu_cand,tau_pre[j]);}
          else{temp += w[j]*c_dnorm(theta_new[i],mu_pre[j],tau_pre[j]);}
        }
        temp += w[j]*c_dnorm(theta_new[i],m[i],v[i]);
        temp_a *= temp;
      }
      
      if(unif() < (temp_a/temp_b*c_dnorm(mu_cand,mu0[k],sigma0[k])/c_dnorm(mu_pre[k],mu0[k],sigma0[k]))){
        mu_new.push_back(mu_cand);
        draws_vector.push_back(mu_cand);
        temp_b=temp_a;
        acr[basket_n+k] += 1;
      }
      else{
        mu_new.push_back(mu_pre[k]);
        draws_vector.push_back(mu_pre[k]);
      }
    }
    
    
    
    //3)sample tau
    tau_new.clear();
    for (k = 0;k<K;k++){
      // if(tau_pre[k]>0.5){tau_cand=unif() + tau_pre[k]-0.5;}
      // else{tau_cand=unif();}
      // tau_cand = abs(sigma_tau*tau_pre[k]*c_rnorm());
      tau_cand = exp(sigma_tau*c_rnorm()+log(tau_pre[k]));
      
      temp_a=1;
      for(i=0;i<basket_n;i++){
        temp=0;
        for(j=0;j<K;j++){
          if(j<k){temp += w[j]*c_dnorm(theta_new[i],mu_new[j],tau_new[j]);}
          else if(j==k){temp += w[j]*c_dnorm(theta_new[i],mu_new[j],tau_cand);}
          else{temp += w[j]*c_dnorm(theta_new[i],mu_new[j],tau_pre[j]);}
        }
        temp += w[j]*c_dnorm(theta_new[i],m[i],v[i]);
        temp_a *= temp;
      }
      
      if(unif() < (temp_a/temp_b*c_dnorm(tau_cand,0,scale[k])/c_dnorm(tau_pre[k],0,scale[k])
                     // * c_dnorm(tau_pre[k],0,sigma_tau*tau_cand)/c_dnorm(tau_cand,0,sigma_tau*tau_pre[k]) )
                     * tau_cand/tau_pre[k]
                     * c_dnorm(log(tau_pre[k]),log(tau_cand),sigma_tau)/c_dnorm(log(tau_cand),log(tau_pre[k]),sigma_tau) )
        ){
        tau_new.push_back(tau_cand);
        draws_vector.push_back(tau_cand);
        temp_b=temp_a;
        acr[basket_n+K+k] += 1;
      }
      else{
        tau_new.push_back(tau_pre[k]);
        draws_vector.push_back(tau_pre[k]);
      }
    }
    
    
    draws.push_back(draws_vector);
    
    theta_pre = theta_new;
    mu_pre = mu_new;
    tau_pre = tau_new;
    
  }//end of MCMC
  
  for(i=0;i<(basket_n+K+K);i++){
    acr[i] /= mcmcsize;
  }
  draws.push_back(acr);
  
  return(draws);
}