# Lab only: a synthetic venue candidate persisted to PGlite (IndexedDB).
class Venue < ApplicationRecord
  CATEGORIES = %w[venue hotel food].freeze

  validates :name, presence: true, length: { maximum: 100 }, uniqueness: true
  validates :area, presence: true, length: { maximum: 100 }
  validates :category, inclusion: { in: CATEGORIES }
  validates :capacity, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 100_000 }
  validates :estimated_cost, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 100_000_000 }
end
