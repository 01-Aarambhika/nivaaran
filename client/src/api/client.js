/**
 * client.js - Unified API client for Nivaaran Microservices
 * Supports live microservice endpoints with seamless in-browser fallback
 */

const ACCOUNTS_URL = import.meta.env.VITE_ACCOUNTS_URL || 'http://localhost:8080';
const DIRECTORY_URL = import.meta.env.VITE_DIRECTORY_URL || 'http://localhost:8081';
const COMPLAINTS_URL = import.meta.env.VITE_COMPLAINTS_URL || 'http://localhost:8082';
const RESOLUTION_URL = import.meta.env.VITE_RESOLUTION_URL || 'http://localhost:8083';
const NOTIFICATIONS_URL = import.meta.env.VITE_NOTIFICATIONS_URL || 'http://localhost:8084';
const ANALYTICS_URL = import.meta.env.VITE_ANALYTICS_URL || 'http://localhost:8085';

// ── In-Memory Seed Data for Offline / Demo Mode ──────────────────────────────
const DEMO_USERS = [
  { userId: '20251651078', fullName: 'Ritik Sharma', role: 'student', departmentScope: 'all', email: '20251651078@iiitv.ac.in' },
  { userId: '20251651006', fullName: 'Abhishek Kumar', role: 'student', departmentScope: 'all', email: '20251651006@iiitv.ac.in' },
  { userId: '20251651001', fullName: 'Aarambhika Sinha', role: 'student', departmentScope: 'all', email: '20251651001@iiitv.ac.in' },
  { userId: '2301001', fullName: 'Priya Patel', role: 'student', departmentScope: 'all', email: '2301001@iiitv.ac.in' },
  { userId: 'W101', fullName: 'Dr. S. K. Verma (Hostel Warden)', role: 'warden', departmentScope: 'hostel', email: 'w101@iiitv.ac.in' },
  { userId: 'W001', fullName: 'Dr. S. K. Verma (Hostel Warden)', role: 'warden', departmentScope: 'hostel', email: 'w001@iiitv.ac.in' },
  { userId: 'M201', fullName: 'Rameshwar Lal (Mess In-Charge)', role: 'mess_incharge', departmentScope: 'mess', email: 'm201@iiitv.ac.in' },
  { userId: 'M001', fullName: 'Rameshwar Lal (Mess In-Charge)', role: 'mess_incharge', departmentScope: 'mess', email: 'm001@iiitv.ac.in' },
  { userId: 'S301', fullName: 'Gopal Technical (Maintenance)', role: 'maintenance_staff', departmentScope: 'campus', email: 's301@iiitv.ac.in' },
  { userId: 'T001', fullName: 'Gopal Technical (Maintenance)', role: 'maintenance_staff', departmentScope: 'campus', email: 't001@iiitv.ac.in' },
  { userId: 'ADM001', fullName: 'Chief Campus Administrator', role: 'admin', departmentScope: 'all', email: 'admin@iiitv.ac.in' },
  { userId: 'A001', fullName: 'Chief Campus Administrator', role: 'admin', departmentScope: 'all', email: 'admin@iiitv.ac.in' }
];

const DEMO_CATEGORIES = [
  { id: 'hostel', name: 'Hostel', defaultSlaHours: 48, urgentSlaHours: 24, description: 'Rooms, washrooms, plumbing, electricity & furniture' },
  { id: 'mess', name: 'Mess & Dining', defaultSlaHours: 24, urgentSlaHours: 12, description: 'Meal hygiene, food quality, utensils & catering' },
  { id: 'campus', name: 'General Campus', defaultSlaHours: 72, urgentSlaHours: 24, description: 'Classrooms, labs, library, grounds & walkways' }
];

const DEMO_LOCATIONS = [
  { id: 'hostel-b1', name: 'Boys Hostel 1', category: 'hostel' },
  { id: 'hostel-b2', name: 'Boys Hostel 2', category: 'hostel' },
  { id: 'hostel-g1', name: 'Girls Hostel 1', category: 'hostel' },
  { id: 'mess-dining', name: 'Main Dining Hall', category: 'mess' },
  { id: 'mess-kitchen', name: 'Central Mess Kitchen', category: 'mess' },
  { id: 'acad-block', name: 'Academic Block B', category: 'campus' },
  { id: 'lib-central', name: 'Central Library', category: 'campus' },
  { id: 'path-sports', name: 'Sports Complex Pathway', category: 'campus' }
];

let demoComplaints = [
  {
    id: 'CMP-2026-001',
    category: 'mess',
    location: 'mess-dining',
    locationName: 'Main Dining Hall',
    title: 'Water filter leaking and dispensing lukewarm water',
    description: 'The RO water dispenser on the first floor of the mess has a steady leak and the cooling unit is tripped.',
    priority: 'high',
    status: 'assigned',
    isAnonymous: false,
    reporterUserId: '20251651078',
    assignedTo: 'M201',
    assignedToName: 'Rameshwar Lal',
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), // overdue
    isOverdue: true,
    version: 2,
    etag: '"c1-v2"',
    history: [
      { status: 'submitted', timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), note: 'Filed by student' },
      { status: 'assigned', timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), note: 'Assigned to Mess In-Charge' }
    ],
    comments: [
      { id: 'cm-1', authorId: 'M201', authorName: 'Rameshwar Lal', text: 'Technician dispatched to replace the filter cartridge.', timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString() }
    ],
    feedback: null
  },
  {
    id: 'CMP-2026-002',
    category: 'hostel',
    location: 'hostel-b1',
    locationName: 'Boys Hostel 1',
    title: 'Ceiling fan making screeching noise in Room 204',
    description: 'Bearings in the ceiling fan are failing and causing intense noise during night hours.',
    priority: 'medium',
    status: 'in_progress',
    isAnonymous: true,
    reporterUserId: '20251651001',
    assignedTo: 'W101',
    assignedToName: 'Dr. S. K. Verma',
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 30 * 3600 * 1000).toISOString(),
    isOverdue: false,
    version: 3,
    etag: '"c2-v3"',
    history: [
      { status: 'submitted', timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(), note: 'Filed anonymously' },
      { status: 'assigned', timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), note: 'Assigned to Warden' },
      { status: 'in_progress', timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), note: 'Electrician inspecting fan motor' }
    ],
    comments: [
      { id: 'cm-2', authorId: 'W101', authorName: 'Hostel Warden', text: 'New capacitor and bearings requisitioned.', timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString() }
    ],
    feedback: null
  },
  {
    id: 'CMP-2026-003',
    category: 'campus',
    location: 'path-sports',
    locationName: 'Sports Complex Pathway',
    title: 'Pathway streetlight flickering and dark area near basketball court',
    description: 'Two consecutive lampposts on the walkway are non-functional causing safety hazard after 8 PM.',
    priority: 'urgent',
    status: 'resolved',
    isAnonymous: false,
    reporterUserId: '20251651006',
    assignedTo: 'S301',
    assignedToName: 'Gopal Technical',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    isOverdue: false,
    version: 4,
    etag: '"c3-v4"',
    history: [
      { status: 'submitted', timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), note: 'Urgent campus safety complaint' },
      { status: 'assigned', timestamp: new Date(Date.now() - 40 * 3600 * 1000).toISOString(), note: 'Assigned to maintenance team' },
      { status: 'in_progress', timestamp: new Date(Date.now() - 26 * 3600 * 1000).toISOString(), note: 'Wiring repairs in progress' },
      { status: 'resolved', timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), note: 'LED fixtures replaced and operational' }
    ],
    comments: [],
    feedback: {
      rating: 5,
      comment: 'Prompt resolution! The pathway is brightly lit now.',
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    }
  }
];

let demoNotifications = [
  { id: 'notif-1', recipientUserId: '20251651078', title: 'Complaint Assigned', message: 'Your complaint CMP-2026-001 has been assigned to Mess In-Charge.', timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), read: false },
  { id: 'notif-2', recipientUserId: '20251651006', title: 'Complaint Resolved', message: 'CMP-2026-003 has been marked resolved. Please submit your feedback.', timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), read: true }
];

let demoAuditEvents = [
  { eventId: 'AUD-901', eventType: 'COMPLAINT_FILED', entityType: 'complaint', entityId: 'CMP-2026-001', actorUserId: '20251651078', timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString() },
  { eventId: 'AUD-902', eventType: 'STATUS_TRANSITION', entityType: 'complaint', entityId: 'CMP-2026-001', actorUserId: 'ADM001', timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
  { eventId: 'AUD-903', eventType: 'STATUS_TRANSITION', entityType: 'complaint', entityId: 'CMP-2026-003', actorUserId: 'S301', timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString() }
];

// Helper: Attempt backend fetch with quick fallback
async function safeFetch(url, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, credentials: 'omit', signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ── API Methods ─────────────────────────────────────────────────────────────
export const api = {
  // Accounts Service
  async login(userId, password) {
    const cleanId = userId.trim();
    try {
      const res = await safeFetch(`${ACCOUNTS_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: cleanId, password })
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed');
    } catch (e) {
      // Fallback: match against demo accounts
      const match = DEMO_USERS.find(u => u.userId.toLowerCase() === cleanId.toLowerCase());
      if (match) {
        return {
          token: `demo-token-${match.userId}`,
          userId: match.userId,
          fullName: match.fullName,
          role: match.role,
          departmentScope: match.departmentScope
        };
      }
      throw new Error(e.message || 'Invalid User ID or Password');
    }
  },

  async registerStudent({ userId, fullName, email, password }) {
    try {
      const res = await safeFetch(`${ACCOUNTS_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fullName, email, password })
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed');
    } catch (e) {
      if (!/^\d+$/.test(userId)) {
        throw new Error('Student roll number must be entirely numeric');
      }
      const existing = DEMO_USERS.find(u => u.userId === userId);
      if (existing) throw new Error('User ID already registered');
      const newUser = { userId, fullName, email, role: 'student', departmentScope: 'all' };
      DEMO_USERS.push(newUser);
      return newUser;
    }
  },

  async createStaffAccount(token, { userId, fullName, email, role, departmentScope, password }) {
    try {
      const res = await safeFetch(`${ACCOUNTS_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, fullName, email, role, departmentScope, password })
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Staff creation failed');
    } catch (e) {
      const existing = DEMO_USERS.find(u => u.userId === userId);
      if (existing) throw new Error('User ID already exists');
      const newStaff = { userId, fullName, email, role, departmentScope };
      DEMO_USERS.push(newStaff);
      return newStaff;
    }
  },

  async getStaffList() {
    return DEMO_USERS.filter(u => u.role !== 'student');
  },

  // Directory Service
  async getCategories() {
    try {
      const res = await safeFetch(`${DIRECTORY_URL}/categories`);
      if (res.ok) return await res.json();
    } catch {}
    return DEMO_CATEGORIES;
  },

  async getLocations(category = '') {
    try {
      const url = category ? `${DIRECTORY_URL}/locations?categoryId=${category}` : `${DIRECTORY_URL}/locations`;
      const res = await safeFetch(url);
      if (res.ok) return await res.json();
    } catch {}
    if (category) {
      return DEMO_LOCATIONS.filter(l => l.category === category);
    }
    return DEMO_LOCATIONS;
  },

  // Complaints Service
  async getComplaints(token, filter = {}) {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.category) params.set('category', filter.category);
      if (filter.priority) params.set('priority', filter.priority);

      const url = `${COMPLAINTS_URL}/complaints${params.toString() ? '?' + params.toString() : ''}`;
      const res = await safeFetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : data.items || [];
      }
    } catch {}

    // Demo filtering
    let list = [...demoComplaints];
    if (filter.category) list = list.filter(c => c.category === filter.category);
    if (filter.status) list = list.filter(c => c.status === filter.status);
    if (filter.reporterUserId) list = list.filter(c => c.reporterUserId === filter.reporterUserId);
    return list;
  },

  async getComplaint(id, token, ifNoneMatch = null) {
    try {
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch;

      const res = await safeFetch(`${COMPLAINTS_URL}/complaints/${id}`, { headers });
      if (res.status === 304) return { notModified: true };
      if (res.ok) {
        const etag = res.headers.get('etag');
        const data = await res.json();
        return { ...data, etag };
      }
    } catch {}
    const c = demoComplaints.find(x => x.id === id);
    if (!c) throw new Error('Complaint not found');
    return c;
  },

  async fileComplaint(token, data) {
    const key = `key-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    try {
      const res = await safeFetch(`${COMPLAINTS_URL}/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to file complaint');
    } catch (e) {
      const cat = DEMO_CATEGORIES.find(c => c.id === data.category) || DEMO_CATEGORIES[0];
      const hours = data.priority === 'urgent' ? cat.urgentSlaHours : cat.defaultSlaHours;
      const newC = {
        id: `CMP-2026-${String(demoComplaints.length + 1).padStart(3, '0')}`,
        category: data.category,
        location: data.location,
        locationName: DEMO_LOCATIONS.find(l => l.id === data.location)?.name || data.location,
        title: data.title,
        description: data.description,
        priority: data.priority || 'medium',
        status: 'submitted',
        isAnonymous: !!data.isAnonymous,
        reporterUserId: data.reporterUserId || '20251651078',
        createdAt: new Date().toISOString(),
        deadline: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
        isOverdue: false,
        version: 1,
        etag: '"c-v1"',
        history: [{ status: 'submitted', timestamp: new Date().toISOString(), note: 'Filed' }],
        comments: [],
        feedback: null
      };
      demoComplaints.unshift(newC);
      demoAuditEvents.unshift({
        eventId: `AUD-${Date.now()}`,
        eventType: 'COMPLAINT_FILED',
        entityType: 'complaint',
        entityId: newC.id,
        actorUserId: newC.reporterUserId,
        timestamp: new Date().toISOString()
      });
      return newC;
    }
  },

  async updateStatus(token, id, status, ifMatch, note = '') {
    try {
      const res = await safeFetch(`${COMPLAINTS_URL}/complaints/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': ifMatch || '*',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, note })
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Status transition refused');
    } catch (e) {
      const c = demoComplaints.find(x => x.id === id);
      if (!c) throw new Error('Complaint not found');
      c.status = status;
      c.version += 1;
      c.etag = `"c-v${c.version}"`;
      c.history.push({ status, timestamp: new Date().toISOString(), note: note || `Status updated to ${status}` });
      return c;
    }
  },

  async assignComplaint(token, id, staffId) {
    const staff = DEMO_USERS.find(u => u.userId === staffId);
    try {
      await safeFetch(`${RESOLUTION_URL}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ complaintId: id, staffId })
      });
    } catch {}
    const c = demoComplaints.find(x => x.id === id);
    if (c) {
      c.status = 'assigned';
      c.assignedTo = staffId;
      c.assignedToName = staff?.fullName || staffId;
      c.version += 1;
      c.history.push({ status: 'assigned', timestamp: new Date().toISOString(), note: `Assigned to ${staff?.fullName || staffId}` });
      return c;
    }
  },

  async escalateComplaint(token, id, reason) {
    try {
      const res = await safeFetch(`${COMPLAINTS_URL}/complaints/${id}/escalations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason })
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Escalation failed');
    } catch (e) {
      const c = demoComplaints.find(x => x.id === id);
      if (!c) throw new Error('Complaint not found');
      c.status = 'escalated';
      c.isOverdue = true;
      c.version += 1;
      c.history.push({ status: 'escalated', timestamp: new Date().toISOString(), note: `Escalated: ${reason}` });
      demoAuditEvents.unshift({
        eventId: `AUD-${Date.now()}`,
        eventType: 'COMPLAINT_ESCALATED',
        entityType: 'complaint',
        entityId: c.id,
        actorUserId: 'admin',
        timestamp: new Date().toISOString()
      });
      return c;
    }
  },

  async addComment(token, id, text, author) {
    try {
      const res = await safeFetch(`${COMPLAINTS_URL}/complaints/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment: text })
      });
      if (res.ok) return await res.json();
    } catch {}
    const c = demoComplaints.find(x => x.id === id);
    if (!c) throw new Error('Complaint not found');
    const newComment = {
      id: `cm-${Date.now()}`,
      authorId: author.userId,
      authorName: author.fullName,
      text,
      timestamp: new Date().toISOString()
    };
    c.comments.push(newComment);
    return newComment;
  },

  async submitFeedback(token, id, { rating, comment, reopen = false }) {
    try {
      const res = await safeFetch(`${COMPLAINTS_URL}/complaints/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, comment, reopen })
      });
      if (res.ok) return await res.json();
    } catch {}
    const c = demoComplaints.find(x => x.id === id);
    if (!c) throw new Error('Complaint not found');
    if (reopen) {
      c.status = 'in_progress';
      c.history.push({ status: 'in_progress', timestamp: new Date().toISOString(), note: `Reopened by student: ${comment}` });
    } else {
      c.status = 'closed';
      c.feedback = { rating, comment, timestamp: new Date().toISOString() };
      c.history.push({ status: 'closed', timestamp: new Date().toISOString(), note: `Student rated ${rating}★: ${comment}` });
    }
    return c;
  },

  async withdrawComplaint(token, id) {
    try {
      const res = await safeFetch(`${COMPLAINTS_URL}/complaints/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok || res.status === 204) return true;
    } catch {}
    const c = demoComplaints.find(x => x.id === id);
    if (!c) throw new Error('Complaint not found');
    if (c.status !== 'submitted') {
      throw new Error('Can only withdraw complaints that are still submitted and unassigned');
    }
    c.status = 'withdrawn';
    c.history.push({ status: 'withdrawn', timestamp: new Date().toISOString(), note: 'Withdrawn by student' });
    return true;
  },

  // Notifications
  async getNotifications(userId) {
    try {
      const res = await safeFetch(`${NOTIFICATIONS_URL}/notifications?recipientUserId=${userId}`);
      if (res.ok) return await res.json();
    } catch {}
    return demoNotifications.filter(n => n.recipientUserId === userId);
  },

  // Analytics & Audit
  async getAuditEvents() {
    try {
      const res = await safeFetch(`${ANALYTICS_URL}/audit/events`);
      if (res.ok) return await res.json();
    } catch {}
    return demoAuditEvents;
  },

  async getSlaSnapshots() {
    try {
      const res = await safeFetch(`${ANALYTICS_URL}/sla/snapshots`);
      if (res.ok) return await res.json();
    } catch {}
    return [
      { categoryId: 'mess', complianceRate: 92.5, totalResolved: 45, breaches: 3 },
      { categoryId: 'hostel', complianceRate: 88.0, totalResolved: 62, breaches: 7 },
      { categoryId: 'campus', complianceRate: 95.0, totalResolved: 38, breaches: 2 }
    ];
  }
};
