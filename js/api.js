/**
 * API.js - 后端 API 封装层
 * 提供与 server.js 后端通信的所有方法
 */

const API = (() => {
  let _baseUrl = '';
  let _phone = null;
  let _token = null;

  function init() {
    // Derive base URL from current page
    _baseUrl = window.location.origin;
    // Try to restore saved auth
    try {
      const saved = JSON.parse(localStorage.getItem('azt_api_auth') || 'null');
      if (saved) {
        _phone = saved.phone;
        _token = saved.token;
      }
    } catch(e) {}
  }

  function setAuth(phone, token) {
    _phone = phone;
    _token = token;
    localStorage.setItem('azt_api_auth', JSON.stringify({ phone, token }));
  }

  function clearAuth() {
    _phone = null;
    _token = null;
    localStorage.removeItem('azt_api_auth');
  }

  function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (_phone) headers['x-user-phone'] = _phone;
    if (_token) headers['x-auth-token'] = _token;
    return headers;
  }

  // Check if backend is available
  async function healthCheck() {
    try {
      const resp = await fetch(_baseUrl + '/api/health', { method: 'GET', signal: AbortSignal.timeout(3000) });
      const data = await resp.json();
      return data.ok === true;
    } catch(e) {
      return false;
    }
  }

  // Generic fetch with error handling
  async function _fetch(path, options = {}) {
    const url = _baseUrl + path;
    const config = {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(10000), // 10s timeout for all API calls
      ...options,
    };
    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    const resp = await fetch(url, config);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const err = new Error(data.error || '请求失败');
      err.status = resp.status;
      throw err;
    }
    return data;
  }

  // ─── Auth ──────────────────────────────────────────
  async function login(phone, password) {
    const data = await _fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    });
    setAuth(data.phone, data.token);
    return data;
  }

  async function changePassword(oldPassword, newPassword) {
    return _fetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  }

  async function publicChangePassword(phone, oldPassword, newPassword) {
    return _fetch('/api/auth/public-change-password', {
      method: 'POST',
      body: JSON.stringify({ phone, oldPassword, newPassword })
    });
  }

  function logout() {
    clearAuth();
  }

  // ─── Users ─────────────────────────────────────────
  async function getUsers() {
    return _fetch('/api/users');
  }

  async function createUser(phone, name, password, role, unit) {
    return _fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ phone, name, password, role: role || 'user', unit: unit || '' })
    });
  }

  async function deleteUser(phone) {
    return _fetch('/api/users/' + encodeURIComponent(phone), { method: 'DELETE' });
  }

  // ─── Units ─────────────────────────────────────────
  async function getUnits() {
    return _fetch('/api/units');
  }

  // ─── Permits ───────────────────────────────────────
  async function getPermits() {
    return _fetch('/api/permits');
  }

  async function getPendingPermits() {
    return _fetch('/api/permits/pending');
  }

  async function getPermitById(id) {
    return _fetch('/api/permits/' + encodeURIComponent(id));
  }

  async function createPermit(permitData) {
    // Convert to FormData for multipart upload
    const fd = new FormData();
    const fields = ['name', 'gender', 'idCardNo', 'unit', 'projectName', 'siteLocation',
      'experience', 'examScore', 'startDate', 'expiryDate', 'faceDescriptor', 'faceMethod'];

    fields.forEach(f => {
      if (permitData[f] != null && permitData[f] !== undefined) {
        fd.append(f, String(permitData[f]));
      }
    });

    // Job types as JSON string
    if (permitData.jobTypes) {
      const jtClean = permitData.jobTypes.map(jt => ({ ...jt, certPhoto: null }));
      fd.append('job_types', JSON.stringify(jtClean));

      // Add cert photos
      const certPhotos = {};
      permitData.jobTypes.forEach(jt => {
        if (jt.certPhoto && jt.certPhoto.startsWith('data:')) {
          certPhotos[jt.type] = jt.certPhoto;
        }
      });
      if (Object.keys(certPhotos).length > 0) {
        fd.append('certPhotos', JSON.stringify(certPhotos));
      }
    }

    // Photo (base64 -> send as field)
    if (permitData.photo && permitData.photo.startsWith('data:')) {
      fd.append('photoDataUrl', permitData.photo);
    }

    // ID card images
    if (permitData.idCardFront && permitData.idCardFront.startsWith('data:')) {
      fd.append('idCardFront', permitData.idCardFront);
    }
    if (permitData.idCardBack && permitData.idCardBack.startsWith('data:')) {
      fd.append('idCardBack', permitData.idCardBack);
    }

    // Exam screenshot
    if (permitData.examQRCode && permitData.examQRCode.startsWith('data:')) {
      fd.append('examQRCode', permitData.examQRCode);
    }

    // CATL EHS
    if (permitData.catlEhs && permitData.catlEhs.startsWith('data:')) {
      fd.append('catlEhs', permitData.catlEhs);
    }

    return _fetch('/api/permits', {
      method: 'POST',
      body: fd
    });
  }

  async function reviewPermit(id, action) {
    return _fetch('/api/permits/' + encodeURIComponent(id) + '/review', {
      method: 'PUT',
      body: JSON.stringify({ action })
    });
  }

  async function verifyPermit(id) {
    return _fetch('/api/permits/' + encodeURIComponent(id) + '/verify', { method: 'PUT' });
  }

  async function issuePermit(id) {
    return _fetch('/api/permits/' + encodeURIComponent(id) + '/issue', { method: 'PUT' });
  }

  async function exitPermit(id) {
    return _fetch('/api/permits/' + encodeURIComponent(id) + '/exit', { method: 'PUT' });
  }

  // ─── Verifications ─────────────────────────────────
  async function getVerifications() {
    return _fetch('/api/verifications');
  }

  async function addVerification(record) {
    return _fetch('/api/verifications', {
      method: 'POST',
      body: JSON.stringify({
        photo: record.photo,
        result: record.result,
        matchedPermitId: record.matchedPermitId,
        matchedName: record.matchedName,
        matchedUnit: record.matchedUnit,
        similarity: record.similarity
      })
    });
  }

  // ─── Stats ─────────────────────────────────────────
  async function getStats() {
    return _fetch('/api/stats');
  }

  // ─── Settings ──────────────────────────────────────
  async function getSettings() {
    return _fetch('/api/settings');
  }

  async function setSetting(key, value) {
    return _fetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key, value })
    });
  }

  // ─── Upload ────────────────────────────────────────
  async function uploadImage(base64Data) {
    return _fetch('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ data: base64Data })
    });
  }

  // ─── Public API ────────────────────────────────────
  return {
    init, healthCheck,
    login, logout, changePassword, publicChangePassword,
    getUsers, createUser, deleteUser,
    getUnits,
    getPermits, getPendingPermits, getPermitById, createPermit,
    reviewPermit, verifyPermit, issuePermit, exitPermit,
    getVerifications, addVerification,
    getStats,
    getSettings, setSetting,
    uploadImage,
    get isLoggedIn() { return !!_token; },
    get phone() { return _phone; },
    get token() { return _token; },
  };
})();
