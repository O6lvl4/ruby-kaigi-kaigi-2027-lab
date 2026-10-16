# 移動・バス: getting to the venue, charter-bus operators, and what to confirm before booking.
class TransportsController < ApplicationController
  def show
    @transport = Transport.current
    respond_to do |format|
      format.html
      format.json { render json: @transport }
    end
  end
end
