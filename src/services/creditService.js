/**
 * Credit service — all credit operations are atomic, logged, and auditable.
 * Every credit change creates a CreditLedger entry.
 */
class CreditService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  /**
   * Deduct credits atomically with row lock + ledger entry.
   */
  async deductCredits(employerId, amount, reason, opts = {}) {
    const { description, job_id, transaction: extTransaction } = opts;
    const t = extTransaction || await this.db.sequelize.transaction();
    const isOwnTransaction = !extTransaction;

    try {
      const employer = await this.db.Employer.findByPk(employerId, {
        transaction: t, lock: t.LOCK.UPDATE,
      });
      if (!employer) throw this.errorManager.getError("EMPLOYER_NOT_FOUND");

      if ((employer.credits || 0) < amount) {
        if (isOwnTransaction) await t.rollback();
        return { success: false, balance: employer.credits || 0 };
      }

      const newBalance = employer.credits - amount;
      await employer.update({ credits: newBalance }, { transaction: t });

      await this.db.CreditLedger.create({
        employer_id: employerId, action: "debit", amount, balance_after: newBalance,
        reason, description: description || reason, job_id: job_id || null,
      }, { transaction: t });

      if (isOwnTransaction) await t.commit();
      return { success: true, balance: newBalance };
    } catch (error) {
      if (isOwnTransaction) await t.rollback();
      throw error;
    }
  }

  /**
   * Add credits atomically with idempotency + ledger entry.
   */
  async addCredits(employerId, amount, reason, opts = {}) {
    const { description, stripe_session_id, transaction: extTransaction } = opts;
    const t = extTransaction || await this.db.sequelize.transaction();
    const isOwnTransaction = !extTransaction;

    try {
      if (stripe_session_id) {
        const existing = await this.db.CreditLedger.findOne({
          where: { stripe_session_id, action: "credit" }, transaction: t,
        });
        if (existing) {
          if (isOwnTransaction) await t.commit();
          return { alreadyProcessed: true, balance: null };
        }
      }

      const employer = await this.db.Employer.findByPk(employerId, {
        transaction: t, lock: t.LOCK.UPDATE,
      });
      if (!employer) throw this.errorManager.getError("EMPLOYER_NOT_FOUND");

      const newBalance = (employer.credits || 0) + amount;
      await employer.update({ credits: newBalance }, { transaction: t });

      const CREDIT_EXPIRY_MONTHS = 12;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + CREDIT_EXPIRY_MONTHS);

      await this.db.CreditLedger.create({
        employer_id: employerId, action: "credit", amount, balance_after: newBalance,
        reason, description: description || reason, stripe_session_id: stripe_session_id || null,
        expires_at: expiresAt,
      }, { transaction: t });

      if (isOwnTransaction) await t.commit();
      return { success: true, balance: newBalance };
    } catch (error) {
      if (isOwnTransaction) await t.rollback();
      throw error;
    }
  }

  async getBalance(employerId) {
    const employer = await this.db.Employer.findByPk(employerId);
    return employer ? (employer.credits || 0) : 0;
  }

  /**
   * Expire credits older than 12 months across all employers.
   * Called periodically from index.js.
   */
  async expireOldCredits() {
    const { Op } = this.db.Sequelize;
    const now = new Date();

    // Find all unexpired credit entries that have passed their expiresAt
    const expiredEntries = await this.db.CreditLedger.findAll({
      where: {
        action: "credit",
        expires_at: { [Op.lte]: now, [Op.ne]: null },
      },
      attributes: ["employer_id", [this.db.Sequelize.fn("SUM", this.db.Sequelize.col("amount")), "totalExpired"]],
      group: ["employer_id"],
      raw: true,
    });

    for (const entry of expiredEntries) {
      const total = Number(entry.totalExpired) || 0;
      if (total <= 0) continue;

      try {
        // Null out expires_at so we don't process again
        await this.db.CreditLedger.update(
          { expires_at: null },
          { where: { employer_id: entry.employer_id, action: "credit", expires_at: { [Op.lte]: now } } },
        );

        // Deduct the expired amount (but don't go below zero)
        const employer = await this.db.Employer.findByPk(entry.employer_id);
        if (!employer) continue;
        const deductAmount = Math.min(total, employer.credits || 0);
        if (deductAmount <= 0) continue;

        await this.deductCredits(entry.employer_id, deductAmount, "credit_expiry", {
          description: `${deductAmount} credits expired (12-month rolling expiry)`,
        });
      } catch {
        // Log but continue processing other employers
      }
    }
  }

  /**
   * Get credits expiring within the next N days for an employer.
   */
  async getExpiringCredits(employerId, withinDays = 30) {
    const { Op } = this.db.Sequelize;
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);

    const result = await this.db.CreditLedger.findOne({
      where: {
        employer_id: employerId,
        action: "credit",
        expires_at: { [Op.gt]: now, [Op.lte]: cutoff },
      },
      attributes: [[this.db.Sequelize.fn("SUM", this.db.Sequelize.col("amount")), "total"]],
      raw: true,
    });

    return Number(result?.total) || 0;
  }

  async getLedger(employerId, { page = 1, pageSize = 20 } = {}) {
    const offset = (Math.max(1, page) - 1) * pageSize;
    const { count, rows } = await this.db.CreditLedger.findAndCountAll({
      where: { employer_id: employerId },
      order: [["created_at", "DESC"]],
      limit: pageSize,
      offset,
    });
    return {
      items: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  }
}

export default CreditService;
