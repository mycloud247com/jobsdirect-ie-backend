import { Server } from "socket.io";
import MessageService from "./messageService.js";

let ioRef = null;

export function getIO() {
  return ioRef;
}

export default class SocketService {
  constructor({ server, allowedOrigins, db, errorManager }) {
    this.db = db;
    this.errorManager = errorManager;
    this.messageService = new MessageService({ db, errorManager });

    this.io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
    });

    ioRef = this.io;
  }

  listen() {
    this.io.on("connection", (socket) => {
      console.log(`[Socket] Connected: ${socket.id}`);

      socket.on("joinRoom", (room_id) => {
        if (room_id) socket.join(room_id);
      });

      socket.on("joinNotificationRoom", (user_id) => {
        if (user_id) socket.join(`user:${user_id}`);
      });

      socket.on("sendMessage", async (data) => {
        try {
          const { room_id, sender_id, message } = data;
          if (!room_id || !sender_id || !message) return;

          const saved = await this.messageService.createMessage(room_id, sender_id, message);
          this.io.to(room_id).emit("receiveMessage", {
            id: saved.id,
            room_id,
            sender_id,
            message: saved.message,
            sender: saved.sender,
            created_at: saved.created_at,
          });
        } catch (err) {
          console.error("[Socket] sendMessage error:", err.message);
        }
      });

      socket.on("typing", (data) => {
        if (data.room_id) {
          socket.to(data.room_id).emit("userTyping", {
            user_id: data.user_id,
            is_typing: data.is_typing,
          });
        }
      });

      socket.on("disconnect", () => {
        // cleanup if needed
      });
    });

    console.log("[Socket] Listening for connections");
  }
}
