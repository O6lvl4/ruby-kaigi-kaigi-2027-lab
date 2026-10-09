module NavigationHelper
  # Header menu: one entry per guide page.
  def site_pages
    [
      ['宮崎の地図', root_path],
      ['開催・アクセス', event_path],
      ['ごはん・人数', restaurants_path],
      ['過去の開催', editions_path]
    ]
  end

  def nav_link_to(label, path)
    link_to label, path, aria: { current: ('page' if current_page?(path)) }
  end
end
