# Load paths inside the Ruby 4.0.7 / Rails 8.1.4 runtime built in wasm/: the pinned
# framework gems are packed at /gems and small browser-only stand-ins (no sockets,
# no HTML sanitizer) at /compat.
require '/gems/setup'
require 'rubygems'
require 'js'
$LOAD_PATH.unshift('/compat')
