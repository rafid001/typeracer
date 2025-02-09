import { Server, Socket } from "socket.io";
import { generateParagraph } from "../utils/generateParagraph";
import { rooms } from "../setupListeners";

export class Game {
    gameStatus: "not-started" | "in-progress" | "finished";
    gameId: string;
    players: {
        id: string,
        score: number,
        name: string
    }[];
    io: Server;
    gameHost: string;
    paragraph: string;

    constructor(id: string, io: Server, host: string) {
        this.gameStatus = "not-started";
        this.gameId = id;
        this.players = [];
        this.io = io;
        this.gameHost = host;
        this.paragraph = '';
    }

    setupListeners(socket: Socket) {
        socket.on("start-game", async () => {

            //check if game is in progress, you can't start it.
            if(this.gameStatus === 'in-progress')
                return socket.emit("error", "game has already started");

            //to check if someone(not-host) tries to start the game.
            if(this.gameHost !== socket.id)
                return socket.emit("error", "you are not host of the game, only the host can start the game");

            //at start of each game set players score to 0.
            for(const player of this.players)  {
                player.score = 0;
            }

            //to keep frontend in sync, emit an player event with updated players info
            this.io.to(this.gameId).emit("player", this.players);

            //start the game.
            this.gameStatus = "in-progress";

            //get the Paragraph
            this.paragraph = await generateParagraph();

            //refelect paragraph on frontend
            this.io.to(this.gameId).emit("game-started", this.paragraph);

            //logic to end the game
            setTimeout(() => {
                this.gameStatus = "finished";
                this.io.to(this.gameId).emit("game-finished");
                this.io.to(this.gameId).emit("player", this.players);
            }, 60000)
        })

        socket.on("player-typed", (typed: string) => {
            if(this.gameStatus === 'in-progress')
                return socket.emit("error", "game has not started yet!");

            const splittedParagraph = this.paragraph.split(" ");
            const splittedTyped = typed.split(" ");

            let score = 0;

            for(let i=0; i<splittedTyped.length; i++) {
                if(splittedTyped[i] === splittedParagraph[i]) {
                    score++;
                }
                else {
                    break;
                }
            }

            const player = this.players.find(player => player.id === socket.id);
            if(player) {
                player.score = score;
            }
            this.io.to(this.gameId).emit("player-score", {id: socket.id, score});
        })

        socket.on("leave", () => {
            if(socket.id === this.gameHost) {
                this.players = this.players.filter((player) => player.id !== socket.id);

                if(this.players.length !== 0) {
                    this.gameHost = this.players[0].id;
                    this.io.to(this.gameId).emit("new-host", this.gameHost);
                    this.io.to(this.gameId).emit("player-left", socket.id);
                }
                else {
                    rooms.delete(this.gameId);
                }
            }

            socket.leave(this.gameId);
            this.players = this.players.filter((player) => player.id !== socket.id);
            this.io.to(this.gameId).emit("player-left", socket.id);
        })

        socket.on("disconnected", () => {
            if(socket.id === this.gameHost) {
                this.players = this.players.filter((player) => player.id !== socket.id);

                if(this.players.length !== 0) {
                    this.gameHost = this.players[0].id;
                    this.io.to(this.gameId).emit("new-host", this.gameHost);
                    this.io.to(this.gameId).emit("player-left", socket.id);
                }
                else {
                    rooms.delete(this.gameId);
                }
            }

            socket.leave(this.gameId);
            this.players = this.players.filter((player) => player.id !== socket.id);
            this.io.to(this.gameId).emit("player-left", socket.id);
        })
    }

    joinPlayer(id: string, name: string, socket: Socket) {
        if(this.gameStatus === 'in-progress')
            return socket.emit("error", "game has already started! please wait");

        this.players.push({id, name, score: 0});

        //socket -> represents user
        //io -> refers to everyone

        this.io.to(this.gameId).emit("player-join" , {
            id, name, score: 0
        })

        // above step was to emit an event to that particular gameId, so everyone in the game is informed
        // about the new player added, (to keep frontends in sync).

        socket.emit('player', this.players);

        //above step was to inform the newly added user about the people who are already in game

        socket.emit("new-host", this.gameHost) // update the host.

        this.setupListeners(socket);
    }
}