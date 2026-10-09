class ApplicationController < ActionController::Base
  include BrowserRendered

  rescue_from StaticRecord::NotFound do |error|
    respond_to do |format|
      format.json { render json: { error: error.message }, status: :not_found }
      format.any { head :not_found }
    end
  end
end
