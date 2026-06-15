/**
 * Clean up any "[Hidden]" placeholder values that were accidentally saved to employee records.
 */
export async function up(qi) {
  const fields = ["phone", "address", "linkedin", "github", "website", "portfolio_url"];
  for (const field of fields) {
    await qi.sequelize.query(
      `UPDATE employees SET ${field} = NULL WHERE ${field} = '[Hidden]';`
    );
  }
}

export async function down() {
  // Cannot restore original values — no-op
}
