import DB from '../config/database.js';
import EmployeeService from '../src/services/employee.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const db = new DB();
    await db.initiate();
    const service = new EmployeeService({ db, errorManager: { getError: (c, m) => new Error(m) } });
    
    const { Op } = db.Sequelize;
    const where = { isSearchable: true, profileCompleted: true };
    const { count, rows } = await db.Employee.findAndCountAll({ 
      where, 
      distinct: true,
      include: [{ model: db.User, as: 'user' }]
    });

    console.log("Raw count:", count);
    console.log("Raw rows length:", rows.length);
    if (rows.length > 0) {
      console.log("First row:", rows[0].id);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
