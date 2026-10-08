# Public sources only. Coordinates and provenance live in map_places.json.
class MiyazakiMapGuide
  SCHEMATIC_POINTS = {
    'jingu_station' => {x:730,y:150,label:'宮崎神宮駅',lx:762,ly:154,anchor:'start'},
    'bunkakoen' => {x:380,y:230,label:'文化公園前',lx:370,ly:189,anchor:'middle'},
    'venue' => {x:270,y:300,label:'文化センター',lx:270,ly:360,anchor:'middle'},
    'tachibana' => {x:470,y:490,label:'橘通り3丁目',lx:450,ly:445,anchor:'end'},
    'miyazaki_station' => {x:750,y:515,label:'宮崎駅',lx:785,ly:526,anchor:'start'},
    'nishitachi' => {x:340,y:555,label:'ニシタチ',lx:330,ly:611,anchor:'middle'},
    'airport' => {x:815,y:795,label:'宮崎空港',lx:815,ly:856,anchor:'middle'}
  }.freeze
  SCHEMATIC_ROUTES = {
    'arrival' => ['M815 795 H470 V490 V230 H380 L270 300'],
    'venue' => ['M750 515 H470 V230 H380 L270 300', 'M730 150 L550 150 L270 300'],
    'night' => ['M750 515 L340 555']
  }.freeze
  SCHEMATIC_CAMERAS = {'arrival'=>[50,35,930,835], 'venue'=>[90,70,890,550], 'night'=>[150,380,830,300]}.freeze
  SCENARIOS = {
    'arrival' => {
      label: '宮崎に着く', title: '空港から会場へ、街で乗り換える',
      description: '会場公式が案内する空港からのバス移動を、位置関係で確認します。',
      ids: %w[airport tachibana bunkakoen venue],
      paths: [%w[airport tachibana bunkakoen venue]],
      guidance: '宮崎空港から「宮崎駅」行きに乗車し、橘通り3丁目で乗り換え。「古賀総合病院[22]」行きで文化公園前へ。バスは約60分、下車後は徒歩約1分という現在の会場案内です。',
      source: 'https://miyazaki-ac.jp/access/'
    },
    'venue' => {
      label: '会場へ行く', title: '駅から会場への、2つの入り方',
      description: '宮崎駅からのバスと、宮崎神宮駅からの徒歩を見比べます。',
      ids: %w[miyazaki_station jingu_station bunkakoen venue],
      paths: [%w[miyazaki_station bunkakoen venue], %w[jingu_station venue]],
      guidance: '宮崎駅西口2番乗り場から「酒泉の杜[305]」行きで約15分、文化公園前から徒歩約1分。別の選択肢として、宮崎神宮駅から会場までは徒歩約20分です。',
      source: 'https://miyazaki-ac.jp/access/'
    },
    'night' => {
      label: '夜の街へ', title: '宮崎駅から、ニシタチのエリアへ',
      description: '駅と中心街の位置関係を確認します。公式パーティー会場の案内ではありません。',
      ids: %w[miyazaki_station tachibana nishitachi],
      paths: [%w[miyazaki_station nishitachi]],
      guidance: '宮崎市観光協会は、ニシタチへのアクセスを宮崎駅から徒歩約13分と案内しています。橘通り3丁目は中心街の位置をつかむための参考地点です。',
      source: 'https://www.miyazaki-city.tourism.or.jp/spot/10046'
    }
  }.freeze
  def self.select(key = nil)
    key = 'arrival' if key.nil? || key.empty?
    scenario = SCENARIOS.fetch(key) { raise ArgumentError, 'Unknown map scenario' }
    all = JSON.parse(File.read('/demo/map_places.json'), symbolize_names: true)
    places = scenario.fetch(:ids).map do |id|
      place = all.find { |item| item.fetch(:id) == id } || raise("Missing verified place: #{id}")
      unless place[:coordinates].is_a?(Array) && place[:coordinates].length == 2 && place[:coordinate_source].to_s.start_with?('https://')
        raise "Missing coordinate verification: #{id}"
      end
      place
    end
    points = all.map do |place|
      index = scenario.fetch(:ids).index(place[:id])
      { type: 'Feature', id: place[:id], geometry: { type: 'Point', coordinates: place[:coordinates] }, properties: place.reject { |k, _| k == :coordinates }.merge(number: index ? index + 1 : nil, selected: !index.nil?) }
    end
    lines = scenario.fetch(:paths).each_with_index.map do |ids, index|
      { type: 'Feature', id: "#{key}-schematic-#{index}", geometry: { type: 'LineString', coordinates: ids.map { |id| places.find { |p| p[:id] == id }.fetch(:coordinates) } }, properties: { kind: 'schematic', label: '概略線・道路に沿ったナビではありません', place_ids: ids, source: scenario[:source] } }
    end
    scenario.reject { |k, _| %i[ids paths].include?(k) }.merge(key: key, checked_on: '2026-10-08', places: places, all_places: all, selected_ids: scenario.fetch(:ids), schematic: {view_box: SCHEMATIC_CAMERAS.fetch(key), overview: [0,0,1000,900]}, geojson: { type: 'FeatureCollection', features: points + lines })
  end
end
