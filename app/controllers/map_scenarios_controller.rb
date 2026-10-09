# One map scenario as GeoJSON plus its ERB-rendered place cards.
class MapScenariosController < ApplicationController
  def show
    scenario = MapScenario.find(params[:id])
    cards = render_to_string(partial: 'map_scenarios/map_scenario', locals: { map_scenario: scenario }, formats: [:html])
    render json: scenario.as_json.merge(html: cards, renderer: BrowserRendered::RENDERER, controller: self.class.name)
  end
end
