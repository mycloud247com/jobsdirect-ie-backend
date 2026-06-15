/**
 * Change credits columns from INTEGER to FLOAT to support partial credits (0.5).
 */
export async function up(qi) {
  await qi.sequelize.query(`ALTER TABLE employers ALTER COLUMN credits TYPE DOUBLE PRECISION USING credits::DOUBLE PRECISION;`);
  await qi.sequelize.query(`ALTER TABLE payments ALTER COLUMN credits TYPE DOUBLE PRECISION USING credits::DOUBLE PRECISION;`);
}

export async function down(qi) {
  await qi.sequelize.query(`ALTER TABLE employers ALTER COLUMN credits TYPE INTEGER USING credits::INTEGER;`);
  await qi.sequelize.query(`ALTER TABLE payments ALTER COLUMN credits TYPE INTEGER USING credits::INTEGER;`);
}
