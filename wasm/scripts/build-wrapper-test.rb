require_relative 'build-core'
class CaptureCommand
  prepend CheckedPostlink
  def system(*args, **kwargs) = [args, kwargs]
end
ENV['FOUNDATION_POSTLINK'] = '/proof/postlink.sh'
command = CaptureCommand.new
native, = command.system('make', '-j2', 'install', chdir: '/build/x86_64-pc-linux/baseruby-local')
raise 'Native helper received Wasm post-link' if native.any? { |arg| arg.start_with?('POSTLINK=') }
wasm, = command.system('make', '-j2', 'install', chdir: '/build/wasm32-unknown-wasip1/ruby-local-full')
raise 'Wasm post-link missing' unless wasm.include?('POSTLINK=/proof/postlink.sh $@')
library, = command.system('make', 'install', chdir: '/build/wasm32-unknown-wasip1/yaml-0.2.5')
raise 'Library received Ruby post-link' if library.any? { |arg| arg.start_with?('POSTLINK=') }
puts 'BUILD_WRAPPER_GUARDS_PASSED'
