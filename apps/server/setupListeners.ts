import { Server } from "socket.io";
import { Game } from "./classes/game";

export const rooms = new Map<String, Game>();

export function setupListeners(io: Server) {
    io.on("connection", (socket) => {
        console.log(`new connection - ${socket.id}`);

        socket.on("join-game", (roomId: string, name: string) => {
            if(!roomId) return socket.emit("error", "room does not exist");
            if(!name) return socket.emit("error", "invalid name");  

            socket.join(roomId);

            if(rooms.has(roomId)) {
                const game = rooms.get(roomId);
                if(!game) return socket.emit("error", "room does not exist");
                game.joinPlayer(socket.id, name, socket);
            }
            else {
                const game = new Game(roomId, io, socket.id);
                rooms.set(roomId, game);
                game.joinPlayer(socket.id, name, socket);
            }
        })
    })
}