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

// ── Helper to normalize complaint objects across microservice and UI ─────────
function normalizeComplaint(c) {
  if (!c) return c;
  const category = c.category || c.categoryId || 'hostel';
  const location = c.location || c.locationId || '';
  const reporterUserId = c.reporterUserId || c.reporterId || '';
  const deadline = c.deadline || c.slaDeadline || new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  const locationObj = DEMO_LOCATIONS.find(l => l.id === location);
  const locationName = c.locationName || locationObj?.name || location;
  const priority = (c.priority === 'urgent') ? 'urgent' : (c.priority === 'normal' ? 'medium' : (c.priority || 'medium'));
  const id = c.trackingNumber || c.id;
  const backendId = c.id || c.trackingNumber;

  let assignedTo = c.assignedTo || c.assignedStaffId || null;
  if (assignedTo === 'M001') assignedTo = 'M201';
  if (assignedTo === 'W001') assignedTo = 'W101';
  if (assignedTo === 'T001') assignedTo = 'S301';

  const staffUser = assignedTo ? DEMO_USERS.find(u => u.userId === assignedTo) : null;
  const assignedToName = c.assignedToName || staffUser?.fullName || assignedTo;

  let status = c.status || c.currentStatus || 'submitted';
  if (assignedTo && status === 'submitted') {
    status = 'assigned';
  }

  return {
    ...c,
    id,
    complaintId: backendId,
    trackingNumber: id,
    category,
    location,
    locationName,
    reporterUserId,
    reporterId: reporterUserId,
    deadline,
    priority,
    status,
    assignedTo,
    assignedToName
  };
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
    const list = DEMO_USERS.filter(u => u.role !== 'student');
    const seen = new Set();
    const unique = [];
    for (const u of list) {
      const canonicalId = (u.userId === 'M001' ? 'M201' : (u.userId === 'W001' ? 'W101' : (u.userId === 'T001' ? 'S301' : (u.userId === 'A001' ? 'ADM001' : u.userId))));
      if (!seen.has(canonicalId)) {
        seen.add(canonicalId);
        unique.push({ ...u, userId: canonicalId });
      }
    }
    return unique;
  },

  // Directory Service
  async getCategories() {
    try {
      const res = await safeFetch(`${DIRECTORY_URL}/categories`);
      if (res.ok) {
        const data = await res.json();
        return (data || []).map(c => ({
          ...c,
          id: c.categoryId || c.id,
          categoryId: c.categoryId || c.id,
          name: c.displayName || c.name || c.categoryId
        }));
      }
    } catch {}
    return DEMO_CATEGORIES;
  },

  async getLocations(category = '') {
    try {
      const url = category ? `${DIRECTORY_URL}/locations?categoryId=${category}` : `${DIRECTORY_URL}/locations`;
      const res = await safeFetch(url);
      if (res.ok) {
        const data = await res.json();
        return (data || []).map(l => ({
          ...l,
          id: l.locationId || l.id,
          locationId: l.locationId || l.id,
          name: l.zoneName || l.name || l.locationId,
          category: l.categoryId || l.category
        }));
      }
    } catch {}
    if (category) {
      return DEMO_LOCATIONS.filter(l => l.category === category);
    }
    return DEMO_LOCATIONS;
  },

  // Complaints Service
  async getComplaints(token, filter = {}) {
    let list = [];
    try {
      const params = new URLSearchParams();
      if (filter.status && filter.status !== 'all') params.set('status', filter.status);
      if (filter.category && filter.category !== 'all') params.set('category', filter.category);
      if (filter.priority && filter.priority !== 'all') params.set('priority', filter.priority);

      const url = `${COMPLAINTS_URL}/complaints${params.toString() ? '?' + params.toString() : ''}`;
      const res = await safeFetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        list = items.map(normalizeComplaint);
      }
    } catch {}

    // Ensure any demo or locally added complaints are also included
    if (list.length === 0) {
      list = demoComplaints.map(normalizeComplaint);
    } else {
      for (const d of demoComplaints) {
        const norm = normalizeComplaint(d);
        if (!list.some(x => x.id === norm.id || x.complaintId === norm.complaintId || x.trackingNumber === norm.trackingNumber)) {
          list.push(norm);
        }
      }
    }

    // Join assignments from Resolution service
    try {
      const asgnRes = await safeFetch(`${RESOLUTION_URL}/assignments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (asgnRes.ok) {
        const asgns = await asgnRes.json();
        if (Array.isArray(asgns)) {
          for (const a of asgns) {
            const comp = list.find(x => 
              x.id === a.complaintId || 
              x.complaintId === a.complaintId || 
              x.trackingNumber === a.complaintId ||
              (x.id && a.complaintId && x.id.replace(/\D/g, '') === a.complaintId.replace(/\D/g, '') && x.id.replace(/\D/g, '').length > 0)
            );
            if (comp) {
              let staffId = a.assignedStaffId;
              if (staffId === 'M001') staffId = 'M201';
              if (staffId === 'W001') staffId = 'W101';
              if (staffId === 'T001') staffId = 'S301';
              const staffUser = DEMO_USERS.find(u => u.userId === staffId);
              comp.assignedTo = staffId;
              comp.assignedToName = staffUser?.fullName || staffId;
              if (comp.status === 'submitted') comp.status = 'assigned';
            }
          }
        }
      }
    } catch {}

    if (filter.category && filter.category !== 'all') {
      list = list.filter(c => c.category === filter.category);
    }
    if (filter.status && filter.status !== 'all') {
      list = list.filter(c => c.status === filter.status);
    }
    if (filter.reporterUserId) {
      list = list.filter(c => c.reporterUserId === filter.reporterUserId || c.reporterId === filter.reporterUserId);
    }
    return list;
  },

  async getComplaint(id, token, ifNoneMatch = null) {
    let result = null;
    try {
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch;

      const res = await safeFetch(`${COMPLAINTS_URL}/complaints/${id}`, { headers });
      if (res.status === 304) return { notModified: true };
      if (res.ok) {
        const etag = res.headers.get('etag');
        const data = await res.json();
        result = normalizeComplaint({ ...data, etag });
      }
    } catch {}
    if (!result) {
      const c = demoComplaints.find(x => x.id === id || x.trackingNumber === id || x.complaintId === id);
      if (c) result = normalizeComplaint(c);
    }
    if (!result) throw new Error('Complaint not found');

    // Attach assignment if available
    try {
      const asgnRes = await safeFetch(`${RESOLUTION_URL}/assignments?complaintId=${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (asgnRes.ok) {
        const asgns = await asgnRes.json();
        const a = Array.isArray(asgns) && asgns.length > 0 ? asgns[0] : null;
        if (a) {
          let staffId = a.assignedStaffId;
          if (staffId === 'M001') staffId = 'M201';
          if (staffId === 'W001') staffId = 'W101';
          if (staffId === 'T001') staffId = 'S301';
          const staffUser = DEMO_USERS.find(u => u.userId === staffId);
          result.assignedTo = staffId;
          result.assignedToName = staffUser?.fullName || staffId;
          if (result.status === 'submitted') result.status = 'assigned';
        }
      }
    } catch {}

    return result;
  },

  async fileComplaint(token, data) {
    const key = `key-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const cat = DEMO_CATEGORIES.find(c => c.id === data.category) || DEMO_CATEGORIES[0];
    const hours = data.priority === 'urgent' ? cat.urgentSlaHours : cat.defaultSlaHours;

    // Strict payload for Backend microservice
    const payload = {
      userId: data.reporterUserId || data.userId || '20251651078',
      categoryId: data.category || data.categoryId || 'hostel',
      locationId: data.location || data.locationId || 'hostel-b1',
      title: data.title,
      description: data.description,
      priority: data.priority === 'urgent' ? 'urgent' : 'normal',
      isAnonymous: Boolean(data.isAnonymous)
    };

    let created = null;
    try {
      const res = await safeFetch(`${COMPLAINTS_URL}/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const raw = await res.json();
        created = normalizeComplaint(raw);
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn('Backend rejected complaint, falling back:', err);
      }
    } catch (e) {
      console.warn('Backend complaints call failed, using fallback:', e.message);
    }

    if (!created) {
      created = normalizeComplaint({
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
      });
    }

    demoComplaints.unshift(created);
    demoAuditEvents.unshift({
      eventId: `AUD-${Date.now()}`,
      eventType: 'COMPLAINT_FILED',
      entityType: 'complaint',
      entityId: created.id,
      actorUserId: created.reporterUserId,
      timestamp: new Date().toISOString()
    });

    // Notify Admin of new grievance
    this.createNotification({
      recipientUserId: 'ADM001',
      title: `📝 New Grievance Filed (${created.trackingNumber || created.id})`,
      body: `Student filed: "${created.title}" [${created.category}]. Requires review and staff assignment.`,
      eventType: 'COMPLAINT_FILED',
      relatedComplaintId: created.id
    }).catch(() => {});

    return created;
  },

  async updateStatus(token, id, status, ifMatch, note = '') {
    let updatedObj = null;
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
      if (res.ok) {
        const raw = await res.json();
        updatedObj = normalizeComplaint(raw);
        const idx = demoComplaints.findIndex(x => x.id === id || x.trackingNumber === id || x.complaintId === id);
        if (idx !== -1) demoComplaints[idx] = { ...demoComplaints[idx], ...updatedObj };
      }
    } catch (e) {}

    if (!updatedObj) {
      const c = demoComplaints.find(x => x.id === id || x.trackingNumber === id || x.complaintId === id);
      if (!c) throw new Error('Complaint not found');
      c.status = status;
      c.version = (c.version || 1) + 1;
      c.etag = `"c-v${c.version}"`;
      if (!c.history) c.history = [];
      c.history.push({ status, timestamp: new Date().toISOString(), note: note || `Status updated to ${status}` });
      updatedObj = normalizeComplaint(c);
    }

    // Trigger Notifications on Resolution
    if (status === 'resolved') {
      const c = updatedObj;
      // Notify Admin
      this.createNotification({
        recipientUserId: 'ADM001',
        title: `✅ Grievance Resolved: ${c.trackingNumber || c.id}`,
        body: `Staff marked "${c.title}" as RESOLVED. Awaiting student verification.`,
        eventType: 'COMPLAINT_RESOLVED',
        relatedComplaintId: c.id
      }).catch(() => {});

      // Notify Student
      if (c.reporterUserId) {
        this.createNotification({
          recipientUserId: c.reporterUserId,
          title: `🎉 Grievance Resolved: ${c.trackingNumber || c.id}`,
          body: `Your issue "${c.title}" was resolved! Click to verify and submit feedback for Admin.`,
          eventType: 'COMPLAINT_RESOLVED',
          relatedComplaintId: c.id
        }).catch(() => {});
      }
    }

    return updatedObj;
  },

  async assignComplaint(token, id, staffId) {
    let canonicalStaffId = staffId;
    if (staffId === 'M001') canonicalStaffId = 'M201';
    if (staffId === 'W001') canonicalStaffId = 'W101';
    if (staffId === 'T001') canonicalStaffId = 'S301';

    const staff = DEMO_USERS.find(u => u.userId === canonicalStaffId || u.userId === staffId);
    const staffName = staff?.fullName || canonicalStaffId;

    // 1. Dispatch assignment to Resolution service
    try {
      await safeFetch(`${RESOLUTION_URL}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          complaintId: id,
          assignedStaffId: canonicalStaffId,
          staffId: canonicalStaffId,
          assignedByUserId: 'ADM001',
          departmentScope: staff?.departmentScope || 'all'
        })
      });
    } catch {}

    // 2. Patch complaints microservice with assigned status & staff
    try {
      await this.updateStatus(token, id, 'assigned', '*', `Assigned to ${staffName}`);
    } catch {}

    // 3. Update local cache / demoComplaints
    let c = demoComplaints.find(x => x.id === id || x.trackingNumber === id || x.complaintId === id);
    if (!c) {
      try {
        c = await this.getComplaint(id, token);
        demoComplaints.unshift(c);
      } catch {}
    }
    if (c) {
      c.status = 'assigned';
      c.assignedTo = canonicalStaffId;
      c.assignedToName = staffName;
      c.version = (c.version || 1) + 1;
      if (!c.history) c.history = [];
      c.history.push({ status: 'assigned', timestamp: new Date().toISOString(), note: `Assigned to ${staffName}` });
    }

    const compId = c?.id || id;
    const compTracking = c?.trackingNumber || id;
    const compTitle = c?.title || 'Campus Grievance';

    // 4. Send Notifications to both staff & student!
    await this.createNotification({
      recipientUserId: canonicalStaffId,
      title: `🚨 Grievance Assigned: ${compTracking}`,
      body: `Admin assigned grievance "${compTitle}" to you for inspection and resolution.`,
      eventType: 'COMPLAINT_ASSIGNED',
      relatedComplaintId: compId
    }).catch(() => {});

    if (c?.reporterUserId) {
      await this.createNotification({
        recipientUserId: c.reporterUserId,
        title: `Docket Assigned: ${compTracking}`,
        body: `Your grievance "${compTitle}" has been assigned to ${staffName}.`,
        eventType: 'COMPLAINT_ASSIGNED',
        relatedComplaintId: compId
      }).catch(() => {});
    }

    return c ? normalizeComplaint(c) : null;
  },

  async escalateComplaint(token, id, reason) {
    try {
      const res = await safeFetch(`${COMPLAINTS_URL}/complaints/${id}/escalations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason, initiatorId: 'ADM001' })
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
        body: JSON.stringify({
          message: text,
          comment: text,
          authorId: author?.userId || '20251651078',
          authorRole: author?.role || 'student'
        })
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
    let result = null;
    try {
      const res = await safeFetch(`${COMPLAINTS_URL}/complaints/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, comment, reopen })
      });
      if (res.ok) {
        const raw = await res.json();
        result = normalizeComplaint(raw);
      }
    } catch {}

    const c = demoComplaints.find(x => x.id === id || x.trackingNumber === id || x.complaintId === id);
    if (c) {
      if (reopen) {
        c.status = 'in_progress';
        if (!c.history) c.history = [];
        c.history.push({ status: 'in_progress', timestamp: new Date().toISOString(), note: `Reopened by student: ${comment}` });
      } else {
        c.status = 'closed';
        c.feedback = { rating, comment, timestamp: new Date().toISOString() };
        if (!c.history) c.history = [];
        c.history.push({ status: 'closed', timestamp: new Date().toISOString(), note: `Student rated ${rating}★: ${comment}` });
      }
      result = normalizeComplaint(c);
    }

    if (!result) throw new Error('Complaint not found');

    // Notify Admin of student review
    const cObj = result;
    this.createNotification({
      recipientUserId: 'ADM001',
      title: reopen ? `⚠️ Grievance Reopened: ${cObj.trackingNumber || id}` : `⭐ Student Review: ${cObj.trackingNumber || id}`,
      body: reopen
        ? `Student reported issue not fixed: "${comment}". Docket reopened.`
        : `Student rated ${rating}★: "${comment}" (Confidential to Admin). Docket is now closed.`,
      eventType: reopen ? 'COMPLAINT_REOPENED' : 'FEEDBACK_SUBMITTED',
      relatedComplaintId: cObj.id
    }).catch(() => {});

    return result;
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

  // Notifications Dispatcher & Query
  async createNotification({ recipientUserId, recipientContact, channel = 'in_app', eventType, relatedComplaintId, title, message, body }) {
    const textBody = body || message;
    const notifObj = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      recipientUserId,
      recipientContact: recipientContact || `${recipientUserId}@iiitv.ac.in`,
      channel: channel || 'in_app',
      eventType: eventType || 'INFO',
      relatedComplaintId: relatedComplaintId || null,
      title,
      message: textBody,
      body: textBody,
      timestamp: new Date().toISOString(),
      read: false
    };

    demoNotifications.unshift(notifObj);

    try {
      await safeFetch(`${NOTIFICATIONS_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId,
          recipientContact: recipientContact || `${recipientUserId}@iiitv.ac.in`,
          channel: 'in_app',
          eventType: eventType || 'INFO',
          relatedComplaintId: relatedComplaintId || undefined,
          title,
          body: textBody
        })
      });
    } catch {}

    return notifObj;
  },

  async getNotifications(userId, token = null) {
    const canonicalId = (userId === 'M001' ? 'M201' : (userId === 'W001' ? 'W101' : (userId === 'T001' ? 'S301' : userId)));
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await safeFetch(`${NOTIFICATIONS_URL}/notifications?recipientUserId=${canonicalId}`, { headers });
      if (res.ok) {
        const remote = await res.json();
        const list = Array.isArray(remote) ? remote : [];
        for (const r of list) {
          if (!demoNotifications.some(d => d.id === r.notificationId || d.id === r.id)) {
            demoNotifications.push({
              id: r.notificationId || r.id,
              recipientUserId: r.recipientUserId,
              title: r.title,
              message: r.body,
              body: r.body,
              eventType: r.eventType,
              relatedComplaintId: r.relatedComplaintId,
              timestamp: r.createdAt || r.sentAt || new Date().toISOString(),
              read: false
            });
          }
        }
      }
    } catch {}
    return demoNotifications.filter(n => 
      n.recipientUserId === userId || 
      n.recipientUserId === canonicalId || 
      (canonicalId === 'M201' && n.recipientUserId === 'M001') ||
      (canonicalId === 'W101' && n.recipientUserId === 'W001') ||
      n.recipientUserId === 'ALL'
    );
  },

  async markNotificationRead(id) {
    const n = demoNotifications.find(x => x.id === id);
    if (n) n.read = true;
    return true;
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
