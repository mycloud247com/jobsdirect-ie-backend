/**
 * Change jobs.credits_charged from INTEGER to FLOAT to support partial credits.
 */
export async function up(qi) {
  await qi.sequelize.query(`ALTER TABLE jobs ALTER COLUMN credits_charged TYPE DOUBLE PRECISION USING credits_charged::DOUBLE PRECISION;`);
}

export async function down(qi) {
  await qi.sequelize.query(`ALTER TABLE jobs ALTER COLUMN credits_charged TYPE INTEGER USING credits_charged::INTEGER;`);
}
