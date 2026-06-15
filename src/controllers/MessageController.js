import MessageService from "../services/messageService.js";
import { getEmployerForUser } from "../utils/employerLookup.js";

class MessageController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.messageService = new MessageService(context);
  }

  /**
   * Only enforce Pro plan for employers.
   * Candidates can always access their messages.
   */
  async _enforceMessagingAccess() {
    const employer = await getEmployerForUser(this.context.db, this.req.user.id);

    // Not an employer — user is a candidate, always allowed
    if (!employer) return;

    // Employer without Pro plan — blocked
    if (employer.candidate_database_status !== "cv_db_pro") {
      throw this.context.errorManager.getError(
        "FORBIDDEN",
        "In-platform messaging requires a CV Database Pro subscription.",
      );
    }
  }

  async getRooms() {
    await this._enforceMessagingAccess();
    return this.messageService.getUserRooms(this.req.user.id);
  }

  async getMessages() {
    await this._enforceMessagingAccess();
    const { roomId } = this.req.params;
    const page = Number(this.req.query.page) || 1;
    return this.messageService.getMessages(roomId, { page });
  }

  async createRoom() {
    await this._enforceMessagingAccess();
    const { applicationId, candidateId: bodyCandidateId } = this.req.body;
    
    if (!applicationId && !bodyCandidateId) {
      throw this.context.errorManager.getError("BAD_REQUEST", "applicationId or candidateId required");
    }

    let candidateId = bodyCandidateId;
    if (applicationId) {
      const application = await this.context.db.Application.findByPk(applicationId);
      if (!application) throw this.context.errorManager.getError("NOT_FOUND", "Application not found");
      candidateId = application.user_id;
    }

    const employer = await getEmployerForUser(this.context.db, this.req.user.id);
    const employerId = employer?.id || this.req.user.id;

    return this.messageService.getOrCreateRoom(applicationId, employerId, candidateId);
  }

  async sendMessage() {
    await this._enforceMessagingAccess();
    const { roomId } = this.req.params;
    const { message } = this.req.body;
    if (!message) throw this.context.errorManager.getError("BAD_REQUEST", "message required");
    return this.messageService.createMessage(roomId, this.req.user.id, message);
  }
}

export default MessageController;
