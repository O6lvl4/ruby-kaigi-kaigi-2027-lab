# A road-following route along one scenario path, for walking or driving,
# precomputed from OpenStreetMap (scripts/generate-map-routes.mjs).
# Distance and duration are routing estimates, not official travel times.
class MapRoute < StaticRecord
  backed_by 'map_routes.json', collection: 'routes'

  MODES = { 'walking' => '徒歩', 'driving' => '車' }.freeze

  attribute :scenario, :path, :mode, :place_ids, :distance, :duration, :coordinates

  def self.source
    document.fetch('source')
  end

  def self.for(scenario)
    all.select { |route| route.scenario == scenario.id }
  end

  def mode_label
    MODES.fetch(mode)
  end

  def kilometres
    (distance / 1000.0).round(1)
  end

  def minutes
    (duration / 60.0).round
  end

  def to_geojson
    {
      type: 'Feature', id:,
      geometry: { type: 'LineString', coordinates: },
      properties: { kind: 'road', mode:, path:, place_ids:, distance:, duration: }
    }
  end
end
