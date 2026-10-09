# A past RubyKaigi, linked to its official schedule and social events.
class Edition < StaticRecord
  backed_by 'editions.json', collection: 'editions'

  ReadingPrompt = Data.define(:title, :fact, :inference, :sources)

  attribute :year, :city, :dates, :venue, :url, :schedule_url, :events_url,
            :operations_url, :operations_label, :point

  def self.page
    document.fetch('page')
  end

  def self.reading_prompts
    document.fetch('readingPrompts').map { |prompt| ReadingPrompt.new(**prompt.symbolize_keys) }
  end

  def self.year_range
    all.map(&:year).minmax
  end

  def id
    year.to_s
  end
end
