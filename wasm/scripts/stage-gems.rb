require 'bundler/setup'
require 'fileutils'
require 'json'
require 'digest'
destination = ARGV.fetch(0)
# Full lib directories for framework/runtime gems only. Generators, console,
# tests, documentation, native Linux extensions, and unused clients are absent.
names = %w[actionpack actionview activesupport base64 builder concurrent-ruby connection_pool erubi i18n logger rack rack-session rack-test railties securerandom tsort tzinfo tzinfo-data uri useragent zeitwerk]
FileUtils.mkdir_p(destination)
load_paths = []
manifest = names.map do |name|
  spec = Bundler.load.specs.find { |item| item.name == name } or raise "Missing #{name}"
  target = File.join(destination, spec.full_name)
  spec.raw_require_paths.each { |path| load_paths << "/gems/#{spec.full_name}/#{path}" }
  FileUtils.mkdir_p(target)
  FileUtils.cp_r(File.join(spec.full_gem_path, 'lib'), target)
  paths = Dir.glob(File.join(target, '**', '*')).select { |path| File.file?(path) }
  raise "Native extension unexpectedly staged in #{name}" if paths.any? { |path| path.end_with?('.so', '.a', '.o', '.dll', '.bundle') }
  {name: name, version: spec.version.to_s, source: 'https://rubygems.org', files: paths.length, bytes: paths.sum { |path| File.size(path) }, files_sha256: paths.sort.to_h { |path| [path.delete_prefix(destination + '/'), Digest::SHA256.file(path).hexdigest] }}
end
File.write(File.join(destination, 'setup.rb'), load_paths.reverse.map { |path| "$LOAD_PATH.unshift(#{path.inspect})" }.join("\n"))
File.write(File.join(destination, 'manifest.json'), JSON.pretty_generate(manifest))
puts JSON.generate(gems: manifest.length, bytes: manifest.sum { |row| row[:bytes] })
