# RubyKaigi 2027 as published on the official sites, checked on a fixed date.
# Public facts only: no private organizer data and no invented progress.
class Event
  Route = Data.define(:origin, :main, :detail, :alternative)
  Item = Data.define(:title, :detail)

  def self.current
    new(JSON.parse(Rails.root.join('db/data/event.json').read))
  end

  attr_reader :name, :dates, :city, :venue, :venue_detail, :postal_code, :address,
              :official_url, :access_url, :floor_map_url, :checked_at, :checked_on_label,
              :routes, :open_questions, :proposed_checks

  def initialize(attributes)
    @name, @dates, @city = attributes.values_at('name', 'dates', 'city')
    @venue, @venue_detail = attributes.values_at('venue', 'venueDetail')
    @postal_code, @address = attributes.values_at('postalCode', 'address')
    @official_url, @access_url, @floor_map_url = attributes.values_at('officialUrl', 'accessUrl', 'floorMapUrl')
    @checked_at, @checked_on_label = attributes.values_at('checkedAt', 'checkedOnLabel')
    @routes = attributes.fetch('routes').map { |route| Route.new(**route.symbolize_keys) }
    @open_questions = attributes.fetch('openQuestions').map { |item| Item.new(**item.symbolize_keys) }
    @proposed_checks = attributes.fetch('proposedChecks').map { |item| Item.new(**item.symbolize_keys) }
    @attributes = attributes
  end

  def as_json(*)
    @attributes
  end
end
