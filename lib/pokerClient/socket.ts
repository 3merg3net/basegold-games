let socket: WebSocket | null = null;

export function getPokerSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return socket;

  // LOCAL DEV: ws://localhost:8080
  // RAILWAY: will replace this with your live ws URL later
  socket = new WebSocket(process.env.NEXT_PUBLIC_POKER_WS ?? "ws://localhost:8080");

  socket.onopen = () => {
    console.log("Poker WS connected");
  };

  socket.onclose = () => {
    console.log("Poker WS disconnected");
  };

  return socket;
}
