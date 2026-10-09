# Read-only records backed by the source-checked JSON snapshots in db/data.
#
#   class Restaurant < StaticRecord
#     self.data_file = 'restaurants.json'
#     self.collection_key = 'restaurants'
#     attribute :name, :group_capacity
#   end
#
# Readers are snake_case and accept camelCase or snake_case JSON keys. The file is re-read on every
# call so a changed snapshot is reflected in the next render.
class StaticRecord
  class NotFound < StandardError; end

  class << self
    attr_accessor :data_file, :collection_key

    def attribute(*names)
      names.each do |name|
        camel_key = name.to_s.camelize(:lower)
        define_method(name) { @attributes.fetch(camel_key) { @attributes[name.to_s] } }
      end
    end

    def all
      records = collection_key ? document.fetch(collection_key) : document
      records.each_with_index.map { |attributes, index| new(attributes, position: index + 1) }
    end

    def find(id)
      all.find { |record| record.id == id.to_s } || raise(NotFound, "#{name} #{id.inspect} not found")
    end

    def document
      JSON.parse(Rails.root.join('db/data', data_file).read)
    end

    def model_name_path
      name.underscore.pluralize
    end

    def checked_at
      document.fetch('checkedAt')
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

  # Lets views `render @restaurants` like Active Model objects.
  def to_partial_path
    "#{self.class.model_name_path}/#{self.class.name.underscore}"
  end

  def as_json(*)
    @attributes
  end
end
