import MessageController from "../src/controllers/MessageController.js";
import { authenticate } from "../middlewares/authenticate.js";

const Routes = [
  {
    path: "/messages/rooms",
    method: "GET",
    controller: MessageController,
    action: "getRooms",
    middlewares: [authenticate],
    feature: "fullMessaging",
  },
  {
    path: "/messages/rooms",
    method: "POST",
    controller: MessageController,
    action: "createRoom",
    middlewares: [authenticate],
    feature: "fullMessaging",
  },
  {
    path: "/messages/:roomId",
    method: "GET",
    controller: MessageController,
    action: "getMessages",
    middlewares: [authenticate],
    feature: "fullMessaging",
  },
  {
    path: "/messages/:roomId",
    method: "POST",
    controller: MessageController,
    action: "sendMessage",
    middlewares: [authenticate],
    feature: "fullMessaging",
  },
];

export default Routes;
