const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");

const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone });
const authPayload = (u) => ({
  token: jwt.sign({ id: u.id, name: u.name, email: u.email, role: u.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }),
  user: safeUser(u)
});
const requireUser = (ctx) => {
  if (!ctx.user) throw new Error("Please log in first.");
  return ctx.user;
};
const requireAdmin = (ctx) => {
  const u = requireUser(ctx);
  if (u.role !== "ADMIN") throw new Error("Administrator access required.");
  return u;
};

const resolvers = {
  Query: {
    me: async (_, __, ctx) => {
      if (!ctx.user) return null;
      const rows = await query("SELECT id,name,email,role,phone FROM users WHERE id=?", [ctx.user.id]);
      return rows[0] || null;
    },
    rooms: async () => query("SELECT * FROM rooms ORDER BY block_name, room_number"),
    complaints: async (_, __, ctx) => {
      const u = requireUser(ctx);
      const sql = `SELECT c.*, u.name AS student_name FROM complaints c JOIN users u ON u.id=c.user_id ${u.role === "ADMIN" ? "" : "WHERE c.user_id=?"} ORDER BY c.created_at DESC`;
      return u.role === "ADMIN" ? query(sql) : query(sql, [u.id]);
    },
    menu: async () => query("SELECT * FROM menu_items ORDER BY FIELD(meal_type,'BREAKFAST','LUNCH','DINNER'), day_name"),
    payments: async (_, __, ctx) => {
      const u = requireUser(ctx);
      const sql = `SELECT p.*, u.name AS student_name FROM payments p JOIN users u ON u.id=p.user_id ${u.role === "ADMIN" ? "" : "WHERE p.user_id=?"} ORDER BY p.created_at DESC`;
      return u.role === "ADMIN" ? query(sql) : query(sql, [u.id]);
    },
    notifications: async (_, __, ctx) => {
      const u = requireUser(ctx);
      return query("SELECT * FROM notifications WHERE user_id IS NULL OR user_id=? ORDER BY created_at DESC LIMIT 100", [u.id]);
    },
    reports: async (_, __, ctx) => {
      requireAdmin(ctx);
      const [s] = await query("SELECT COUNT(*) AS n FROM users WHERE role='STUDENT'");
      const [c] = await query("SELECT COUNT(*) AS n, SUM(status='PENDING') AS pending FROM complaints");
      const [r] = await query("SELECT COUNT(*) AS n, SUM(status='AVAILABLE') AS available FROM rooms");
      const [p] = await query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status='PENDING'");
      return { students:s.n, complaints:c.n, pendingComplaints:c.pending || 0, rooms:r.n, availableRooms:r.available || 0, pendingPayments:Number(p.total) };
    }
  },
  Mutation: {
    register: async (_, args) => {
      const name = args.name.trim();
      const email = args.email.trim().toLowerCase();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid name and email.");
      if (args.password.length < 8) throw new Error("Password must contain at least 8 characters.");
      const hash = await bcrypt.hash(args.password, 12);
      try {
        const result = await query("INSERT INTO users(name,email,password_hash,phone) VALUES(?,?,?,?)", [name,email,hash,args.phone || null]);
        const rows = await query("SELECT id,name,email,role,phone FROM users WHERE id=?", [result.insertId]);
        return authPayload(rows[0]);
      } catch (e) {
        if (e.code === "ER_DUP_ENTRY") throw new Error("An account with this email already exists.");
        throw e;
      }
    },
    login: async (_, { email, password }) => {
      const rows = await query("SELECT * FROM users WHERE email=?", [email.trim().toLowerCase()]);
      if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) throw new Error("Invalid email or password.");
      return authPayload(rows[0]);
    },
    createComplaint: async (_, a, ctx) => {
      const u = requireUser(ctx);
      if (!a.title.trim() || !a.description.trim()) throw new Error("Title and description are required.");
      const r = await query("INSERT INTO complaints(user_id,category,title,description) VALUES(?,?,?,?)", [u.id,a.category,a.title.trim(),a.description.trim()]);
      const rows = await query("SELECT c.*,u.name AS student_name FROM complaints c JOIN users u ON u.id=c.user_id WHERE c.id=?", [r.insertId]);
      return rows[0];
    },
    updateComplaintStatus: async (_, { id, status }, ctx) => {
      requireAdmin(ctx);
      const allowed = ["PENDING","IN_PROGRESS","RESOLVED","REJECTED"];
      if (!allowed.includes(status)) throw new Error("Invalid complaint status.");
      await query("UPDATE complaints SET status=? WHERE id=?", [status,id]);
      const rows = await query("SELECT c.*,u.name AS student_name FROM complaints c JOIN users u ON u.id=c.user_id WHERE c.id=?", [id]);
      if (!rows[0]) throw new Error("Complaint not found.");
      return rows[0];
    },
    requestRoom: async (_, { roomId }, ctx) => {
      const u = requireUser(ctx);
      const rooms = await query("SELECT * FROM rooms WHERE id=? FOR UPDATE", [roomId]);
      if (!rooms[0]) throw new Error("Room not found.");
      if (rooms[0].status !== "AVAILABLE" || rooms[0].occupied >= rooms[0].capacity) throw new Error("This room is not available.");
      // Demo allocation: increment occupancy. Production should use a transaction and a separate allocation table.
      await query("UPDATE rooms SET occupied=occupied+1, status=IF(occupied>=capacity,'FULL','AVAILABLE') WHERE id=?", [roomId]);
      const updated = await query("SELECT * FROM rooms WHERE id=?", [roomId]);
      await query("INSERT INTO notifications(user_id,title,message) VALUES(?,?,?)", [u.id,"Room request submitted",`Your request for room ${updated[0].room_number} has been recorded.`]);
      return updated[0];
    },
    createMenuItem: async (_, a, ctx) => {
      requireAdmin(ctx);
      const r = await query("INSERT INTO menu_items(day_name,meal_type,items) VALUES(?,?,?)", [a.day_name,a.meal_type,a.items]);
      const rows = await query("SELECT * FROM menu_items WHERE id=?", [r.insertId]);
      return rows[0];
    },
    createPayment: async (_, a, ctx) => {
      requireAdmin(ctx);
      if (a.amount <= 0) throw new Error("Payment amount must be greater than zero.");
      const r = await query("INSERT INTO payments(user_id,description,amount) VALUES(?,?,?)", [a.userId,a.description,a.amount]);
      const rows = await query("SELECT p.*,u.name AS student_name FROM payments p JOIN users u ON u.id=p.user_id WHERE p.id=?", [r.insertId]);
      return rows[0];
    },
    markNotificationRead: async (_, { id }, ctx) => {
      const u = requireUser(ctx);
      await query("UPDATE notifications SET is_read=TRUE WHERE id=? AND (user_id=? OR user_id IS NULL)", [id,u.id]);
      const rows = await query("SELECT * FROM notifications WHERE id=?", [id]);
      if (!rows[0]) throw new Error("Notification not found.");
      return rows[0];
    },
    createAnnouncement: async (_, a, ctx) => {
      requireAdmin(ctx);
      await query("INSERT INTO notifications(user_id,title,message) VALUES(NULL,?,?)", [a.title,a.message]);
      return true;
    }
  }
};

module.exports = resolvers;
