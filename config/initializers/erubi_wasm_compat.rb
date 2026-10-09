# Narrow compatibility shim for the lab's pinned Ruby 3.3.3/Wasm build only.
# Erubi's MatchData#begin/#end offsets corrupt template text in that build.
# Equivalent pre/post-match lengths avoid that native offset path without
# replacing Rails, ActionView, ERB execution, or output escaping.
# The guide runtime (Ruby 4.0.7) renders correctly without it (tests/summary-node.mjs).
return unless RUBY_VERSION.start_with?('3.3.')

require 'erubi'

erubi_path = $LOADED_FEATURES.find { |feature| feature.end_with?('/erubi.rb') }
erubi_source = File.read(erubi_path)
unless erubi_source.include?('match.begin(0)') && erubi_source.include?('match.end(0)')
  raise 'Unsupported Erubi source for the pinned Wasm compatibility shim'
end

erubi_source = erubi_source.gsub('match.begin(0)', 'match.pre_match.length')
                           .gsub('match.end(0)', '(input.length - match.post_match.length)')
previous_verbose = $VERBOSE
begin
  $VERBOSE = nil
  eval(erubi_source, TOPLEVEL_BINDING, erubi_path) # rubocop:disable Security/Eval -- patched copy of the bundled gem, no external input
ensure
  $VERBOSE = previous_verbose
end
