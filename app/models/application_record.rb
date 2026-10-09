# Lab only: Active Record is loaded when the PGlite lab boots (not in the guide).
class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
end
