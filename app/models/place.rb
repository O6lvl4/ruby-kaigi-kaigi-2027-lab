# A map point (station, venue, district) with address and coordinate provenance.
class Place < StaticRecord
  self.data_file = 'places.json'

  attribute :name, :category, :coordinates, :description, :precision_note, :source,
            :coordinate_source, :address, :address_label, :address_qualification,
            :address_source_url, :address_source_name, :address_note, :google_maps_query,
            :google_maps_destination, :google_maps_target_note

  def verified_location?
    coordinates.is_a?(Array) && coordinates.length == 2 && coordinate_source.to_s.start_with?('https://')
  end
end
