# Read-only records backed by the source-checked JSON snapshots in db/data.
#
#   class Restaurant < StaticRecord
#     backed_by 'restaurants.json', collection: 'restaurants'
#     attribute :name, :group_capacity
#   end
#
# Readers are snake_case and accept camelCase or snake_case JSON keys. The file
# is re-read on every call so a changed snapshot shows in the next render.
class StaticRecord
  class NotFound < StandardError; end

  class << self
    def backed_by(file, collection: nil)
      @data_file = file
      @collection_key = collection
    end

    def attribute(*names)
      names.each do |name|
        snake_key = name.to_s
        camel_key = snake_key.camelize(:lower)
        define_method(name) { @attributes.fetch(camel_key) { @attributes[snake_key] } }
      end
    end

    def all
      records = @collection_key ? document.fetch(@collection_key) : document
      records.each_with_index.map { |attributes, index| new(attributes, position: index + 1) }
    end

    def find(id)
      all.find { |record| record.id == id.to_s } || raise(NotFound, "#{name} #{id.inspect} not found")
    end

    def document
      JSON.parse(Rails.root.join('db/data', @data_file).read)
    end

    def checked_at
      document.fetch('checkedAt')
    end

    # "restaurants/restaurant", so views can `render @restaurants`.
    def partial_path
      singular = name.underscore
      "#{singular.pluralize}/#{singular}"
    end
  end

  attr_reader :position

  def initialize(attributes, position: nil)
    @attributes = attributes
    @position = position
  end

  def id
    @attributes['id'].to_s
  end

  def to_partial_path
    self.class.partial_path
  end

  def as_json(*)
    @attributes
  end
end
