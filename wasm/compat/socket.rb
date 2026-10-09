# No sockets exist in this browser-only proof. Constants permit Ruby's genuine
# pure-Ruby IPAddr parser to validate Rack's in-memory request addresses.
class BasicSocket
  def initialize(*)
    raise NotImplementedError, 'Network sockets are unavailable in this Wasm proof'
  end
end
class Socket < BasicSocket
  AF_UNSPEC = 0
  AF_INET = 2
  AF_INET6 = 10
  def self.gethostname = 'localhost'
end
class IPSocket < Socket
  def self.getaddress(*)
    raise NotImplementedError, 'DNS is unavailable in this Wasm proof'
  end
end
class TCPSocket < IPSocket; end
class UDPSocket < IPSocket; end
