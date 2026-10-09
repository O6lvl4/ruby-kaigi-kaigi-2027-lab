# ごはん・人数: restaurants and banquet halls filtered by group size.
class RestaurantsController < ApplicationController
  def index
    @restaurants = Restaurant.all
    @page = Restaurant.page
    respond_to do |format|
      format.html
      format.json { render json: { checkedAt: Restaurant.checked_at, restaurants: @restaurants } }
    end
  end
end
