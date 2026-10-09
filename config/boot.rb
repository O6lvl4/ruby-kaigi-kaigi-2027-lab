# Load paths for whichever Ruby/Wasm runtime is running this app:
#
# - Guide runtime (wasm/: Ruby 4.0.7 + Rails 8.1.4): gems are packed at /gems and
#   small browser-only stand-ins (no sockets, no HTML sanitizer) at /compat.
# - Lab runtime (wasmify-rails sample: Ruby 3.3.3 + Rails 8.0.1): gems are bundled
#   and wasmify's shim adapts Rails to the browser.
if File.exist?('/gems/setup.rb')
  require '/gems/setup'
  require 'rubygems'
  require 'js'
  $LOAD_PATH.unshift('/compat')
else
  require 'wasmify/rails/shim'
end
