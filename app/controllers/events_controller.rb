# 開催・アクセス: dates, venue, access, and what is not announced yet.
class EventsController < ApplicationController
  def show
    @event = Event.current
    respond_to do |format|
      format.html
      format.json { render json: @event }
    end
  end
end
