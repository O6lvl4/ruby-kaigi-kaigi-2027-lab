require 'digest'
require 'fileutils'
module PinnedBuildDownloads
  HASHES = {
    'https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-24/wasi-sdk-24.0-x86_64-linux.tar.gz' => 'c6c38aab56e5de88adf6c1ebc9c3ae8da72f88ec2b656fb024eda8d4167a0bc5',
    'https://github.com/WebAssembly/binaryen/releases/download/version_108/binaryen-version_108-x86_64-linux.tar.gz' => '7bb8a2d97214f40bf34abc31d49b34aa5deab10b25d6d13c5f72cb395cf142fb',
    'https://github.com/yaml/libyaml/releases/download/0.2.5/yaml-0.2.5.tar.gz' => 'c642ae9b75fee120b2d96c712538bd2cf283228d2337df2cf2988e3c02678ef4',
    'https://github.com/madler/zlib/releases/download/v1.3.1/zlib-1.3.1.tar.gz' => '9a93b2b7dfdac77ceba5a558a580e74667dd6fede4585b91eefb60f03b72df23',
    'https://www.openssl.org/source/openssl-3.2.0.tar.gz' => '14c826f07c7e433706fb5c69fa9e25dab95684844b4c962a2cf1bf183eb4690e',
    'https://github.com/kateinoigakukun/wasi-vfs/releases/download/v0.6.2/libwasi_vfs-wasm32-unknown-unknown.zip' => 'a6891501fb5e24487ea714bd2a5382e161b5b2df5407a95ac31507af5c6dcf00'
  }.freeze
  def system(*args, **kwargs)
    text = args.map(&:to_s)
    return super unless text.first == 'curl'
    url = text.find { |arg| arg.start_with?('https://') } or raise 'Missing download URL'
    index = text.index('-o') or raise 'Missing download destination'
    destination = File.expand_path(text.fetch(index + 1), kwargs[:chdir] || Dir.pwd)
    if url.start_with?('https://cdn.jsdelivr.net/gh/gcc-mirror/gcc@master/config.')
      basename = File.basename(url)
      source = File.expand_path("../build-inputs/#{basename}", __dir__)
      raise 'Unexpected config helper' unless %w[config.guess config.sub].include?(basename)
      FileUtils.cp(source, destination)
      return
    end
    expected = HASHES.fetch(url) { raise "Unpinned build download: #{url}" }
    result = super
    actual = Digest::SHA256.file(destination).hexdigest
    raise "Build download checksum mismatch: #{url}" unless actual == expected
    result
  end
end
RubyWasm::BuildExecutor.prepend(PinnedBuildDownloads)
