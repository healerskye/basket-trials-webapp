#include <iostream>
#include <sstream>
#include <string>
#include <cstring>
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
// double c_rtruncnorm(int right,double a,double mean,double sd); //trunc-normal random number generation
// double dtrunc_cauchy1(double b,double b0,double scale); //density of b on the left of the location b0
// double dtrunc_cauchy3(double b,double b1,double scale); //density of b on the right of the location b1
// int_vector c_int_unique(int_vector vector); //get unique number(s) of a vector
// double_vector vectorplus(double_vector a,double_vector b); //Add two vector
// double c_pnorm(double value); //distribution function of stanard normal
// double c_rcauchy(double x0,double scale); //random number generation of cauchy distribution
// double_set basketmcmc(int_vector dose,int_vector type,double_vector p_eff,int_vector y,int_vector n,double_vector theta0,double_vector theta1,double sigma_z,double mu1,double sigma1,double sigma_xi,double mu2,double sigma2,double sigma_eta,double scale1,double scale3,double sigma_theta,int mcmcsize);
double truncated_normal_ab_sample(double mu, double sigma, double a, double b);
double normal_01_cdf_inv(double p); 
double normal_01_cdf(double x); 
double r8poly_value_horner(int m, double c[], double x); 
double r8_huge(); 
double normal_01_pdf(double x); 
double truncated_normal_a_sample(double mu, double sigma, double a); 
double truncated_normal_b_sample(double mu, double sigma, double b); 

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

double c_rtruncnorm(int right, double mean, double sd) {
  double v1, v2, s, x = 0;
  
  if (right == 1) {
    x = - 1;
    while (x <= 0) {
      v1 = 2 * unif() - 1;v2 = 2 * unif() - 1;
      s = pow(v1, 2) + pow(v2, 2);
      if (s <= 1) {
        x = sd * sqrt(-2 * log(s) / s) * v1 + mean;
      }
    }
  }
  else if (right == -1) {
    x = 1;
    while (x > 0) {
      v1 = 2 * unif() - 1;v2 = 2 * unif() - 1;
      s = pow(v1, 2) + pow(v2, 2);
      if (s <= 1) {
        x = sd * sqrt(-2 * log(s) / s) * v1 + mean;
      }
    }
  }
  else {
    cout << "ERROR !!! c_rtruncnorm" << endl;
  }
  
  return x;
}

double dtrunc_cauchy1(double b, double b0, double scale) {
  double density;
  
  if (b <= b0) {
    density = (b - b0) / scale;
    density = 1 + pow(density, 2);
    density = 2 / (pi * scale * density);
  }
  else { density = 0; }
  
  return(density);
}

double dtrunc_cauchy3(double b, double b1, double scale) {
  double density;
  
  if (b > b1) {
    density = (b - b1) / scale;
    density = 1 + pow(density, 2);
    density = 2 / (pi * scale * density);
  }
  else { density = 0; }
  
  return(density);
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

double c_rcauchy(double x0, double scale) { return scale * tan(pi * (unif() - 0.5)) + x0; }//Inverse Function of CDF

double truncated_normal_ab_sample(double mu, double sigma, double a, double b)
	//****************************************************************************80
	//
	//  Purpose:
	//
	//    TRUNCATED_NORMAL_AB_SAMPLE samples the truncated Normal PDF.
	//
	//  Licensing:
	//
	//    This code is distributed under the GNU LGPL license.
	//
	//  Modified:
	//
	//    14 August 2013
	//
	//  Author:
	//
	//    John Burkardt
	//
	//  Parameters:
	//
	//    Input, double MU, SIGMA, the mean and standard deviation of the
	//    parent Normal distribution.
	//
	//    Input, double A, B, the lower and upper truncation limits.
	//
	//    Input/output, int &SEED, a seed for the random number
	//    generator.
	//
	//    Output, double TRUNCATED_NORMAL_AB_SAMPLE, a sample of the PDF.
	//
{
	double alpha;
	double alpha_cdf;
	double beta;
	double beta_cdf;
	double u;
	double x;
	double xi;
	double xi_cdf;

	alpha = (a - mu) / sigma;
	beta = (b - mu) / sigma;

	alpha_cdf = normal_01_cdf(alpha);
	beta_cdf = normal_01_cdf(beta);

	u = unif();
	xi_cdf = alpha_cdf + u * (beta_cdf - alpha_cdf);
	xi = normal_01_cdf_inv(xi_cdf);

	x = mu + sigma * xi;

	return x;
}

double normal_01_cdf(double x)

//****************************************************************************80
//
//  Purpose:
//
//    NORMAL_01_CDF evaluates the Normal 01 CDF.
//
//  Licensing:
//
//    This code is distributed under the GNU LGPL license.
//
//  Modified:
//
//    10 February 1999
//
//  Author:
//
//    John Burkardt
//
//  Reference:
//
//    A G Adams,
//    Areas Under the Normal Curve,
//    Algorithm 39,
//    Computer j.,
//    Volume 12, pages 197-198, 1969.
//
//  Parameters:
//
//    Input, double X, the argument of the CDF.
//
//    Output, double CDF, the value of the CDF.
//
{
	double a1 = 0.398942280444;
	double a2 = 0.399903438504;
	double a3 = 5.75885480458;
	double a4 = 29.8213557808;
	double a5 = 2.62433121679;
	double a6 = 48.6959930692;
	double a7 = 5.92885724438;
	double b0 = 0.398942280385;
	double b1 = 3.8052E-08;
	double b2 = 1.00000615302;
	double b3 = 3.98064794E-04;
	double b4 = 1.98615381364;
	double b5 = 0.151679116635;
	double b6 = 5.29330324926;
	double b7 = 4.8385912808;
	double b8 = 15.1508972451;
	double b9 = 0.742380924027;
	double b10 = 30.789933034;
	double b11 = 3.99019417011;
	double cdf;
	double q;
	double y;
	//
	//  |X| <= 1.28.
	//
	if (fabs(x) <= 1.28)
	{
		y = 0.5 * x * x;

		q = 0.5 - fabs(x) * (a1 - a2 * y / (y + a3 - a4 / (y + a5
			+ a6 / (y + a7))));
		//
		//  1.28 < |X| <= 12.7
		//
	}
	else if (fabs(x) <= 12.7)
	{
		y = 0.5 * x * x;

		q = exp(-y) * b0 / (fabs(x) - b1
			+ b2 / (fabs(x) + b3
				+ b4 / (fabs(x) - b5
					+ b6 / (fabs(x) + b7
						- b8 / (fabs(x) + b9
							+ b10 / (fabs(x) + b11))))));
		//
		//  12.7 < |X|
		//
	}
	else
	{
		q = 0.0;
	}
	//
	//  Take account of negative X.
	//
	if (x < 0.0)
	{
		cdf = q;
	}
	else
	{
		cdf = 1.0 - q;
	}

	return cdf;
}

double normal_01_cdf_inv(double p)

//****************************************************************************80
//
//  Purpose:
//
//    NORMAL_01_CDF_INV inverts the standard normal CDF.
//
//  Discussion:
//
//    The result is accurate to about 1 part in 10**16.
//
//  Licensing:
//
//    This code is distributed under the GNU LGPL license.
//
//  Modified:
//
//    27 December 2004
//
//  Author:
//
//    Original FORTRAN77 version by Michael Wichura.
//    C++ version by John Burkardt.
//
//  Reference:
//
//    Michael Wichura,
//    The Percentage Points of the Normal Distribution,
//    Algorithm AS 241,
//    Applied Statistics,
//    Volume 37, Number 3, pages 477-484, 1988.
//
//  Parameters:
//
//    Input, double P, the value of the cumulative probability
//    densitity function.  0 < P < 1.  If P is outside this range, an
//    "infinite" value is returned.
//
//    Output, double NORMAL_01_CDF_INV, the normal deviate value
//    with the property that the probability of a standard normal deviate being
//    less than or equal to this value is P.
//
{
	double a[8] = {
	  3.3871328727963666080,     1.3314166789178437745E+2,
	  1.9715909503065514427E+3,  1.3731693765509461125E+4,
	  4.5921953931549871457E+4,  6.7265770927008700853E+4,
	  3.3430575583588128105E+4,  2.5090809287301226727E+3 };
	double b[8] = {
	  1.0,                       4.2313330701600911252E+1,
	  6.8718700749205790830E+2,  5.3941960214247511077E+3,
	  2.1213794301586595867E+4,  3.9307895800092710610E+4,
	  2.8729085735721942674E+4,  5.2264952788528545610E+3 };
	double c[8] = {
	  1.42343711074968357734,     4.63033784615654529590,
	  5.76949722146069140550,     3.64784832476320460504,
	  1.27045825245236838258,     2.41780725177450611770E-1,
	  2.27238449892691845833E-2,  7.74545014278341407640E-4 };
	double const1 = 0.180625;
	double const2 = 1.6;
	double d[8] = {
	  1.0,                        2.05319162663775882187,
	  1.67638483018380384940,     6.89767334985100004550E-1,
	  1.48103976427480074590E-1,  1.51986665636164571966E-2,
	  5.47593808499534494600E-4,  1.05075007164441684324E-9 };
	double e[8] = {
	  6.65790464350110377720,     5.46378491116411436990,
	  1.78482653991729133580,     2.96560571828504891230E-1,
	  2.65321895265761230930E-2,  1.24266094738807843860E-3,
	  2.71155556874348757815E-5,  2.01033439929228813265E-7 };
	double f[8] = {
	  1.0,                        5.99832206555887937690E-1,
	  1.36929880922735805310E-1,  1.48753612908506148525E-2,
	  7.86869131145613259100E-4,  1.84631831751005468180E-5,
	  1.42151175831644588870E-7,  2.04426310338993978564E-15 };
	double q;
	double r;
	double split1 = 0.425;
	double split2 = 5.0;
	double value;

	if (p <= 0.0)
	{
		value = -r8_huge();
		return value;
	}

	if (1.0 <= p)
	{
		value = r8_huge();
		return value;
	}

	q = p - 0.5;

	if (fabs(q) <= split1)
	{
		r = const1 - q * q;
		value = q * r8poly_value_horner(7, a, r)
			/ r8poly_value_horner(7, b, r);
	}
	else
	{
		if (q < 0.0)
		{
			r = p;
		}
		else
		{
			r = 1.0 - p;
		}

		if (r <= 0.0)
		{
			value = r8_huge();
		}
		else
		{
			r = sqrt(-log(r));

			if (r <= split2)
			{
				r = r - const2;
				value = r8poly_value_horner(7, c, r)
					/ r8poly_value_horner(7, d, r);
			}
			else
			{
				r = r - split2;
				value = r8poly_value_horner(7, e, r)
					/ r8poly_value_horner(7, f, r);
			}
		}

		if (q < 0.0)
		{
			value = -value;
		}

	}

	return value;
}

double r8poly_value_horner(int m, double c[], double x)

//****************************************************************************80
//
//  Purpose:
//
//    R8POLY_VALUE_HORNER evaluates a polynomial using Horner's method.
//
//  Discussion:
//
//    The polynomial 
//
//      p(x) = c0 + c1 * x + c2 * x^2 + ... + cm * x^m
//
//    is to be evaluated at the value X.
//
//  Licensing:
//
//    This code is distributed under the GNU LGPL license. 
//
//  Modified:
//
//    02 January 2015
//
//  Author:
//
//    John Burkardt
//
//  Parameters:
//
//    Input, int M, the degree of the polynomial.
//
//    Input, double C[M+1], the coefficients of the polynomial.
//    A[0] is the constant term.
//
//    Input, double X, the point at which the polynomial is to be evaluated.
//
//    Output, double R8POLY_VALUE_HORNER, the value of the polynomial at X.
//
{
	int i;
	double value;

	value = c[m];

	for (i = m - 1; 0 <= i; i--)
	{
		value = value * x + c[i];
	}

	return value;
}

double r8_huge()

//****************************************************************************80
//
//  Purpose:
//
//    R8_HUGE returns a "huge" R8.
//
//  Discussion:
//
//    HUGE_VAL is the largest representable legal real number, and is usually
//    defined in math.h, or sometimes in stdlib.h.
//
//  Licensing:
//
//    This code is distributed under the GNU LGPL license.
//
//  Modified:
//
//    08 May 2003
//
//  Author:
//
//    John Burkardt
//
//  Parameters:
//
//    Output, double R8_HUGE, a "huge" real value.
//
{
	return HUGE_VAL;
}

double normal_01_pdf(double x)

//****************************************************************************80
//
//  Purpose:
//
//    NORMAL_01_PDF evaluates the Normal 01 PDF.
//
//  Discussion:
//
//    The Normal 01 PDF is also called the "Standard Normal" PDF, or
//    the Normal PDF with 0 mean and standard deviation 1.
//
//    PDF(X) = exp ( - 0.5 * X^2 ) / sqrt ( 2 * PI )
//
//  Licensing:
//
//    This code is distributed under the GNU LGPL license.
//
//  Modified:
//
//    18 September 2004
//
//  Author:
//
//    John Burkardt
//
//  Parameters:
//
//    Input, double X, the argument of the PDF.
//
//    Output, double PDF, the value of the PDF.
//
{
	double pdf;
	const double r8_pi = 3.14159265358979323;

	pdf = exp(-0.5 * x * x) / sqrt(2.0 * r8_pi);

	return pdf;
}


double truncated_normal_a_sample(double mu, double sigma, double a)

	//****************************************************************************80
	//
	//  Purpose:
	//
	//    TRUNCATED_NORMAL_A_SAMPLE samples the lower truncated Normal PDF.
	//
	//  Licensing:
	//
	//    This code is distributed under the GNU LGPL license.
	//
	//  Modified:
	//
	//    21 August 2013
	//
	//  Author:
	//
	//    John Burkardt
	//
	//  Parameters:
	//
	//    Input, double MU, SIGMA, the mean and standard deviation of the
	//    parent Normal distribution.
	//
	//    Input, double A, the lower truncation limit.
	//
	//    Input/output, int &SEED, a seed for the random number
	//    generator.
	//
	//    Output, double TRUNCATED_NORMAL_A_SAMPLE, a sample of the PDF.
	//
{
	double alpha;
	double alpha_cdf;
	double u;
	double x;
	double xi;
	double xi_cdf;

	alpha = (a - mu) / sigma;

	alpha_cdf = normal_01_cdf(alpha);

	u = unif();
	xi_cdf = alpha_cdf + u * (1.0 - alpha_cdf);
	xi = normal_01_cdf_inv(xi_cdf);

	x = mu + sigma * xi;

	return x;
}


double truncated_normal_b_sample(double mu, double sigma, double b)

//****************************************************************************80
//
//  Purpose:
//
//    TRUNCATED_NORMAL_B_SAMPLE samples the upper truncated Normal PDF.
//
//  Licensing:
//
//    This code is distributed under the GNU LGPL license.
//
//  Modified:
//
//    21 August 2013
//
//  Author:
//
//    John Burkardt
//
//  Parameters:
//
//    Input, double MU, SIGMA, the mean and standard deviation of the
//    parent Normal distribution.
//
//    Input, double B, the upper truncation limit.
//
//    Input/output, int &SEED, a seed for the random number
//    generator.
//
//    Output, double TRUNCATED_NORMAL_B_SAMPLE, a sample of the PDF.
//
{
	double beta;
	double beta_cdf;
	double u;
	double x;
	double xi;
	double xi_cdf;

	beta = (b - mu) / sigma;

	beta_cdf = normal_01_cdf(beta);

	u = unif();
	xi_cdf = u * beta_cdf;
	xi = normal_01_cdf_inv(xi_cdf);

	x = mu + sigma * xi;

	return x;
}

// MCMC code for muce ----
// two intervals, different reference rate (theta0 and theta1) for each basket arm
// =================
// Model: 
// H_0: p_{ij}<p_{0j} versus  H_1: p_{ij}>=p_{0j}, here i indexes dose, and j indexes indication
// y_{ij}|p_{ij} ~ Binomial(n_{ij},p_{ij})    
// p_{ij} = logit^{-1}(\theta_{ij})
// \theta_{ij}| \lambda_{ij} ~ f_1(\theta_{ij})^{\lambda_{ij}=1}*f_2(\theta_{ij})^{\lambda_{ij}=2}  f_1, f_2: half cauchy, i.e., truncated at (-Inf,\theta_{0j}) and (\theta_{0j},Inf), \theta_{0j}=logit(p_{0j})
// \lambda_{ij}=1 if Z_{ij}<0 else \lambda_{ij}=2
// Z_{ij}|\xi_i,\eta_j ~ N(\xi_i+\eta_j, 1)
// \xi_i ~ N(\xi_0,\sigma_{\xi}^2)
// \eta_j ~ N(\eta_0,\sigma_{\eta}^2)
// \xi_0 ~ N(\mu_1, \sigma_1^2)
// \eta_0 ~ N(\mu_2, \sigma_2^2)

// [[Rcpp::export]]
double_set muce_mcmc(int seed, int_vector dose, int_vector type, double_vector p_eff, int_vector y, int_vector n, double_vector theta0, double_vector theta1, double sigma_z, double mu1, double sigma1, double sigma_xi, double mu2, double sigma2, double sigma_eta, double scale1, double scale3, double sigma_theta, int mcmcsize) {
  
	srand(seed);

  int basket_n, n_dose, n_type, i, j, acount;
  int_vector basket_dose, basket_type;
  
  // double xi0_start,eta0_start,xi0_pre,eta0_pre,xi0_new,eta0_new;
  double xi0_pre, eta0_pre, xi0_new, eta0_new, temp_a, temp_b, temp_c, temp_mean, temp_sd, theta_cand;
  double_vector xi_pre, eta_pre, Z_pre, theta_pre;
  double_vector xi_temp, eta_temp, xi_new, eta_new, xi_plus_eta_new, theta_new, Z_new;
  double_vector xi0_new_vec,eta0_new_vec;
  double_matrix xi0_draws,eta0_draws;
  double_matrix xi_draws, eta_draws, Z_draws, theta_draws;
  double_set output;
  
  basket_dose = c_int_unique(dose);//index of different doses
  basket_type = c_int_unique(type);//index of different indications
  basket_n = p_eff.size();//number of different arms
  n_dose = basket_dose.size();//number of different doses
  n_type = basket_type.size();//number of different indications
  
  for (i = 0;i < basket_n;i++) {
    xi_pre.push_back(mu1);
    eta_pre.push_back(mu2);
    Z_pre.push_back(-1);
    if (Z_pre[i] <= 0) { theta_pre.push_back(theta0[i] - 1); }
    else { theta_pre.push_back(theta0[i] + 1); }
  }
  xi0_pre = mu1;
  eta0_pre = mu2;
  
  for (int mcmcsim = 0;mcmcsim < mcmcsize;mcmcsim++) {
    
    //1)sample xi
    xi_temp.clear();
    for (i = 0;i < n_dose;i++) {
      // acount = 0;
      // temp_b = 0;
      // for (j = 0;j < basket_n;j++) {
      //   if (dose[j] == basket_dose[i]) { acount++; temp_b += (Z_pre[j] - eta_pre[j]); }
      // }
      // temp_c = acount * pow(sigma_xi, 2);
      // temp_c = temp_c / (pow(sigma_z, 2) + temp_c);
      // temp_mean = temp_c * temp_b / acount + (1 - temp_c) * xi0_pre;
      // temp_sd = sqrt(pow(sigma_z, 2) * temp_c / acount);
      //temp_b = temp_b / pow(sigma_z, 2) + xi0_pre / pow(sigma_xi, 2);
      //temp_a = acount / pow(sigma_z, 2) + 1 / pow(sigma_xi, 2);
      //temp_mean = temp_b / temp_a;
      //temp_sd = sqrt(1 / temp_a);
      // xi_temp.push_back(temp_sd * c_rnorm() + temp_mean);
      xi_temp.push_back(0); // we don't need dose-specific effect in basket trial, revised by ysj20200527
    }
    xi_new.clear();
    for (j = 0;j < basket_n;j++) {
      xi_new.push_back(0);
      // for (i = 0;i < n_dose;i++) {
      //   if (dose[j] == basket_dose[i]) { xi_new.push_back(xi_temp[i]); break; }
      // }
    }
    // temp_b = 0;
    // for (i = 0;i < n_dose;i++) {
    //   temp_b += xi_temp[i];
    // }
    
    //sample xi0
    // temp_c = n_dose * pow(sigma1, 2);
    // temp_c = temp_c / (pow(sigma_xi, 2) + temp_c);
    // temp_mean = temp_c * temp_b / n_dose + (1 - temp_c) * mu1;
    // temp_sd = sqrt(pow(sigma_xi, 2) * temp_c / n_dose);
    //temp_a = n_dose / pow(sigma_xi, 2) + 1 / pow(sigma1, 2);
    //temp_b = temp_b / pow(sigma_xi, 2) + mu1 / pow(sigma1, 2);
    //temp_mean = temp_b / temp_a;
    //temp_sd = sqrt(1 / temp_a);
    // xi0_new = temp_sd * c_rnorm() + temp_mean;
    xi0_new = 0;
    xi0_new_vec.clear(); 
    for(i=0;i<n_dose*n_type;i++){// For easy output, duplicate xi0_new n_dose*n_type times, added by ysj20200527
      xi0_new_vec.push_back(xi0_new);
    }
    
    //2)sample eta
    eta_temp.clear();
    for (i = 0;i < n_type;i++) {
      acount = 0;
      temp_b = 0;
      for (j = 0;j < basket_n;j++) {
        if (type[j] == basket_type[i]) { acount++; temp_b += Z_pre[j] - xi_new[j]; }
      }
      temp_c = acount * pow(sigma_eta, 2);
      temp_c = temp_c / (pow(sigma_z, 2) + temp_c);
      temp_mean = temp_c * temp_b / acount + (1 - temp_c) * eta0_pre;
      temp_sd = sqrt(pow(sigma_z, 2) * temp_c / acount);
      //temp_b = temp_b / pow(sigma_z, 2) + eta0_pre / pow(sigma_eta, 2);
      //temp_a = acount / pow(sigma_z, 2) + 1 / pow(sigma_eta, 2);
      //temp_mean = temp_b / temp_a;
      //temp_sd = sqrt(1 / temp_a);
      eta_temp.push_back(temp_sd * c_rnorm() + temp_mean);
    }
    eta_new.clear();
    for (j = 0;j < basket_n;j++) {
      for (i = 0;i < n_type;i++) {
        if (type[j] == basket_type[i]) { eta_new.push_back(eta_temp[i]); break; }
      }
      
    }
    temp_b = 0;
    for (i = 0;i < n_type;i++) {
      temp_b += eta_temp[i];
    }
    
    //sample eta0
    temp_c = n_type * pow(sigma2, 2);
    temp_c = temp_c / (pow(sigma_eta, 2) + temp_c);
    temp_mean = temp_c * temp_b / n_type + (1 - temp_c) * mu2;
    temp_sd = sqrt(pow(sigma_eta, 2) * temp_c / n_type);
    //temp_a = n_type / pow(sigma_eta, 2) + 1 / pow(sigma2, 2);
    //temp_b = temp_b / pow(sigma_eta, 2) + mu2 / pow(sigma2, 2);
    //temp_mean = temp_b / temp_a;
    //temp_sd = sqrt(1 / temp_a);
    eta0_new = temp_sd * c_rnorm() + temp_mean;
    eta0_new_vec.clear();
    for(i=0;i<n_dose*n_type;i++){// For easy output, duplicate eta0_new n_dose*n_type times, added by ysj20200527
      eta0_new_vec.push_back(eta0_new);
    }
    
    //xi+eta
    xi_plus_eta_new = vectorplus(xi_new, eta_new);
    
    //3)sample theta
    theta_new.clear();
    for (i = 0;i < basket_n;i++) {
      temp_c = c_pnorm(-xi_plus_eta_new[i] / sigma_z);
      if (y[i] == 0 && n[i] == 0) {
        if (unif() < temp_c) {
          theta_cand = theta0[i] + 1;
          while (theta_cand >= theta0[i]) {
            theta_cand = c_rcauchy(theta0[i], scale1);
          }
        }
        else {
          theta_cand = theta0[i] - 1;
          while (theta_cand < theta0[i]) {
            theta_cand = c_rcauchy(theta0[i], scale3);
          }
        }
        
        theta_new[i] = theta_cand;
        
      }
      else {
        
        theta_cand = sigma_theta * c_rnorm() + theta_pre[i];
        
        temp_a = dtrunc_cauchy1(theta_cand, theta0[i], scale1) * temp_c + dtrunc_cauchy3(theta_cand, theta1[i], scale3) * (1 - temp_c);
        temp_b = dtrunc_cauchy1(theta_pre[i], theta0[i], scale1) * temp_c + dtrunc_cauchy3(theta_pre[i], theta1[i], scale3) * (1 - temp_c);
        
        if (unif() < (exp(y[i] * (theta_cand - theta_pre[i]) - n[i] * (log(1 + exp(theta_cand)) - log(1 + exp(theta_pre[i])))) * temp_a / temp_b)) {
          //theta.ac
          theta_new.push_back(theta_cand);
        }
        else { theta_new.push_back(theta_pre[i]); }
      }
      
    }
    //4)sample Z
    Z_new.clear();
    for (i = 0;i < basket_n;i++) {
      
      if (theta_new[i] < theta0[i]) { 
        //sample Z<=0
        //revised by shijie20200618, changed the sampling function of truncated normal distribution
        Z_new.push_back(truncated_normal_b_sample(xi_plus_eta_new[i],sigma_z,0));
        //Z_new.push_back(c_rtruncnorm(-1, xi_plus_eta_new[i], sigma_z)); 
      } else { 
        //sample Z>0
        Z_new.push_back(truncated_normal_a_sample(xi_plus_eta_new[i],sigma_z,0));
        //Z_new.push_back(c_rtruncnorm(1, xi_plus_eta_new[i], sigma_z)); 
      }
      
    }
    
    
    xi_draws.push_back(xi_new);
    eta_draws.push_back(eta_new);
    Z_draws.push_back(Z_new);
    theta_draws.push_back(theta_new);
    xi0_draws.push_back(xi0_new_vec);
    eta0_draws.push_back(eta0_new_vec);
    
    xi_pre = xi_new;
    eta_pre = eta_new;
    xi0_pre = xi0_new;
    eta0_pre = eta0_new;
    Z_pre = Z_new;
    theta_pre = theta_new;
    
  }//end of MCMC
  
  output.push_back(Z_draws);
  output.push_back(theta_draws);
  output.push_back(xi_draws);
  output.push_back(eta_draws);
  output.push_back(xi0_draws);
  output.push_back(eta0_draws);
  
  return(output);
}