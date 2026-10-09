require_relative '../app/application'
raise 'Wrong Ruby' unless RUBY_VERSION == '4.0.7'
raise 'Wrong Rails' unless Rails.version == '8.1.4'
html = FoundationProof.request('/?name=%3Cscript%3Ealert%281%29%3C%2Fscript%3E%26%22')
raise 'HTML status' unless html[:status] == 200
raise 'Escaping failed' unless html[:body].include?('&lt;script&gt;alert(1)&lt;/script&gt;&amp;&quot;')
raise 'Unescaped hostile input' if html[:body].include?('<script>')
changed = FoundationProof.request('/?name=Changed%20in%20Ruby')
raise 'Dynamic rendering failed' unless changed[:body].include?('Changed in Ruby')
utf8 = FoundationProof.request('/?' + URI.encode_www_form(name: '宮崎 🌴 <b>海</b> &"'))
raise 'UTF-8 ERB escaping failed' unless utf8[:body].include?('宮崎 🌴 &lt;b&gt;海&lt;/b&gt; &amp;&quot;')
json = FoundationProof.request('/runtime.json?name=Roundtrip')
raise 'JSON status' unless json[:status] == 200
runtime = JSON.parse(json[:body])
raise 'Ruby data roundtrip failed' unless runtime['name'] == 'Roundtrip'
raise 'Wrong JSON Ruby' unless runtime['ruby'] == '4.0.7'
raise 'Wrong JSON Rails' unless runtime['rails'] == '8.1.4'
if defined?(Rails::HTML::UnavailableSanitizer)
  rejected = false
  begin
    ActionController::Base.helpers.sanitize('<img src=x onerror=alert(1)>')
  rescue NotImplementedError
    rejected = true
  end
  raise 'Unavailable sanitizer must fail closed' unless rejected
end
puts JSON.generate(marker: 'REAL_RAILS_PROOF_PASSED', runtime: runtime, html: html[:body])
