# Photographs with explicit reuse rights and visible provenance.
class ArchivePhoto < StaticRecord
  backed_by 'archive_photos.json', collection: 'photos'

  attribute :year, :title, :alt, :src, :width, :height, :source_url, :source_label,
            :creator, :license, :license_url, :credit, :note, :kind, :changes

  # Venue photographs and official item guides, shown in that year's record.
  def self.for_edition(edition)
    return [] unless edition.id == edition.year.to_s

    all.select { |photo| photo.year == edition.year && photo.kind != 'product_collage_mockup' }
       .sort_by { |photo| photo.photograph? ? 0 : 1 }
  end

  # Promotional images of sold goods, shown with the shop links rather than the free items.
  def self.merchandise
    all.select { |photo| photo.kind == 'product_collage_mockup' }
  end

  def license_label = license

  def photograph?
    kind == 'photograph'
  end

  def kind_label
    case kind
    when 'photograph' then '実写'
    when 'product_collage_mockup' then '販売用の紹介画像'
    else '公式の案内図'
    end
  end
end
