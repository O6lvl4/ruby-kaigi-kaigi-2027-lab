# Source-checked examples of official gifts, sponsor goods, and sold merchandise.
class Novelty < StaticRecord
  backed_by 'novelties.json', collection: 'novelties'

  attribute :year, :city, :event_url, :name, :category, :provider, :distribution,
            :note, :source_label, :source_url, :has_source_photo

  def self.resources
    document.fetch('resources')
  end

  def self.coverage_note
    document.fetch('coverageNote')
  end
end
