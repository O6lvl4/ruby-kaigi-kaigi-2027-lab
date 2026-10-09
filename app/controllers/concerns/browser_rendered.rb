# Marks every response as rendered by Rails inside the browser's Ruby/Wasm, so
# the JavaScript shell can refuse anything that did not come from ActionView.
module BrowserRendered
  extend ActiveSupport::Concern

  RENDERER = 'Rails-ActionView-ERB'.freeze

  included do
    before_action :stamp_renderer
  end

  private

  def stamp_renderer
    response.set_header('X-Renderer', RENDERER)
    response.set_header('X-Ruby-Platform', RUBY_PLATFORM)
    response.set_header('X-Rails-Version', Rails.version)
  end
end
