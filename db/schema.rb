# Lab only: PGlite schema, loaded by config/environment.rb when the table is missing.
ActiveRecord::Schema.define do
  create_table :venues do |t| # rubocop:disable Rails/CreateTableWithTimestamps -- lab records carry no audit timestamps
    t.string :name, null: false
    t.string :category, null: false
    t.string :area, null: false
    t.integer :capacity, null: false
    t.integer :estimated_cost, null: false
  end
  add_index :venues, :name, unique: true
end
