FROM rocker/r-ver:4.4

# System dependencies for plumber and Rcpp compilation
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libsodium-dev \
    libfontconfig1-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libfreetype6-dev \
    libpng-dev \
    libtiff5-dev \
    libjpeg-dev \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install plumber and Rcpp
RUN R -e " \
  options(repos=c(CRAN='https://cloud.r-project.org')); \
  install.packages(c('plumber', 'jsonlite', 'Rcpp'), verbose=TRUE, INSTALL_opts='--no-test-load'); \
  cat('plumber installed:', requireNamespace('plumber', quietly=TRUE), '\n'); \
  cat('Rcpp installed:', requireNamespace('Rcpp', quietly=TRUE), '\n')"

# Verify packages
RUN R -e "if (!requireNamespace('plumber', quietly=TRUE)) stop('plumber not installed')"
RUN R -e "if (!requireNamespace('Rcpp', quietly=TRUE)) stop('Rcpp not installed')"

WORKDIR /api
COPY . .

# Pre-compile C++ files to verify they work at build time
RUN R -e " \
  library(Rcpp); \
  sourceCpp('/api/bhm_function.cpp'); cat('bhm_function.cpp OK\n'); \
  sourceCpp('/api/cbhm_function.cpp'); cat('cbhm_function.cpp OK\n'); \
  sourceCpp('/api/exnex_function.cpp'); cat('exnex_function.cpp OK\n'); \
  sourceCpp('/api/muce_function.cpp'); cat('muce_function.cpp OK\n')"

RUN R -e "library(plumber); library(Rcpp); cat('All packages OK\n')"

EXPOSE 8080

CMD ["Rscript", "-e", "port <- as.integer(Sys.getenv('PORT', '8080')); plumber::plumb('/api/plumber.R')$run(host='0.0.0.0', port=port)"]
