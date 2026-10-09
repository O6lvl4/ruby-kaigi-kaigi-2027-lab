require_relative 'boot'
require 'rails'
require 'action_controller/railtie'
require 'json'

# The reading guide boots without a database. Only the lab loads Active Record + PGlite.
GUIDE_ONLY = ENV['GUIDE_ONLY'] == '1'

unless GUIDE_ONLY
  require 'active_record/railtie'
  require_relative '../vendor/pglite_adapter'
  ActiveRecord::ConnectionAdapters.register(
    'pglite', 'ActiveRecord::ConnectionAdapters::PGliteAdapter', File.expand_path('../vendor/pglite_adapter', __dir__)
  )
end

module MiyazakiGuide
  class Application < Rails::Application
    config.root = File.expand_path('..', __dir__)
    config.load_defaults 8.1
    config.eager_load = false
    config.enable_reloading = false
    config.secret_key_base = 'synthetic-local-demo-not-for-production'
    config.hosts.clear
    config.logger = Logger.new($stdout)
    config.log_level = :warn
    config.active_support.deprecation = :stderr
    config.cache_store = :memory_store
    config.action_dispatch.show_exceptions = :none
    config.consider_all_requests_local = true
  end
end
