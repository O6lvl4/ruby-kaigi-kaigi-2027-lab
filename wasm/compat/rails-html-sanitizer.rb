# Experimental minimal-Rails adapter. HTML sanitization is unavailable until
# Nokogiri can be linked. NEVER silently return unsanitized input as HTML-safe.
module Rails
  module HTML
    class Sanitizer
      def self.html5_support? = false
      def self.best_supported_vendor = Rails::HTML4::Sanitizer
      def self.allowed_uri?(*)
        raise NotImplementedError, 'HTML sanitization is not included in this minimal Wasm proof'
      end
    end
    class UnavailableSanitizer < Sanitizer
      class << self
        def safe_list_sanitizer = self
        def full_sanitizer = self
        def link_sanitizer = self
        def allowed_tags = []
        def allowed_attributes = []
      end
      def sanitize(*)
        raise NotImplementedError, 'HTML sanitization is not included in this minimal Wasm proof'
      end
      def sanitize_css(*)
        raise NotImplementedError, 'CSS sanitization is not included in this minimal Wasm proof'
      end
    end
  end
  module HTML4
    Sanitizer = HTML::UnavailableSanitizer
    FullSanitizer = Sanitizer
    LinkSanitizer = Sanitizer
    SafeListSanitizer = Sanitizer
  end
  Html = HTML
end
