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
// double_matrixr basketmcmc(int_vector dose,int_vector type,double_vector q0,double_vector q1,int_vector y,int_vector n,double sigma_theta,double mu0,double sigma0,double_vector ab,int mcmcsize);

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
// H_0: p_{ij}<p_{0j} versus  H_1: p_{ij}>=p_{1j}, here i indexes dose, and j indexes indication
// y_{ij}|p_{ij} ~ Binomial(n_{ij},p_{ij})    
// \theta_{ij} = logit(p_{ij})
// \theta_{ij}|\mu_{ij},\sigma_{ij}^2 ~ N(\mu,\sigma^2)
// \mu ~ N(\mu_0,\sigma_0^2)
// \sigma = exp(a+b*log(T))

// [[Rcpp::export]]
double_matrix cbhm_mcmc(int_vector dose,int_vector type,double_vector q0,double_vector q1,int_vector y,int_vector n,double sigma_theta,double mu0,double sigma0,double sigma,int mcmcsize,int seed) {
  
  int basket_n, i;
  
  double mu_pre, mu_new;
  double theta_cand, temp_a, temp_b, temp_mean, temp_sd;
  double_vector theta_pre,theta_new;
  double_vector draws_vector;
  double_matrix draws;
  
  basket_n = q0.size();//number of different arms
  
  for (i = 0;i < basket_n;i++) {
    theta_pre.push_back(mu0);
  }
  mu_pre = mu0;
  
  srand(seed);
  
  for (int mcmcsim = 0;mcmcsim < mcmcsize;mcmcsim++) {
    
    draws_vector.clear();
    
    //1)sample theta
    theta_new.clear();
    temp_a=0;
    for (i = 0;i < basket_n;i++) {
      
      theta_cand = sigma_theta * c_rnorm() + theta_pre[i];
      
      if (unif() < (
          exp(y[i] * (theta_cand - theta_pre[i]) - n[i] * (log(1 + exp(theta_cand)) - log(1 + exp(theta_pre[i]))))
          // exp(y[i] * (theta_cand - theta_pre[i]) - n[i] * (log(1/q1[i] - 1 + exp(theta_cand)) - log(1/q1[i] - 1 + exp(theta_pre[i]))))
            * c_dnorm(theta_cand,mu_pre,sigma) / c_dnorm(theta_pre[i],mu_pre,sigma))
      ) {
        
        theta_new.push_back(theta_cand);
        draws_vector.push_back(theta_cand);
        temp_a += theta_cand;
      }
      else {
        theta_new.push_back(theta_pre[i]);
        draws_vector.push_back(theta_pre[i]);
        temp_a += theta_pre[i];
      }
      
    }
    
    
    //2)sample mu
    temp_b = basket_n * pow(sigma0,2);
    temp_b = temp_b / (temp_b + pow(sigma,2));
    temp_mean = temp_b * temp_a / basket_n + (1 - temp_b) * mu0;
    temp_sd = sqrt(pow(sigma,2)*temp_b/basket_n);
    mu_new = temp_sd * c_rnorm() + temp_mean;
    draws_vector.push_back(mu_new);
    
    
    
    draws.push_back(draws_vector);
    
    theta_pre = theta_new;
    mu_pre = mu_new;
    
  }//end of MCMC
  
  return(draws);
}