# Lab only: CRUD over synthetic venue records in PGlite.
class VenuesController < ActionController::API
  def index
    runtime = { ruby: RUBY_VERSION, rails: Rails.version, platform: RUBY_PLATFORM, adapter: Venue.connection.adapter_name }
    render json: { venues: Venue.order(:id), runtime: }
  end

  def create
    venue = Venue.new(venue_params)
    if venue.save
      render json: { venue: }, status: :created
    else
      render json: { errors: venue.errors.full_messages }, status: :unprocessable_content
    end
  end

  private

  def venue_params
    params.expect(venue: %i[name category area capacity estimated_cost])
  end
end
