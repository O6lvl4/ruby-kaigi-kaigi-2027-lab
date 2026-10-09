# Entry point loaded by the Wasm worker and the Node tests.
require_relative 'application'
require_relative '../lib/wasm_request_bridge'

WasmRequestBridge.progress('Rails アプリケーションを初期化しています…')
Rails.application.initialize!

unless GUIDE_ONLY
  ActiveRecord::Base.establish_connection
  load Rails.root.join('db/schema.rb').to_s unless ActiveRecord::Base.connection.table_exists?(:venues)
end

WasmRequestBridge.progress('Rails のビューとルートを準備しています…')
