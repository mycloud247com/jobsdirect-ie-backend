import TeamController from "../src/controllers/TeamController.js";
import { authenticate } from "../middlewares/authenticate.js";

const Routes = [
  {
    path: "/team/invite-details",
    method: "GET",
    controller: TeamController,
    action: "getInviteDetails",
    middlewares: [],
  },
  {
    path: "/team/signup-and-accept",
    method: "POST",
    controller: TeamController,
    action: "signupAndAccept",
    middlewares: [],
    autoCommit: true,
  },
  {
    path: "/team",
    method: "GET",
    controller: TeamController,
    action: "list",
    middlewares: [authenticate],
  },
  {
    path: "/team/invite",
    method: "POST",
    controller: TeamController,
    action: "invite",
    middlewares: [authenticate],
  },
  {
    path: "/team/accept-invite",
    method: "POST",
    controller: TeamController,
    action: "acceptInvite",
    middlewares: [authenticate],
  },
  {
    path: "/team/:id/role",
    method: "PUT",
    controller: TeamController,
    action: "updateRole",
    middlewares: [authenticate],
  },
  {
    path: "/team/:id",
    method: "DELETE",
    controller: TeamController,
    action: "remove",
    middlewares: [authenticate],
  },
];

export default Routes;
