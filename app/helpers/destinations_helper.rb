require 'uri'

# Destination-only Google Maps links: the visitor picks the origin in Google Maps.
# This application never asks for or sends the visitor's current location.
module DestinationsHelper
  TRAVEL_MODES = %w[walking driving].freeze

  def google_maps_search_url(destination)
    "https://www.google.com/maps/search/?api=1&query=#{URI.encode_www_form_component(maps_query(destination))}"
  end

  def google_maps_directions_url(destination, mode)
    raise ArgumentError, 'Unsupported travel mode' unless TRAVEL_MODES.include?(mode)

    target = destination.google_maps_destination || maps_query(destination)
    "https://www.google.com/maps/dir/?api=1&destination=#{URI.encode_www_form_component(target)}&travelmode=#{mode}"
  end

  # Google Maps directions through fixed places (never the visitor's location),
  # e.g. 宮崎駅 → 文化公園前 → 文化センター on foot.
  def google_maps_route_url(places, mode)
    raise ArgumentError, 'Unsupported travel mode' unless TRAVEL_MODES.include?(mode)

    *stops, last = places.map { |place| place.google_maps_destination || maps_query(place) }
    query = { api: 1, origin: stops.first, destination: last, travelmode: mode }
    query[:waypoints] = stops.drop(1).join('|') if stops.size > 1
    "https://www.google.com/maps/dir/?#{URI.encode_www_form(query)}"
  end

  def destination_copy_text(destination)
    [destination.name, destination.address, destination.address_qualification || destination.address_note].compact.join("\n")
  end

  private

  def maps_query(destination)
    destination.google_maps_query || [destination.name, destination.address].compact.join(' ')
  end
end
