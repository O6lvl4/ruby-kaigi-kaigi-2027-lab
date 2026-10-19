# ごはん・人数: restaurants and banquet halls filtered by group size.
class RestaurantsController < ApplicationController
  def index
    @restaurants = Restaurant.all
    @page = Restaurant.page
    @food_candidates = FoodCandidate.all
    @food_categories = FoodCandidate.categories
    respond_to do |format|
      format.html
      format.json { render json: { checkedAt: Restaurant.checked_at, restaurants: @restaurants, foodCandidates: @food_candidates } }
    end
  end
end
