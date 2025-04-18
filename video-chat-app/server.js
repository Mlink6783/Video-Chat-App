const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const waitingUsers = [];

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("joinQueue", () => {
    if (waitingUsers.length > 0) {
      const partnerSocketId = waitingUsers.shift();
      io.to(partnerSocketId).emit("matchFound", socket.id);
      socket.emit("matchFound", partnerSocketId);
    } else {
      waitingUsers.push(socket.id);
    }
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("disconnect", () => {
    const index = waitingUsers.indexOf(socket.id);
    if (index !== -1) {
      waitingUsers.splice(index, 1);
    }
    io.emit("userDisconnected", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
