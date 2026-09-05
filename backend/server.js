const WebSocket = require("ws");

const server = new WebSocket.Server({
  port: 3000,
  path: "/ws",
});

server.on("connection", (socket) => {
  console.log("✅ Client connected");

  socket.on("message", (msg) => {
    console.log("📩 Received:", msg.toString());
    socket.send(`Echo: ${msg}`);
  });
});

console.log("🚀 WebSocket server running at ws://localhost:3000/ws");