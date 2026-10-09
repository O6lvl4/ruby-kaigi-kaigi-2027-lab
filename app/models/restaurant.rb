# A restaurant or hotel banquet hall with source-backed seating facts.
# Total seats and the bookable group size are different facts and stay separate.
class Restaurant < StaticRecord
  self.data_file = 'restaurants.json'
  self.collection_key = 'restaurants'

  attribute :name, :address, :venue_type, :total_seats, :group_capacity, :group_capacity_label,
            :standing_capacity, :standing_capacity_label, :cuisine, :opening_hours, :closed_days,
            :private_room, :private_booking, :accessibility, :note, :coordinates,
            :coordinate_precision, :coordinate_source_url, :source_url, :source_label,
            :source_updated_at, :thumbnail, :address_qualification, :address_note,
            :google_maps_query, :google_maps_destination

  def self.page
    document.fetch('page')
  end

  def self.areas
    all.map(&:area).uniq.sort
  end

  def hotel_banquet?
    venue_type == 'hotel_banquet'
  end

  def group_size_listed?
    !group_capacity.nil?
  end

  def located?
    coordinates.is_a?(Array) && coordinates.length == 2
  end

  # Town name without prefecture, city or block number, e.g. "橘通西".
  def area
    address.delete_prefix('宮崎県').delete_prefix('宮崎市')
           .chars.take_while { |character| !'0123456789０１２３４５６７８９'.include?(character) }.join.strip
  end

  # Extra provenance links (fields sourced elsewhere than the main source page).
  def supplementary_source_urls
    @attributes.fetch('fieldSources', {}).values.flatten
               .map { |value| @attributes[value] || value }
               .select { |url| url.is_a?(String) && url.start_with?('https://') && url != source_url }
               .uniq
  end
end
