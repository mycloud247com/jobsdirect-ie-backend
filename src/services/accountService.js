class AccountService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  async deleteAccount(user_id) {
    const user = await this.db.User.findByPk(user_id);
    if (!user) throw this.errorManager.getError("USER_NOT_FOUND");

    // Delete associated data
    await this.db.Application.destroy({ where: { user_id } });
    await this.db.SavedJob.destroy({ where: { user_id } });

    // Delete employee profile if exists
    const employee = await this.db.Employee.findOne({ where: { user_id } });
    if (employee) await employee.destroy();

    // Delete employer profile + jobs if exists
    const employer = await this.db.Employer.findOne({ where: { user_id } });
    if (employer) {
      await this.db.Job.destroy({ where: { employer_id: employer.id } });
      await this.db.Payment.destroy({ where: { employer_id: employer.id } });
      await this.db.CreditLedger.destroy({ where: { employer_id: employer.id } });
      await employer.destroy();
    }

    // Delete user
    await user.destroy();

    return { success: true };
  }
}

export default AccountService;
