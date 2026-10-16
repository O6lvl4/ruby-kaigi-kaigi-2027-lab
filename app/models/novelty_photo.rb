# Photographs of novelties from the articles that document them. Most carry no
# reuse license; each keeps its author and article so it can be credited or removed.
class NoveltyPhoto < StaticRecord
  backed_by 'novelty_photos.json', collection: 'photos'

  attribute :title, :alt, :src, :width, :height, :source_url, :source_label,
            :creator, :license, :license_url, :credit, :kind, :changes, :novelty_ids, :shows

  # Best first: photos that show the whole item, then real photographs.
  def self.for_novelty(novelty)
    all.select { |photo| photo.novelty_ids.include?(novelty.id) }
       .sort_by { |photo| [photo.shows.fetch(novelty.id) == 'yes' ? 0 : 1, photo.kind == 'photograph' ? 0 : 1] }
  end

  def year = nil
  def note = nil

  def kind_label
    { 'photograph' => '実写', 'mockup' => 'モック画像', 'official_graphic' => 'デザイン図' }.fetch(kind, '画像')
  end

  def license_label
    license_url ? license : 'ライセンス表記なし（権利は著作者に帰属）'
  end
end
