require 'ruby_wasm'
require 'ruby_wasm/cli'
require_relative 'pinned-downloads'
# Public RubyWasm APIs, scoped to this build process. Never edit installed gems.
module BoundedBuild
  def initialize(verbose: false, process_count: nil)
    super(verbose: verbose, process_count: Integer(ENV.fetch('BUILD_JOBS', '2')))
  end
end
RubyWasm::BuildExecutor.prepend(BoundedBuild)
module CheckedPostlink
  def system(*args, **kwargs)
    if ENV['FOUNDATION_POSTLINK'] && args.first.to_s == 'make' && args.any? { |arg| arg.to_s == 'install' }
      args << "POSTLINK=#{ENV.fetch('FOUNDATION_POSTLINK')} $@"
    end
    super(*args, **kwargs)
  end
end
RubyWasm::BuildExecutor.prepend(CheckedPostlink)
module WasiMemoryConfiguration
  def configure_args(...)
    args = super
    # Ruby provides a calloc shape list and no ancestor-cache fallback when mmap
    # is unavailable. WASI mmap emulation does not provide native lazy reservation.
    args << 'ac_cv_func_mmap=no' if ENV['WASM_NO_MMAP'] == '1'
    args
  end
end
RubyWasm::CrossRubyProduct.prepend(WasiMemoryConfiguration)
RubyWasm::CLI.new(stdout: $stdout, stderr: $stderr).run(ARGV)
