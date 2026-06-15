class MessageService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  async getOrCreateRoom(application_id, employer_id, candidate_id) {
    if (!application_id && candidate_id) {
      const cand = await this.db.User.findByPk(candidate_id);
      if (!cand) throw this.errorManager.getError("NOT_FOUND", "Candidate user not found");
    }

    const where = application_id 
      ? { application_id } 
      : { employer_id, candidate_id, application_id: null };

    const [room, created] = await this.db.ChatRoom.findOrCreate({
      where,
      defaults: { application_id, employer_id, candidate_id },
    });

    // Fix stale IDs on existing rooms
    if (!created && (room.employer_id !== employer_id || room.candidate_id !== candidate_id)) {
      room.employer_id = employer_id;
      room.candidate_id = candidate_id;
      await room.save();
    }

    return this.db.ChatRoom.findByPk(room.id, {
      include: [
        {
          model: this.db.Application,
          as: "application",
          include: [{ model: this.db.Job, as: "job", attributes: ["id", "title", "company_name"] }],
        },
        {
          model: this.db.User,
          as: "candidate",
          attributes: ["id", "first_name", "last_name", "email"],
        }
      ],
    });
  }

  async createMessage(room_id, sender_id, message) {
    const msg = await this.db.Message.create({ room_id, sender_id, message });
    const full = await this.db.Message.findByPk(msg.id, {
      include: [
        { model: this.db.User, as: "sender", attributes: ["id", "first_name", "last_name", "email"] },
        { 
          model: this.db.ChatRoom, 
          as: "room", 
          include: [
            { model: this.db.Application, as: "application", include: [{ model: this.db.Job, as: "job" }] },
            { model: this.db.User, as: "candidate", attributes: ["id", "first_name", "last_name", "email"] }
          ] 
        }
      ],
    });

    // Notify the other participant
    const room = full.room;
    let recipient_user_id;
    if (String(room.candidate_id) === String(sender_id)) {
      // Sender is candidate — notify the employer's user
      const employer = await this.db.Employer.findByPk(room.employer_id, { attributes: ["user_id"] });
      recipient_user_id = employer?.user_id;
    } else {
      // Sender is employer — notify the candidate
      recipient_user_id = room.candidate_id;
    }

    if (recipient_user_id) {
      const { default: NotificationService } = await import("./notificationService.js");
      const notificationService = new NotificationService({ db: this.db, errorManager: this.errorManager });

      const jobTitle = room.application?.job?.title || "Direct Message";
      await notificationService.create({
        user_id: recipient_user_id,
        title: "New Message",
        message: `You have a new message regarding ${room.application?.job ? `the "${jobTitle}" position` : "a potential opportunity"}.`,
        type: "message",
        link: room.application_id ? `/dashboard/applications/${room.application_id}` : `/dashboard/messages/${room.id}`,
      });
    }

    return full;
  }

  async getMessages(room_id, { page = 1, pageSize = 50 } = {}) {
    const offset = (Math.max(1, page) - 1) * pageSize;
    const { count, rows } = await this.db.Message.findAndCountAll({
      where: { room_id },
      order: [["created_at", "ASC"]],
      limit: pageSize,
      offset,
      include: [{ model: this.db.User, as: "sender", attributes: ["id", "first_name", "last_name", "email"] }],
    });
    return {
      items: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  }

  async getUserRooms(user_id) {
    const { getEmployerForUser } = await import("../utils/employerLookup.js");
    const employer = await getEmployerForUser(this.db, user_id);

    const where = {
      [this.db.Sequelize.Op.or]: [
        { employer_id: user_id }, 
        { candidate_id: user_id },
      ],
      status: "active",
    };

    if (employer) {
      where[this.db.Sequelize.Op.or].push({ employer_id: employer.id });
    }

    const rooms = await this.db.ChatRoom.findAll({
      where,
      order: [["updated_at", "DESC"]],
      include: [
        {
          model: this.db.Application,
          as: "application",
          include: [
            { model: this.db.Job, as: "job", attributes: ["id", "title", "company_name"] },
            { model: this.db.User, as: "user", attributes: ["id", "first_name", "last_name", "email"] },
          ],
        },
        {
          model: this.db.User,
          as: "candidate",
          attributes: ["id", "first_name", "last_name", "email"],
        }
      ],
    });
    return rooms;
  }
}

export default MessageService;
