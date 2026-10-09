# Lab only: CRUD over synthetic venue records in PGlite.
class VenuesController < ActionController::API
  def index
    render json: { venues: Venue.order(:id), runtime: { ruby: RUBY_VERSION, rails: Rails.version, platform: RUBY_PLATFORM, adapter: Venue.connection.adapter_name } }
  end

  def create
    venue = Venue.new(venue_params)
    if venue.save
      render json: { venue: }, status: :created
    else
      render json: { errors: venue.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def venue_params
    params.require(:venue).permit(:name, :category, :area, :capacity, :estimated_cost)
  end
end
