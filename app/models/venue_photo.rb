# Openly licensed photographs of each edition's venue (Wikimedia Commons).
class VenuePhoto < StaticRecord
  backed_by 'venue_photos.json', collection: 'photos'

  attribute :year, :title, :alt, :src, :width, :height, :source_url, :source_label,
            :creator, :license, :license_url, :credit, :kind, :changes

  def self.for_edition(edition)
    all.find { |photo| photo.year == edition.year && edition.id == edition.year.to_s }
  end

  def kind_label = '会場'
  def note = nil
  def license_label = license
end
