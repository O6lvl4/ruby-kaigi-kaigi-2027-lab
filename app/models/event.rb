# RubyKaigi 2027 as published on the official sites, checked on a fixed date.
# Public facts only: no private organizer data and no invented progress.
class Event < StaticRecord
  backed_by 'event.json'

  Route = Data.define(:origin, :main, :detail, :alternative)
  Item = Data.define(:title, :detail)

  attribute :name, :dates, :city, :venue, :venue_detail, :postal_code, :address,
            :official_url, :access_url, :floor_map_url, :checked_at, :checked_on_label

  def self.current
    new(document)
  end

  def routes
    build_all(Route, 'routes')
  end

  def open_questions
    build_all(Item, 'openQuestions')
  end

  def proposed_checks
    build_all(Item, 'proposedChecks')
  end

  private

  def build_all(type, key)
    @attributes.fetch(key).map { |attributes| type.new(**attributes.symbolize_keys) }
  end
end
