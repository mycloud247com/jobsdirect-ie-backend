import DB from '../config/database.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkRooms() {
  try {
    const db = new DB();
    await db.initiate();
    
    const rooms = await db.ChatRoom.findAll({
      include: [
        { model: db.User, as: 'candidate', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    console.log("Total rooms:", rooms.length);
    rooms.forEach(r => {
      console.log(`Room ${r.id}: app=${r.applicationId}, emp=${r.employerId}, cand=${r.candidateId}, candObj=${r.candidate ? r.candidate.firstName : 'NULL'}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkRooms();
