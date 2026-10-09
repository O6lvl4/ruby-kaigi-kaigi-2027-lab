require '/bundle/setup'
# Pure Ruby framework gems, copied from the checksum-pinned Gemfile.lock.
# The core binary provides js, BigDecimal, and the standard-library C extensions.
require '/gems/setup'
require 'rubygems'
$LOAD_PATH.unshift('/compat')
ENV['RAILS_ENV'] = 'production'
require '/app/application'
