import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);

const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

io.on("connection", (socket) => {
  socket.on("send_message", (data) => {
    io.emit("receive_message", data);
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
