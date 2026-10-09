# The browser worker has no TTY. Only Rails' textual route inspector uses this
# deterministic virtual console size; no native terminal I/O is exposed.
class IO
  def self.console_size = [24, 80]
end
