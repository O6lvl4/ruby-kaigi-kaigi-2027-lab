# 過去の開催: past RubyKaigi editions and how to read their programs.
class EditionsController < ApplicationController
  def index
    @editions = Edition.all
    @page = Edition.page
    @reading_prompts = Edition.reading_prompts
    @novelties = Novelty.all
    respond_to do |format|
      format.html
      format.json { render json: archive_data }
    end
  end

  private

  def archive_data
    { checkedAt: Edition.checked_at, editions: @editions,
      noveltyCheckedAt: Novelty.checked_at, novelties: @novelties, noveltyResources: Novelty.resources }
  end
end
