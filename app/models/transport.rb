# Public transport facts around the 2027 venue, checked on a fixed date.
# Operators, routes and rules come from official pages; nothing here records who
# is arranging what — that coordination stays out of this public guide.
class Transport < StaticRecord
  backed_by 'transport.json'

  Route = Data.define(:from, :mode, :line, :stops, :time, :frequency, :note, :source_urls)
  Operator = Data.define(:name, :area, :url, :inquiry_url, :safety, :note, :source_urls)
  Taxi = Data.define(:name, :url, :note, :source_urls)
  Practice = Data.define(:year, :city, :summary, :source_url)
  Rule = Data.define(:title, :summary, :source_url)
  Check = Data.define(:title, :reason, :source_url)

  attribute :checked_at, :page

  def self.current
    new(document)
  end

  def routes = build(Route, 'routes')
  def operators = build(Operator, 'operators')
  def taxis = build(Taxi, 'taxis')
  def past_practices = build(Practice, 'pastPractices')
  def rules = build(Rule, 'rules')
  def checklist = build(Check, 'checklist')

  private

  def build(type, key)
    @attributes.fetch(key).map do |attributes|
      values = type.members.index_with { |member| attributes[member.to_s.camelize(:lower)] }
      type.new(**values)
    end
  end
end
