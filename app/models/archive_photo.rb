# Photographs with explicit reuse rights and visible provenance.
class ArchivePhoto < StaticRecord
  backed_by 'archive_photos.json', collection: 'photos'

  attribute :year, :title, :alt, :src, :width, :height, :source_url, :source_label,
            :creator, :license, :license_url, :credit, :note, :kind, :changes
end
