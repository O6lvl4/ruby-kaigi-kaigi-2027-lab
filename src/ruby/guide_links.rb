# Destination-only links: the user chooses an origin in Google Maps.
# This application never asks for or sends the visitor's current location.
require 'uri'
module GuideLinks
  def self.query(place)
    place['googleMapsQuery'] || place['mapsQuery'] || [place['name'], place['address']].compact.join(' ')
  end
  def self.area(place)
    address = place.fetch('address').delete_prefix('宮崎県').delete_prefix('宮崎市')
    address.chars.take_while { |character| !('0123456789０１２３４５６７８９').include?(character) }.join.strip
  end
  def self.search(place)
    'https://www.google.com/maps/search/?api=1&query=' + URI.encode_www_form_component(query(place))
  end
  def self.directions(place, mode)
    raise ArgumentError, 'Unsupported travel mode' unless %w[walking driving].include?(mode)
    'https://www.google.com/maps/dir/?api=1&destination=' + URI.encode_www_form_component(place['googleMapsDestination'] || query(place)) + '&travelmode=' + mode
  end
end
