import { Server } from "socket.io";

let _io: Server | null = null;

export function setSocketServer(server: Server) {
  _io = server;
}

export function getSocketServer(): Server | null {
  return _io;
}
