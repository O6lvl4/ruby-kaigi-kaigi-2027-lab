# Where each place sits on the 1000×900 schematic SVG (not to scale; north up).
class SchematicLayout
  Point = Data.define(:x, :y, :label, :lx, :ly, :anchor)

  POINTS = {
    'jingu_station' => Point.new(x: 730, y: 150, label: '宮崎神宮駅', lx: 762, ly: 154, anchor: 'start'),
    'bunkakoen' => Point.new(x: 380, y: 230, label: '文化公園前', lx: 370, ly: 189, anchor: 'middle'),
    'venue' => Point.new(x: 270, y: 300, label: '文化センター', lx: 270, ly: 360, anchor: 'middle'),
    'tachibana' => Point.new(x: 470, y: 490, label: '橘通り3丁目', lx: 450, ly: 445, anchor: 'end'),
    'miyazaki_station' => Point.new(x: 750, y: 515, label: '宮崎駅', lx: 785, ly: 526, anchor: 'start'),
    'nishitachi' => Point.new(x: 340, y: 555, label: 'ニシタチ', lx: 330, ly: 611, anchor: 'middle'),
    'airport' => Point.new(x: 815, y: 795, label: '宮崎空港', lx: 815, ly: 856, anchor: 'middle')
  }.freeze

  def self.point_for(place)
    POINTS.fetch(place.id)
  end
end
