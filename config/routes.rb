Rails.application.routes.draw do
  # Reading guide: one page per header item.
  root 'maps#show'
  resource :event, only: :show
  resources :restaurants, only: :index
  resources :editions, only: :index, path: 'archives'
  resources :map_scenarios, only: :show, path: 'map/scenarios'

  # Lab: synthetic records persisted to PGlite.
  resources :venues, only: %i[index create] unless GUIDE_ONLY
end
