require 'ruby_wasm'
require 'ruby_wasm/cli'
core, gems, app, compat, proof, output = ARGV
raise 'Usage: pack-runtime.rb CORE_WASM GEMS APP COMPAT PROOF OUTPUT' unless output
require 'tmpdir'
require 'fileutils'
Dir.mktmpdir('rails-foundation-app-') do |directory|
  FileUtils.cp_r(Dir[File.join(app, '*')], directory)
  FileUtils.cp(proof, File.join(directory, 'proof.rb'))
  RubyWasm::CLI.new(stdout:$stdout, stderr:$stderr).run([
    'pack', core, '--dir', "#{gems}::/gems", '--dir', "#{directory}::/app",
    '--dir', "#{compat}::/compat", '-o', output
  ])
end
