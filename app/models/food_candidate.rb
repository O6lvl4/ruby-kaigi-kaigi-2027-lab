# Public-source leads for catering and parties, not confirmed bookings.
class FoodCandidate < StaticRecord
  backed_by 'food_candidates.json', collection: 'candidates'

  attribute :category, :name, :summary, :source_url, :source_label, :checked_at,
            :status, :price_note, :capacity_note, :checks, :planning_facts, :next_question

  def self.categories
    document.fetch('categories')
  end
end
