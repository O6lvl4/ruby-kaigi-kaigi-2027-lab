# 宮崎の地図: schematic and real maps of the three ways to read the city.
class MapsController < ApplicationController
  def show
    @scenario = MapScenario.find_or_default(params[:scenario])
    @scenarios = MapScenario.all
    @places = Place.all
  end
end
