# One way of reading the Miyazaki map ("arriving", "to the venue", "night out"):
# which places matter, in what order, and the schematic lines that connect them.
# Lines are schematic connections only, never road-following navigation.
class MapScenario < StaticRecord
  self.data_file = 'map_scenarios.json'
  self.collection_key = 'scenarios'

  DEFAULT_ID = 'arrival'
  OVERVIEW_CAMERA = [0, 0, 1000, 900].freeze

  attribute :label, :title, :description, :guidance, :source, :place_ids, :paths,
            :schematic_routes, :camera

  def self.find_or_default(id)
    find(id.presence || DEFAULT_ID)
  end

  def places
    all_places = Place.all
    place_ids.map do |id|
      place = all_places.find { |candidate| candidate.id == id } || raise("Missing verified place: #{id}")
      raise "Missing coordinate verification: #{id}" unless place.verified_location?

      place
    end
  end

  def includes?(place)
    place_ids.include?(place.id)
  end

  def number_of(place)
    index = place_ids.index(place.id)
    index && index + 1
  end

  def geojson
    { type: 'FeatureCollection', features: point_features + line_features }
  end

  # Shape consumed by app/javascript/features/map/map_guide.js.
  def as_json(*)
    {
      key: id, label:, title:, description:, guidance:, source:,
      checked_on: self.class.checked_at,
      places: places.map(&:as_json),
      all_places: Place.all.map(&:as_json),
      selected_ids: place_ids,
      schematic: { view_box: camera, overview: OVERVIEW_CAMERA },
      geojson:
    }
  end

  private

  def point_features
    Place.all.map do |place|
      {
        type: 'Feature', id: place.id,
        geometry: { type: 'Point', coordinates: place.coordinates },
        properties: place.as_json.except('coordinates').merge(number: number_of(place), selected: includes?(place))
      }
    end
  end

  def line_features
    by_id = places.index_by(&:id)
    paths.each_with_index.map do |ids, index|
      {
        type: 'Feature', id: "#{id}-schematic-#{index}",
        geometry: { type: 'LineString', coordinates: ids.map { |place_id| by_id.fetch(place_id).coordinates } },
        properties: { kind: 'schematic', label: '概略線・道路に沿ったナビではありません', place_ids: ids, source: }
      }
    end
  end
end
