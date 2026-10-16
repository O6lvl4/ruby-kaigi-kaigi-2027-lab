# Source-checked examples of official gifts, sponsor goods, and sold merchandise.
class Novelty < StaticRecord
  backed_by 'novelties.json', collection: 'novelties'

  # What the item is, for comparing the same kind of thing across years.
  KINDS = {
    'wear' => '身につけるもの',
    'sticker' => 'ステッカー',
    'pin' => 'ピンバッジ',
    'keyboard' => 'キーボード',
    'craft' => '工芸・日用品'
  }.freeze

  # How the item reached people, grouped from the recorded category.
  REACHES = {
    'given' => '公式配布',
    'limited' => '限定・条件付き',
    'made' => '制作のみ確認',
    'sponsor' => 'スポンサー品'
  }.freeze

  attribute :year, :city, :event_url, :name, :short_name, :kind, :category, :provider, :distribution,
            :note, :source_label, :source_url, :has_source_photo

  def self.resources
    document.fetch('resources')
  end

  def self.coverage_note
    document.fetch('coverageNote')
  end

  # A compact label for the comparison table; the card always shows the full name.
  def label
    short_name || name
  end

  def anchor
    "novelty-#{id}"
  end

  def kind_label
    KINDS.fetch(kind)
  end

  def reach
    case category
    when /スポンサー/ then 'sponsor'
    when '公式制作' then 'made'
    when /限定|条件付き/ then 'limited'
    else 'given'
    end
  end

  def reach_label
    REACHES.fetch(reach)
  end
end
