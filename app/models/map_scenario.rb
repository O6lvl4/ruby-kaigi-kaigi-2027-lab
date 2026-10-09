# One way of reading the Miyazaki map ("arriving", "to the venue", "night out"):
# which places matter, in what order, and the schematic lines that connect them.
# Lines are schematic connections only, never road-following navigation.
class MapScenario < StaticRecord
  backed_by 'map_scenarios.json', collection: 'scenarios'

  DEFAULT_ID = 'arrival'.freeze
  OVERVIEW_CAMERA = [0, 0, 1000, 900].freeze

  attribute :label, :title, :description, :guidance, :source, :place_ids, :paths,
            :schematic_routes, :camera, :default_travel_mode

  def self.find_or_default(id)
    find(id.presence || DEFAULT_ID)
  end

  def places
    by_id = Place.all.index_by(&:id)
    place_ids.map { |id| verified_place(by_id, id) }
  end

  def includes?(place)
    place_ids.include?(place.id)
  end

  def number_of(place)
    index = place_ids.index(place.id)
    index && (index + 1)
  end

  def geojson
    { type: 'FeatureCollection', features: point_features + line_features + road_routes.map(&:to_geojson) }
  end

  # Walking and driving routes along each path, following the road network.
  def road_routes
    MapRoute.for(self)
  end

  # Places of each path, in travel order.
  def path_places
    by_id = places.index_by(&:id)
    paths.map { |ids| by_id.values_at(*ids) }
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
      route_source: MapRoute.source,
      default_travel_mode:,
      geojson:
    }
  end

  private

  def verified_place(by_id, id)
    place = by_id[id] || raise("Missing verified place: #{id}")
    raise "Missing coordinate verification: #{id}" unless place.verified_location?

    place
  end

  def point_features
    Place.all.map { |place| place.to_geojson(number: number_of(place), selected: includes?(place)) }
  end

  def line_features
    coordinates = places.to_h { |place| [place.id, place.coordinates] }
    paths.each_with_index.map { |ids, index| line_feature(ids, index, coordinates) }
  end

  def line_feature(ids, index, coordinates)
    {
      type: 'Feature', id: "#{id}-schematic-#{index}",
      geometry: { type: 'LineString', coordinates: coordinates.values_at(*ids) },
      properties: { kind: 'schematic', label: '概略線・道路に沿ったナビではありません', place_ids: ids, source: }
    }
  end
end
