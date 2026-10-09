require 'rails'
require 'action_controller/railtie'
require 'rack/mock'
require 'json'

module FoundationProof
  class Application < Rails::Application
    config.root = File.expand_path(__dir__)
    config.load_defaults 8.1
    config.eager_load = false
    config.enable_reloading = false
    config.secret_key_base = 'isolated-local-proof-no-authentication-or-sessions'
    config.hosts.clear
    config.logger = Logger.new($stderr)
    config.log_level = :warn
    config.cache_store = :null_store
    config.action_dispatch.show_exceptions = :none
    config.consider_all_requests_local = true
  end
end

class ProofController < ActionController::Base
  def show
    @name = params.fetch(:name, 'RubyKaigiKaigi')
    render inline: '<main><h1><%= @name %></h1><p>Ruby <%= RUBY_VERSION %> / Rails <%= Rails.version %></p></main>'
  end

  def runtime
    render json: {
      ruby: RUBY_VERSION, rails: Rails.version, platform: RUBY_PLATFORM,
      name: params.fetch(:name, 'RubyKaigiKaigi'), engine: RUBY_ENGINE,
      html_sanitization: !defined?(Rails::HTML::UnavailableSanitizer)
    }
  end
end

FoundationProof::Application.initialize!
Rails.application.routes.draw do
  get '/', to: 'proof#show'
  get '/runtime.json', to: 'proof#runtime'
end

module FoundationProof
  def self.request(path)
    status, headers, body = Rails.application.call(Rack::MockRequest.env_for(path))
    text = +''
    body.each { |chunk| text << chunk }
    body.close if body.respond_to?(:close)
    {status: status, headers: headers, body: text}
  end
end
