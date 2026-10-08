# Public, source-checked snapshot. No private organizer data or invented progress.
# Narrow compatibility shim for the pinned Ruby 3.3.3/Wasm build.
# Erubi's MatchData#begin/#end offsets corrupt template text in this build.
# Equivalent pre/post-match lengths avoid that native offset path without
# replacing Rails, ActionView, ERB execution, or output escaping.
require 'erubi'
erubi_path = '/bundle/gems/erubi-1.13.0/lib/erubi.rb'
erubi_source = File.read(erubi_path)
unless erubi_source.include?('match.begin(0)') && erubi_source.include?('match.end(0)')
  raise 'Unsupported Erubi source for the pinned Wasm compatibility shim'
end
erubi_source = erubi_source.gsub('match.begin(0)', 'match.pre_match.length').gsub('match.end(0)', '(input.length - match.post_match.length)')
previous_verbose = $VERBOSE
begin
  $VERBOSE = nil
  eval(erubi_source, TOPLEVEL_BINDING, erubi_path)
ensure
  $VERBOSE = previous_verbose
end

class PreparationSnapshot
  def self.current
    {
      checked_on: '2026-10-08', checked_on_label: '2026年10月8日',
      event: 'RubyKaigi 2027', dates: '2027年4月14日〜16日', city: '宮崎県宮崎市',
      venue: 'メディキット県民文化センター', venue_detail: '宮崎県立芸術劇場 / Miyazaki Prefectural Arts Theater',
      address: '宮崎市船塚3丁目210番地', official_url: 'https://rubykaigi.org/2027/',
      access_url: 'https://miyazaki-ac.jp/access/',
      routes: [
        { origin: '宮崎駅から', main: 'バス 約15分', detail: '「文化公園前」から徒歩約1分', alternative: 'タクシーは約10分' },
        { origin: '宮崎神宮駅から', main: '徒歩 約20分', detail: '劇場案内上の最寄り駅', alternative: 'タクシーは約5分' },
        { origin: '宮崎空港から', main: 'バス 約60分', detail: '橘通り3丁目で乗り換え', alternative: 'タクシーは約30分' }
      ],
      pending: [
        { title: '参加登録・チケット', detail: '販売開始日、価格、申込方法' },
        { title: 'プログラム・登壇募集', detail: 'タイムテーブル、登壇者、CFP の期間・条件' },
        { title: '関連企画・参加案内', detail: '公式の関連イベント、当日の受付など' }
      ],
      proposed_checks: [
        { title: '公式発表の差分を確認する', detail: '参加登録・CFP・プログラムの情報が追加されたら、条件と期限を元のページで確認する。' },
        { title: '現地での移動を含めて、旅程を検討する', detail: '往復の交通だけでなく、宿泊場所から会場までの移動手段と時間も比べる。予約前に変更・取消条件を確認する。' },
        { title: '必要な準備が見えたら、担当と期限を決める', detail: '自分が確認することと、人に確認することを分ける。確定していない担当者や締切を先に埋めない。' }
      ]
    }
  end
end

require '/demo/map_guide'
require '/demo/guide_links'

class SummaryController < ActionController::Base
  prepend_view_path '/demo/views'

  def show
    @snapshot = PreparationSnapshot.current
    @references = JSON.parse(File.read('/demo/public_reference_data.json'))
    @guide = MiyazakiMapGuide.select(params[:scenario])
    @runtime = { ruby: RUBY_VERSION, rails: Rails.version, platform: RUBY_PLATFORM, renderer: 'ActionView::ERB', controller: self.class.name }
    response.set_header('X-Summary-Renderer', 'Rails-ActionView-ERB')
    response.set_header('X-Ruby-Platform', RUBY_PLATFORM)
    response.set_header('X-Rails-Version', Rails.version)
    respond_to do |format|
      format.html { render template: 'summary/show', layout: false }
      format.json { render json: { snapshot: @snapshot, runtime: @runtime, map: @guide, references: @references } }
    end
  end

  def map
    @guide = MiyazakiMapGuide.select(params[:scenario])
    response.set_header('X-Summary-Renderer', 'Rails-ActionView-ERB')
    response.set_header('X-Ruby-Platform', RUBY_PLATFORM)
    cards = render_to_string(partial: 'summary/map_cards', formats: [:html])
    render json: @guide.merge(html: cards, renderer: 'Rails-ActionView-ERB', controller: self.class.name)
  rescue ArgumentError
    render json: { error: 'Unknown map scenario' }, status: :unprocessable_entity
  end
end

