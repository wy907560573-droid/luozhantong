/**
 * Store.js - 双模式数据存储管理模块
 *
 * 模式 A (API 模式): 通过 js/api.js 与 Node.js 后端通信
 * 模式 B (Local 模式): 基于 localStorage 实现数据持久化
 *
 * 自动检测后端可用性，优先使用 API 模式
 */

const Store = {
  _useApi: false,
  _apiReady: false,
  _initialized: false,

  KEYS: {
    USERS: 'azt_users',
    PERMITS: 'azt_permits',
    VERIFICATIONS: 'azt_verifications',
    CURRENT_USER: 'azt_current_user',
    INITIALIZED: 'azt_initialized',
  },

  // ==================== 初始化 ====================
  async init() {
    if (this._initialized) return;

    // Initialize API module
    API.init();

    // Try API mode
    try {
      this._apiReady = await API.healthCheck();
    } catch(e) {
      this._apiReady = false;
    }

    this._useApi = this._apiReady;

    // Initialize localStorage data regardless
    this._initLocal();

    // Refresh permit statuses
    await this.refreshPermitStatus();

    this._initialized = true;
  },

  _initLocal() {
    const users = this._getLocalUsers();
    if (users.length === 0) {
      const adminUser = {
        id: this.genId(),
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        name: '管理员',
        unit: '系统管理',
        createdAt: new Date().toISOString(),
      };
      this._saveLocalUsers([adminUser]);
      this._saveLocalPermits([]);
      this._saveLocalVerifications([]);
      localStorage.setItem(this.KEYS.INITIALIZED, '1');
    }
    if (!localStorage.getItem(this.KEYS.INITIALIZED)) {
      this._saveLocalPermits(this._getLocalPermits());
      this._saveLocalVerifications(this._getLocalVerifications());
      localStorage.setItem(this.KEYS.INITIALIZED, '1');
    }
  },

  // ==================== 工具方法 ====================
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  },

  genPermitNo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `LZT-${y}${m}${d}-${rand}`;
  },

  // For backward compat: is using API mode
  get usingApi() { return this._useApi; },

  // ==================== 用户管理 (Local) ====================
  _getLocalUsers() {
    try { return JSON.parse(localStorage.getItem(this.KEYS.USERS) || '[]'); } catch { return []; }
  },

  _saveLocalUsers(users) {
    localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
  },

  // ==================== 用户管理 (Public API) ====================
  async getUsers() {
    if (this._useApi) {
      try {
        const users = await API.getUsers();
        return users.map(u => ({
          id: u.phone,
          username: u.phone,
          name: u.name,
          role: u.role,
          unit: u.unit || '',
          createdAt: u.created_at,
        }));
      } catch(e) {
        // Fallback to local
        return this._getLocalUsers();
      }
    }
    return this._getLocalUsers();
  },

  async findUser(username) {
    if (this._useApi) {
      try {
        const users = await API.getUsers();
        const u = users.find(x => x.phone === username);
        if (u) {
          return { id: u.phone, username: u.phone, name: u.name, role: u.role, unit: u.unit || '', createdAt: u.created_at };
        }
        return null;
      } catch(e) {}
    }
    const users = this._getLocalUsers();
    return users.find(u => u.username === username) || null;
  },

  async findUserByPhone(phone) {
    return this.findUser(phone);
  },

  async addUser(user) {
    if (this._useApi) {
      try {
        await API.createUser(user.username, user.name || user.username, user.password, user.role, user.unit);
        return user;
      } catch(e) {
        if (e.message && e.message.includes('已注册')) throw e;
        // Fallback to local
      }
    }
    const users = this._getLocalUsers();
    users.push(user);
    this._saveLocalUsers(users);
    return user;
  },

  async deleteUser(id) {
    if (this._useApi) {
      try {
        await API.deleteUser(id);
        return;
      } catch(e) {}
    }
    const users = this._getLocalUsers().filter(u => u.id !== id);
    this._saveLocalUsers(users);
  },

  async updateUserPassword(username, newPwd) {
    if (this._useApi) {
      try {
        // Can't do this via API currently - handled via changePassword
      } catch(e) {}
    }
    const users = this._getLocalUsers();
    const user = users.find(u => u.username === username);
    if (user) {
      user.password = newPwd;
      this._saveLocalUsers(users);
      return true;
    }
    return false;
  },

  // ==================== 当前登录用户 ====================
  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.CURRENT_USER) || 'null');
    } catch { return null; }
  },

  setCurrentUser(user) {
    localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(user));
  },

  clearCurrentUser() {
    localStorage.removeItem(this.KEYS.CURRENT_USER);
    if (this._useApi) { API.logout(); }
  },

  // ==================== 证件管理 (Local) ====================
  _getLocalPermits() {
    try { return JSON.parse(localStorage.getItem(this.KEYS.PERMITS) || '[]'); } catch { return []; }
  },

  _saveLocalPermits(permits) {
    localStorage.setItem(this.KEYS.PERMITS, JSON.stringify(permits));
  },

  // ==================== 证件管理 (Public API) ====================
  async getPermits() {
    if (this._useApi) {
      try {
        const permits = await API.getPermits();
        return permits.map(p => this._mapPermitFromApi(p));
      } catch(e) { return this._getLocalPermits(); }
    }
    return this._getLocalPermits();
  },

  _mapPermitFromApi(p) {
    return {
      id: p.id,
      permitNo: p.permit_no,
      name: p.name,
      phone: p.phone,
      gender: p.gender,
      idCardNo: p.id_card_no,
      idCardFront: p.id_card_front,
      idCardBack: p.id_card_back,
      unit: p.unit,
      projectName: p.project_name,
      siteLocation: p.site_location,
      experience: p.experience,
      jobType: Array.isArray(p.job_types) ? p.job_types.map(jt => jt.type).join('、') : '',
      jobTypes: p.job_types || [],
      photo: p.photo,
      faceDescriptor: p.face_descriptor || null,
      faceMethod: p.face_method || null,
      filingDate: p.filing_date,
      startDate: p.start_date,
      expiryDate: p.expiry_date,
      examScore: p.exam_score,
      examQRCode: p.exam_screenshot,
      catlEhs: p.catl_ehs_screenshot,
      status: p.status,
      reviewedBy: p.reviewed_by,
      reviewedAt: p.reviewed_at,
      downloadStatus: false,
      verifyCount: p.verify_count || 0,
      issued: p.issued === 1 || p.issued === true,
      createdAt: p.created_at,
    };
  },

  async addPermit(permit) {
    if (this._useApi) {
      try {
        const result = await API.createPermit(permit);
        return { id: result.id, permitNo: result.permitNo, status: result.status };
      } catch(e) {
        console.error('API addPermit failed:', e);
        // Fallback to local
      }
    }
    const permits = this._getLocalPermits();
    permits.unshift(permit);
    this._saveLocalPermits(permits);
    return { id: permit.id, permitNo: permit.permitNo, status: permit.status };
  },

  async getPermitById(id) {
    if (this._useApi) {
      try {
        const p = await API.getPermitById(id);
        return this._mapPermitFromApi(p);
      } catch(e) { return this._getLocalPermits().find(p => p.id === id) || null; }
    }
    return this._getLocalPermits().find(p => p.id === id) || null;
  },

  async updatePermit(id, updates) {
    if (this._useApi) {
      // For status-only updates handled by specific endpoints
      if (updates.status === '有效' || updates.status === '已驳回') {
        // Done via reviewPermit
      }
    }
    const permits = this._getLocalPermits();
    const idx = permits.findIndex(p => p.id === id);
    if (idx >= 0) {
      permits[idx] = { ...permits[idx], ...updates };
      this._saveLocalPermits(permits);
      return permits[idx];
    }
    return null;
  },

  async deletePermit(id) {
    const permits = this._getLocalPermits().filter(p => p.id !== id);
    this._saveLocalPermits(permits);
  },

  async exitPermit(id) {
    if (this._useApi) {
      try {
        await API.exitPermit(id);
      } catch(e) { /* fallback */ }
    }
    const permits = this._getLocalPermits();
    const idx = permits.findIndex(p => p.id === id);
    if (idx >= 0) {
      permits[idx].status = '已离场';
      permits[idx].exitedAt = new Date().toISOString();
      permits[idx].photo = '';
      permits[idx].faceDescriptor = null;
      this._saveLocalPermits(permits);
      return permits[idx];
    }
    return null;
  },

  async getActivePermits() {
    const permits = await this.getPermits();
    return permits.filter(p => p.status === '有效' && p.faceDescriptor);
  },

  async getPendingPermits() {
    if (this._useApi) {
      try {
        const permits = await API.getPendingPermits();
        return permits.map(p => this._mapPermitFromApi(p));
      } catch(e) {}
    }
    const permits = await this.getPermits();
    return permits.filter(p => p.status === '待审核');
  },

  async refreshPermitStatus() {
    if (this._useApi) return; // Server handles status
    const permits = this._getLocalPermits();
    const now = new Date();
    let changed = false;
    permits.forEach(p => {
      if (p.status === '有效' && p.expiryDate) {
        if (new Date(p.expiryDate) < now) {
          p.status = '已过期';
          changed = true;
        }
      }
    });
    if (changed) this._saveLocalPermits(permits);
  },

  // ==================== 核验记录 (Local) ====================
  _getLocalVerifications() {
    try { return JSON.parse(localStorage.getItem(this.KEYS.VERIFICATIONS) || '[]'); } catch { return []; }
  },

  _saveLocalVerifications(records) {
    localStorage.setItem(this.KEYS.VERIFICATIONS, JSON.stringify(records));
  },

  // ==================== 核验记录 (Public API) ====================
  async getVerifications() {
    if (this._useApi) {
      try {
        const records = await API.getVerifications();
        return records.map(r => ({
          id: r.id,
          timestamp: r.timestamp,
          photo: r.photo,
          result: r.result,
          matchedPermitId: r.matched_permit_id,
          matchedName: r.matched_name,
          matchedUnit: r.matched_unit,
          similarity: r.similarity,
        }));
      } catch(e) { return this._getLocalVerifications(); }
    }
    return this._getLocalVerifications();
  },

  async addVerification(record) {
    if (this._useApi) {
      try {
        await API.addVerification(record);
      } catch(e) { /* fallback */ }
    }
    let records = this._getLocalVerifications();
    records.unshift(record);
    if (records.length > 100) records = records.slice(0, 100);
    this._saveLocalVerifications(records);
    return record;
  },

  // ==================== 统计 ====================
  async getStats() {
    if (this._useApi) {
      try {
        const s = await API.getStats();
        return {
          today: s.today, month: s.month, quarter: s.quarter, year: s.year,
          pending: s.pending, rejected: s.rejected,
          valid: s.valid, expired: s.expired, exited: s.exited,
          verifyCount: s.verifyCount, total: s.total, monthlyData: s.monthlyData,
        };
      } catch(e) { /* fallback */ }
    }

    await this.refreshPermitStatus();
    const permits = this._getLocalPermits();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const todayCount = permits.filter(p => new Date(p.filingDate) >= today).length;
    const monthCount = permits.filter(p => new Date(p.filingDate) >= monthStart).length;
    const quarterCount = permits.filter(p => new Date(p.filingDate) >= quarterStart).length;
    const yearCount = permits.filter(p => new Date(p.filingDate) >= yearStart).length;

    const pendingCount = permits.filter(p => p.status === '待审核').length;
    const rejectedCount = permits.filter(p => p.status === '已驳回').length;
    const validCount = permits.filter(p => p.status === '有效').length;
    const expiredCount = permits.filter(p => p.status === '已过期').length;
    const exitedCount = permits.filter(p => p.status === '已离场').length;

    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = permits.filter(p => {
        const fd = new Date(p.filingDate);
        return fd >= d && fd < next;
      }).length;
      monthlyData.push({ month: `${d.getMonth() + 1}月`, count });
    }

    const verifyCount = this._getLocalVerifications().length;

    return {
      today: todayCount, month: monthCount, quarter: quarterCount, year: yearCount,
      pending: pendingCount, rejected: rejectedCount,
      valid: validCount, expired: expiredCount, exited: exitedCount,
      verifyCount, total: permits.length, monthlyData,
    };
  },

  async getUnitList() {
    if (this._useApi) {
      try {
        return await API.getUnits();
      } catch(e) {}
    }
    const permits = this._getLocalPermits();
    return [...new Set(permits.map(p => p.unit).filter(Boolean))];
  },
};
