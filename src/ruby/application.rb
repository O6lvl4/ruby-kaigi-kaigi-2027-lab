require 'wasmify/rails/shim'
require 'rails'
require 'active_record'
require 'action_controller/railtie'
require 'active_record/railtie'
require 'rack/mock'
require 'json'
require '/demo/vendor/pglite_adapter'
ActiveRecord::ConnectionAdapters.register('pglite', 'ActiveRecord::ConnectionAdapters::PGliteAdapter', '/demo/vendor/pglite_adapter')

FileUtils.mkdir_p('/demo/config')
File.write('/demo/config/database.yml', "wasm:\n  adapter: pglite\n  database: miyazaki\n  js_interface: pglite4rails\n  prepared_statements: true\n")

module MiyazakiWasm
  class Application < Rails::Application
    config.root = '/demo'
    config.load_defaults 8.0
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
MiyazakiWasm::Application.initialize!
unless ENV['SUMMARY_ONLY'] == '1'
ActiveRecord::Base.establish_connection(adapter: 'pglite', database: 'miyazaki', js_interface: 'pglite4rails', prepared_statements: true)
unless ActiveRecord::Base.connection.table_exists?(:venues)
  ActiveRecord::Schema.define do
    create_table :venues do |t|
      t.string :name, null: false
      t.string :category, null: false
      t.string :area, null: false
      t.integer :capacity, null: false
      t.integer :estimated_cost, null: false
    end
    add_index :venues, :name, unique: true
  end
end
class Venue < ActiveRecord::Base
  validates :name, presence: true, length: { maximum: 100 }, uniqueness: true
  validates :area, presence: true, length: { maximum: 100 }
  validates :category, inclusion: { in: %w[venue hotel food] }
  validates :capacity, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 100000 }
  validates :estimated_cost, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 100000000 }
end
class VenuesController < ActionController::API
  def index
    render json: { venues: Venue.order(:id).as_json, runtime: { ruby: RUBY_VERSION, rails: Rails.version, platform: RUBY_PLATFORM, adapter: Venue.connection.adapter_name } }
  end
  def create
    venue = Venue.new(params.require(:venue).permit(:name, :category, :area, :capacity, :estimated_cost))
    if venue.save
      render json: { venue: venue.as_json }, status: :created
    else
      render json: { errors: venue.errors.full_messages }, status: :unprocessable_entity
    end
  end
end
end
require '/demo/summary'
Rails.application.routes.draw do
  get '/map', to: 'summary#map'
  get '/summary', to: 'summary#show'
  get '/', to: 'summary#show'
  unless ENV['SUMMARY_ONLY'] == '1'
    get '/venues', to: 'venues#index'
    post '/venues', to: 'venues#create'
  end
end
# The JS bridge supplies data via JS.global, never interpolates untrusted Ruby source.
$dispatch = proc do
  payload = JSON.parse(JS.global[:railsRequest].to_s)
  env = Rack::MockRequest.env_for(payload.fetch('path'), method: payload.fetch('method'), input: JSON.generate(payload.fetch('body', {})), 'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => payload.fetch('accept', 'application/json'))
  status, headers, body = Rails.application.call(env)
  text = +''
  body.each { |chunk| text << chunk }
  body.close if body.respond_to?(:close)
  content_type = headers['content-type'] || headers['Content-Type'] || ''
  rendered_body = content_type.include?('application/json') ? JSON.parse(text) : text
  JSON.generate(status: status, headers: headers, body: rendered_body)
end
