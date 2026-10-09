module ApplicationHelper
  SITE_NAME = 'RubyKaigiKaigi 2027'.freeze

  # Full document title for the current page, e.g. "ごはん・人数｜RubyKaigiKaigi 2027".
  def page_title
    [content_for(:title), SITE_NAME].compact_blank.join('｜')
  end

  # Opens an external official page in a new tab.
  def external_link_to(name, url, **options)
    link_to "#{name} ↗", url, target: '_blank', rel: 'noopener noreferrer', **options
  end

  # A static file served next to the guide (lab.html, runtime-check.html).
  def static_file_path(file)
    "#{request.script_name}/#{file}"
  end

  # Two-digit list number shared by cards and map pins ("01", "02", …).
  def list_number(position)
    format('%02d', position)
  end

  def section_label(number, title_html, id: nil)
    tag.div(class: 'section-label') do
      tag.span(number) + tag.h2(title_html, id:)
    end
  end
end
