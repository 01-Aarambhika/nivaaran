require("dotenv").config();
const bcrypt = require("bcryptjs");
const { query, pool } = require("./config/db");

(async () => {
  try {
    const hash = await bcrypt.hash("Admin@123", 12);
    await query(
      "INSERT INTO users(name,email,password_hash,role,phone) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE role='ADMIN'",
      ["Nivaaran Administrator","admin@nivaaran.local",hash,"ADMIN","9999999999"]
    );
    const studentHash = await bcrypt.hash("Student@123", 12);
    await query(
      "INSERT INTO users(name,email,password_hash,role,phone) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)",
      ["Demo Student","student@nivaaran.local",studentHash,"STUDENT","8888888888"]
    );
    const students = await query("SELECT id FROM users WHERE email='student@nivaaran.local'");
    const existing = await query("SELECT id FROM payments WHERE user_id=? LIMIT 1", [students[0].id]);
    if (!existing.length) await query("INSERT INTO payments(user_id,description,amount,status) VALUES(?,?,?,'PENDING')", [students[0].id,"Hostel semester fee",25000]);
    console.log("Demo accounts created.");
    console.log("Admin: admin@nivaaran.local / Admin@123");
    console.log("Student: student@nivaaran.local / Student@123");
  } catch (e) { console.error(e.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
