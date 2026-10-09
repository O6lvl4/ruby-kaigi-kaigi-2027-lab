require 'rack/mock'

# Carries one request from JavaScript into Rack and the response back as JSON.
# JavaScript passes data through JS.global[:railsRequest]; nothing is interpolated
# into Ruby source.
module WasmRequestBridge
  module_function

  def call
    payload = JSON.parse(JS.global[:railsRequest].to_s)
    status, headers, body = Rails.application.call(rack_env(payload))
    text = read_body(body)
    content_type = headers['content-type'].to_s
    JSON.generate(status:, headers:, body: content_type.include?('application/json') ? JSON.parse(text) : text)
  end

  # The message is JSON-encoded, never raw source:
  #   globalThis.postMessage?.({type:'progress',message:"Rails の…"})
  def progress(message)
    script = "globalThis.postMessage?.({type:'progress',message:#{message.to_json}})"
    JS.eval(script)
  end

  def rack_env(payload)
    Rack::MockRequest.env_for(
      payload.fetch('path'),
      method: payload.fetch('method'),
      input: JSON.generate(payload.fetch('body', {})),
      'CONTENT_TYPE' => 'application/json',
      'HTTP_ACCEPT' => payload.fetch('accept', 'application/json'),
      # Mount point (e.g. GitHub Pages project path) so URL helpers emit real links.
      'SCRIPT_NAME' => payload.fetch('scriptName', '')
    )
  end

  def read_body(body)
    text = +''
    body.each { |chunk| text << chunk }
    text
  ensure
    body.close if body.respond_to?(:close)
  end
end
