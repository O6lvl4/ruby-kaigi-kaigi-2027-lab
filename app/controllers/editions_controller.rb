# 過去の開催: past RubyKaigi editions and how to read their programs.
class EditionsController < ApplicationController
  def index
    @editions = Edition.all
    @page = Edition.page
    @reading_prompts = Edition.reading_prompts
    respond_to do |format|
      format.html
      format.json { render json: { checkedAt: Edition.checked_at, editions: @editions } }
    end
  end
end
