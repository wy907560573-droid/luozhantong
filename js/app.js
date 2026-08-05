'use strict';

/* ===================================================================
 * 落站通 - EHS承包商入场许可证管理平台
 * 主应用逻辑 (双模式: API + localStorage)
 * =================================================================== */

// ==================== 培训学习模块 ====================

const Training = {
  courses: [
    {
      id: 'safety_landing',
      title: '落站调试安全培训',
      prefix: 'safety_landing',
      totalSlides: 22,
      icon: `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    },
    {
      id: 'safety_lifting',
      title: '重卡3.0Pro吊装作业安全管理培训',
      prefix: 'safety_lifting',
      totalSlides: 60,
      icon: `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>`,
    },
  ],

  currentCourseId: null,
  currentSlide: 1,

  getStorageKey() {
    const user = Store.getCurrentUser();
    return 'training_completed_' + (user ? user.phone : 'guest');
  },

  getCompletedCourses() {
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },

  markCourseCompleted(courseId) {
    const completed = this.getCompletedCourses();
    if (!completed.includes(courseId)) {
      completed.push(courseId);
      localStorage.setItem(this.getStorageKey(), JSON.stringify(completed));
    }
  },

  isCourseCompleted(courseId) {
    return this.getCompletedCourses().includes(courseId);
  },

  isAllCompleted() {
    return this.courses.every(c => this.isCourseCompleted(c.id));
  },

  render() {
    const container = document.getElementById('training-list');
    if (!container) return;

    container.innerHTML = this.courses.map(course => {
      const completed = this.isCourseCompleted(course.id);
      return `
        <div class="training-card" data-course-id="${course.id}" onclick="Training.openCourse('${course.id}')">
          <div class="training-card-icon">${course.icon}</div>
          <div class="training-card-body">
            <div class="training-card-title">${course.title}</div>
            <div class="training-card-meta">
              <span>${course.totalSlides} 页幻灯片</span>
              ${completed ? '<span style="color:var(--color-success)">已完成</span>' : '<span style="color:var(--color-warning)">待学习</span>'}
            </div>
          </div>
          <div class="training-card-status">
            <div class="training-status-icon ${completed ? 'complete' : 'incomplete'}">
              ${completed
                ? '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>'
                : '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zM11 7h2v6h-2zm0 8h2v2h-2z"/></svg>'
              }
            </div>
          </div>
        </div>`;
    }).join('');
  },

  openCourse(courseId) {
    const course = this.courses.find(c => c.id === courseId);
    if (!course) return;
    this.currentCourseId = courseId;
    this.currentSlide = 1;
    this.updateSlideshow(course);
    this.showOverlay();
  },

  updateSlideshow(course) {
    document.getElementById('slideshow-title').textContent = course.title;
    this.updateSlideImage();
    this.updateControls(course);
  },

  updateSlideImage() {
    const course = this.courses.find(c => c.id === this.currentCourseId);
    if (!course) return;
    const slideNum = String(this.currentSlide).padStart(3, '0');
    const imgPath = `images/training/${course.prefix}_${slideNum}.jpg`;
    document.getElementById('slideshow-img').src = imgPath;
    document.getElementById('slideshow-counter').textContent = `${this.currentSlide} / ${course.totalSlides}`;
    const progress = (this.currentSlide / course.totalSlides) * 100;
    document.getElementById('slideshow-progress-bar').style.width = progress + '%';
  },

  updateControls(course) {
    const prevBtn = document.getElementById('slideshow-prev');
    const nextBtn = document.getElementById('slideshow-next');
    prevBtn.disabled = (this.currentSlide <= 1);
    nextBtn.disabled = (this.currentSlide >= course.totalSlides);
  },

  showOverlay() {
    document.getElementById('slideshow-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  hideOverlay() {
    document.getElementById('slideshow-overlay').classList.add('hidden');
    document.body.style.overflow = '';
    const course = this.courses.find(c => c.id === this.currentCourseId);
    if (course && this.currentSlide >= course.totalSlides) {
      this.markCourseCompleted(course.id);
      this.render();
      this.updateExamSection();
      if (this.isAllCompleted()) {
        setTimeout(() => {
          showToast('全部培训课程已完成！现在可以参加安全考试了', 'success');
        }, 300);
      }
    }
  },

  nextSlide() {
    const course = this.courses.find(c => c.id === this.currentCourseId);
    if (!course || this.currentSlide >= course.totalSlides) return;
    this.currentSlide++;
    this.updateSlideImage();
    this.updateControls(course);
  },

  prevSlide() {
    if (this.currentSlide <= 1) return;
    const course = this.courses.find(c => c.id === this.currentCourseId);
    this.currentSlide--;
    this.updateSlideImage();
    if (course) this.updateControls(course);
  },

  updateExamSection() {
    const lockedHint = document.getElementById('exam-locked-hint');
    const examContent = document.getElementById('exam-content');
    if (!lockedHint || !examContent) return;
    if (this.isAllCompleted()) {
      lockedHint.classList.add('hidden');
      examContent.classList.remove('hidden');
    } else {
      lockedHint.classList.remove('hidden');
      examContent.classList.add('hidden');
    }
  },

  init() {
    this.render();
    this.updateExamSection();
  },
};


// ==================== 工具函数 ====================

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

function showLoading(text = '加载中...') {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

function showConfirm(title, body) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-body').textContent = body;
    modal.classList.remove('hidden');
    const ok = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');
    const cleanup = () => {
      modal.classList.add('hidden');
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
    };
    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

function generateQRCodeDataURL(text, size = 48) {
  return new Promise((resolve) => {
    if (typeof QRCode === 'undefined') { resolve(''); return; }
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    try {
      new QRCode(tempDiv, {
        text: text, width: size, height: size,
        colorDark: '#000000', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });
      setTimeout(() => {
        const canvas = tempDiv.querySelector('canvas');
        const img = tempDiv.querySelector('img');
        if (canvas) { resolve(canvas.toDataURL('image/png')); }
        else if (img) { resolve(img.src); }
        else { resolve(''); }
        document.body.removeChild(tempDiv);
      }, 200);
    } catch (e) {
      document.body.removeChild(tempDiv);
      resolve('');
    }
  });
}

// ==================== 认证模块 ====================

const Auth = {
  async login(username, password, role) {
    if (Store._useApi) {
      try {
        const data = await API.login(username, password);
        if ((role === 'admin' && data.role !== 'admin') ||
            (role === 'user' && data.role !== 'user')) {
          return { success: false, msg: '角色不匹配' };
        }
        const user = {
          id: data.phone,
          username: data.phone,
          phone: data.phone,
          name: data.name,
          role: data.role,
          unit: data.unit || '',
          createdAt: new Date().toISOString(),
        };
        Store.setCurrentUser(user);
        return { success: true, user };
      } catch(e) {
        return { success: false, msg: e.message || '登录失败' };
      }
    }

    const user = role === 'admin'
      ? await Store.findUser(username)
      : await Store.findUserByPhone(username);
    if (!user) return { success: false, msg: '账号不存在' };
    if (user.password !== password) return { success: false, msg: '密码错误' };
    if (role === 'admin' && user.role !== 'admin') return { success: false, msg: '非管理员账号' };
    if (role === 'user' && user.role !== 'user') return { success: false, msg: '请使用管理员登录' };
    Store.setCurrentUser(user);
    return { success: true, user };
  },

  logout() {
    Store.clearCurrentUser();
    showPage('page-login');
    document.getElementById('main-app').classList.add('hidden');
  },

  async createUser(phone, password, unit) {
    if (!phone || phone.length !== 11) return { success: false, msg: '请输入正确的11位手机号' };
    if (!password || password.length < 4) return { success: false, msg: '密码至少4位' };

    if (Store._useApi) {
      try {
        await API.createUser(phone, phone, password, 'user', unit);
        return { success: true };
      } catch(e) {
        console.error('API createUser failed:', e);
        // If auth error, try to re-auth
        if (e.status === 401) {
          showToast('登录已过期，请重新登录', 'error');
          Auth.logout();
          return { success: false, msg: '登录已过期，请重新登录' };
        }
        return { success: false, msg: e.message || '创建失败' };
      }
    }

    // Local mode
    if (await Store.findUserByPhone(phone)) return { success: false, msg: '该手机号已注册' };
    const user = {
      id: Store.genId(),
      username: phone, password: password,
      role: 'user', unit: unit,
      createdAt: new Date().toISOString(),
    };
    await Store.addUser(user);
    return { success: true, user };
  },

  async changePassword(username, oldPwd, newPwd) {
    if (Store._useApi) {
      try {
        await API.publicChangePassword(username, oldPwd, newPwd);
        return { success: true };
      } catch(e) {
        try {
          await API.changePassword(oldPwd, newPwd);
          return { success: true };
        } catch(e2) {
          return { success: false, msg: e.message || e2.message || '修改失败' };
        }
      }
    }

    const user = await Store.findUser(username);
    if (!user) return { success: false, msg: '账号不存在' };
    if (user.password !== oldPwd) return { success: false, msg: '原密码错误' };
    if (!newPwd || newPwd.length < 4) return { success: false, msg: '新密码至少4位' };
    await Store.updateUserPassword(username, newPwd);
    return { success: true };
  },

  async deleteUser(id) {
    await Store.deleteUser(id);
  },
};

// ==================== 页面导航 ====================

const MAIN_PAGES = ['dashboard', 'details', 'review', 'verify', 'settings'];
const SUB_PAGES = ['new-permit', 'permit-preview'];

async function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');

  if (MAIN_PAGES.includes(pageId)) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (navBtn) navBtn.classList.add('active');
  } else {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  }

  if (pageId === 'dashboard') await Dashboard.render();
  if (pageId === 'details') await Details.render();
  if (pageId === 'review') await Review.render();
  if (pageId === 'verify') Verify.render();
  if (pageId === 'settings') await SettingsPage.render();
  if (pageId === 'new-permit') Training.init();

  window.scrollTo(0, 0);
}

async function showMainApp() {
  document.getElementById('page-login').classList.remove('active');
  document.getElementById('main-app').classList.remove('hidden');

  const user = Store.getCurrentUser();
  const isAdmin = user && user.role === 'admin';

  const dashboardNav = document.querySelector('.nav-item[data-page="dashboard"]');
  const detailsNav = document.querySelector('.nav-item[data-page="details"]');
  const reviewNav = document.querySelector('.nav-item[data-page="review"]');
  const verifyNav = document.querySelector('.nav-item[data-page="verify"]');
  const backFromPermit = document.getElementById('back-from-permit');

  if (isAdmin) {
    if (dashboardNav) dashboardNav.classList.remove('hidden');
    if (detailsNav) detailsNav.classList.remove('hidden');
    if (reviewNav) reviewNav.classList.remove('hidden');
    if (verifyNav) verifyNav.classList.remove('hidden');
    if (backFromPermit) backFromPermit.classList.remove('hidden');
    await updateReviewBadge();
    await showPage('dashboard');
  } else {
    if (dashboardNav) dashboardNav.classList.add('hidden');
    if (detailsNav) detailsNav.classList.add('hidden');
    if (reviewNav) reviewNav.classList.add('hidden');
    if (verifyNav) verifyNav.classList.add('hidden');
    if (backFromPermit) backFromPermit.classList.add('hidden');
    NewPermit.reset();
    showPage('new-permit');
  }

  FaceModule.loadModels().catch(() => {});
}

function getHomePage() {
  const user = Store.getCurrentUser();
  return (user && user.role === 'admin') ? 'dashboard' : 'new-permit';
}

// ==================== 首页看板 ====================

const Dashboard = {
  chart: null,

  async render() {
    await Store.refreshPermitStatus();
    const stats = await Store.getStats();

    document.getElementById('stat-today').textContent = stats.today;
    document.getElementById('stat-month').textContent = stats.month;
    document.getElementById('stat-quarter').textContent = stats.quarter;
    document.getElementById('stat-year').textContent = stats.year;

    const now = new Date();
    document.getElementById('stat-month-label').textContent = `本月：${now.getFullYear()}年${now.getMonth() + 1}月`;

    document.getElementById('quick-pending').textContent = stats.pending;
    document.getElementById('quick-valid').textContent = stats.valid;
    document.getElementById('quick-expired').textContent = stats.expired;
    document.getElementById('quick-exited').textContent = stats.exited;
    document.getElementById('quick-verify').textContent = stats.verifyCount;

    const user = Store.getCurrentUser();
    if (user) {
      document.getElementById('dashboard-user-badge').textContent = user.role === 'admin' ? '管理员' : (user.unit || '操作员');
    }

    this.renderChart(stats.monthlyData);
  },

  renderChart(data) {
    const ctx = document.getElementById('trend-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.month),
        datasets: [{
          label: '备案人数',
          data: data.map(d => d.count),
          backgroundColor: function(context) {
            const chart = context.chart;
            const { chartArea } = chart;
            if (!chartArea) return '#0B3D91';
            const gradient = chart.ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(11, 61, 145, 0.3)');
            gradient.addColorStop(1, 'rgba(11, 61, 145, 0.9)');
            return gradient;
          },
          borderRadius: 6,
          maxBarThickness: 32,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { ticks: { font: { size: 10 } }, grid: { display: false } }
        }
      }
    });
  },
};

// ==================== 新增入场证 ====================

const NewPermit = {
  photoDataUrl: null,
  idCardFront: null,
  idCardBack: null,
  examQRCode: null,
  catlEhs: null,
  selectedJobTypes: {},

  jobTypeConfig: {
    '电工': { certName: '电工证' },
    '焊工': { certName: '焊工证' },
    '高处作业': { certName: '高处作业证' },
    '司索工': { certName: '司索特种作业证' },
    '叉车司机': { certName: '叉车证' },
    '安全员': { certName: '安全员证' },
    '其他': { certName: '' },
  },

  reset() {
    this.photoDataUrl = null;
    this.idCardFront = null;
    this.idCardBack = null;
    this.examQRCode = null;
    this.selectedJobTypes = {};
    document.getElementById('permit-name').value = '';
    document.getElementById('permit-phone').value = '';
    document.getElementById('permit-gender').value = '';
    document.getElementById('permit-idcard').value = '';
    document.getElementById('permit-unit').value = '';
    document.getElementById('permit-project-name').value = '';
    document.getElementById('permit-site-location').value = '';
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const endDefault = new Date(today);
    endDefault.setDate(endDefault.getDate() + 30);
    const endStr = endDefault.toISOString().split('T')[0];
    document.getElementById('permit-start-date').value = todayStr;
    document.getElementById('permit-end-date').value = endStr;
    document.getElementById('captured-photo').classList.add('hidden');
    document.getElementById('captured-photo').src = '';
    document.getElementById('photo-placeholder').classList.remove('hidden');
    document.getElementById('btn-remove-photo').classList.add('hidden');
    ['front', 'back'].forEach(side => {
      this.idCardResetUI(side);
      document.getElementById('file-idcard-' + side).value = '';
    });
    document.querySelectorAll('.jobtype-chip').forEach(c => c.classList.remove('active'));
    document.getElementById('cert-upload-area').innerHTML = '';
    document.getElementById('permit-exam-score').value = '';
    document.getElementById('exam-score-hint').textContent = '';
    document.getElementById('exam-score-hint').className = 'exam-score-hint';
    this.examQRCodeResetUI();
    this.catlEhs = null;
    this.catlEhsResetUI();
    document.getElementById('permit-experience').value = '';
    this.updateUnitList();
  },

  catlEhsResetUI() {
    document.getElementById('catl-ehs-preview').classList.add('hidden');
    document.getElementById('catl-ehs-preview').src = '';
    document.getElementById('catl-ehs-placeholder').classList.remove('hidden');
    document.getElementById('catl-ehs-remove').classList.add('hidden');
    document.getElementById('file-catl-ehs').value = '';
  },

  handleCatlEhs(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('请选择图片文件', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        this.catlEhs = canvas.toDataURL('image/jpeg', 0.8);
        document.getElementById('catl-ehs-preview').src = this.catlEhs;
        document.getElementById('catl-ehs-preview').classList.remove('hidden');
        document.getElementById('catl-ehs-placeholder').classList.add('hidden');
        document.getElementById('catl-ehs-remove').classList.remove('hidden');
        showToast('宁德时代EHS凭证上传成功', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  removeCatlEhs() {
    this.catlEhs = null;
    this.catlEhsResetUI();
  },

  idCardResetUI(side) {
    document.getElementById('idcard-' + side + '-preview').classList.add('hidden');
    document.getElementById('idcard-' + side + '-preview').src = '';
    document.getElementById('idcard-' + side + '-placeholder').classList.remove('hidden');
    document.getElementById('idcard-' + side + '-remove').classList.add('hidden');
  },

  async updateUnitList() {
    const units = await Store.getUnitList();
    const datalist = document.getElementById('unit-list');
    if (datalist) datalist.innerHTML = units.map(u => `<option value="${u}">`).join('');
  },

  toggleJobType(chip) {
    const type = chip.dataset.type;
    const certName = chip.dataset.cert;
    if (chip.classList.contains('active')) {
      chip.classList.remove('active');
      delete this.selectedJobTypes[type];
      this.renderCertUploadArea();
    } else {
      chip.classList.add('active');
      this.selectedJobTypes[type] = { certPhoto: null, certName: certName, certNumber: '' };
      this.renderCertUploadArea();
    }
  },

  renderCertUploadArea() {
    const area = document.getElementById('cert-upload-area');
    const types = Object.keys(this.selectedJobTypes);
    if (types.length === 0) { area.innerHTML = ''; return; }

    area.innerHTML = types.map(type => {
      const config = this.selectedJobTypes[type];
      const certName = config.certName;
      const hasCert = !!certName;
      const certPhoto = config.certPhoto;

      if (!hasCert) {
        return `<div class="cert-upload-item">
          <div class="cert-upload-header">
            <span class="cert-upload-label">${type}</span>
            <span class="cert-upload-placeholder">无需证书</span>
          </div>
        </div>`;
      }

      return `<div class="cert-upload-item">
        <div class="cert-upload-header">
          <span class="cert-upload-label">${type} <span class="cert-required">需上传${certName}</span></span>
          <button type="button" class="cert-upload-btn" onclick="document.getElementById('cert-file-${type.replace(/[^a-zA-Z\u4e00-\u9fa5]/g,'_')}').click()">
            <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            上传${certName}
          </button>
          <input type="file" id="cert-file-${type.replace(/[^a-zA-Z\u4e00-\u9fa5]/g,'_')}" accept="image/*" class="hidden" onchange="NewPermit.handleCertFile('${type}', this.files[0])">
        </div>
        ${certPhoto ? `<div class="cert-upload-preview">
          <img src="${certPhoto}" alt="${certName}">
          <button type="button" class="cert-remove" onclick="NewPermit.removeCert('${type}')">&times;</button>
        </div>` : ''}
        <div class="cert-number-row">
          <label class="cert-number-label">证书号 <span class="required">*</span></label>
          <input type="text" class="cert-number-input" id="cert-number-${type.replace(/[^a-zA-Z\u4e00-\u9fa5]/g,'_')}" placeholder="请输入${certName}编号" value="${(config.certNumber || '').replace(/"/g,'&quot;')}" onchange="NewPermit.handleCertNumberChange('${type}', this.value)" oninput="NewPermit.handleCertNumberChange('${type}', this.value)">
        </div>
      </div>`;
    }).join('');
  },

  async handleCertFile(type, file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('请选择图片文件', 'error'); return; }
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxW = 1200;
          const scale = Math.min(1, maxW / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          this.selectedJobTypes[type].certPhoto = compressed;
          this.renderCertUploadArea();
          showToast(`${this.selectedJobTypes[type].certName}上传成功`, 'success');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch (e) { showToast('证书图片上传失败', 'error'); }
  },

  removeCert(type) {
    if (this.selectedJobTypes[type]) {
      this.selectedJobTypes[type].certPhoto = null;
      this.renderCertUploadArea();
    }
  },

  handleCertNumberChange(type, value) {
    if (this.selectedJobTypes[type]) {
      this.selectedJobTypes[type].certNumber = value.trim();
    }
  },

  getJobTypeDisplay() {
    return Object.keys(this.selectedJobTypes).join('、');
  },

  getJobTypesArray() {
    return Object.keys(this.selectedJobTypes).map(type => ({
      type: type,
      certName: this.selectedJobTypes[type].certName || '',
      certNumber: this.selectedJobTypes[type].certNumber || '',
      certPhoto: this.selectedJobTypes[type].certPhoto || null,
    }));
  },

  async handlePhotoFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('请选择图片文件', 'error'); return; }
    showLoading('处理图片中...');
    try {
      const { dataUrl } = await FaceModule.fileToImage(file);
      const compressed = await FaceModule.compressImage(dataUrl, 800, 0.85);
      this.photoDataUrl = compressed;
      const photoImg = document.getElementById('captured-photo');
      photoImg.src = compressed;
      photoImg.classList.remove('hidden');
      document.getElementById('photo-placeholder').classList.add('hidden');
      document.getElementById('btn-remove-photo').classList.remove('hidden');
    } catch (e) { showToast('图片加载失败', 'error'); }
    hideLoading();
  },

  removePhoto() {
    this.photoDataUrl = null;
    document.getElementById('captured-photo').src = '';
    document.getElementById('captured-photo').classList.add('hidden');
    document.getElementById('photo-placeholder').classList.remove('hidden');
    document.getElementById('btn-remove-photo').classList.add('hidden');
    document.getElementById('file-camera').value = '';
    document.getElementById('file-album').value = '';
  },

  async handleIdCardFile(side, file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('请选择图片文件', 'error'); return; }
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxW = 1400;
          const scale = Math.min(1, maxW / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          if (side === 'front') this.idCardFront = compressed;
          else this.idCardBack = compressed;
          const preview = document.getElementById('idcard-' + side + '-preview');
          const placeholder = document.getElementById('idcard-' + side + '-placeholder');
          const removeBtn = document.getElementById('idcard-' + side + '-remove');
          preview.src = compressed;
          preview.classList.remove('hidden');
          placeholder.classList.add('hidden');
          removeBtn.classList.remove('hidden');
          document.getElementById('file-idcard-' + side).value = '';
          showToast(side === 'front' ? '身份证正面已上传' : '身份证反面已上传', 'success');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch (e) { showToast('图片处理失败: ' + e.message, 'error'); }
  },

  removeIdCard(side) {
    if (side === 'front') this.idCardFront = null;
    else this.idCardBack = null;
    this.idCardResetUI(side);
    document.getElementById('file-idcard-' + side).value = '';
  },

  async handleExamQRCode(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('请选择图片文件', 'error'); return; }
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxW = 600;
          const scale = Math.min(1, maxW / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          this.examQRCode = canvas.toDataURL('image/jpeg', 0.75);
          document.getElementById('exam-qrcode-preview').src = this.examQRCode;
          document.getElementById('exam-qrcode-preview').classList.remove('hidden');
          document.getElementById('exam-qrcode-placeholder').classList.add('hidden');
          document.getElementById('exam-qrcode-remove').classList.remove('hidden');
          showToast('考试合格截图已上传', 'success');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch (e) { showToast('二维码上传失败', 'error'); }
  },

  removeExamQRCode() {
    this.examQRCode = null;
    document.getElementById('exam-qrcode-preview').classList.add('hidden');
    document.getElementById('exam-qrcode-preview').src = '';
    document.getElementById('exam-qrcode-placeholder').classList.remove('hidden');
    document.getElementById('exam-qrcode-remove').classList.add('hidden');
    document.getElementById('file-exam-qrcode').value = '';
  },

  examQRCodeResetUI() {
    this.examQRCode = null;
    document.getElementById('exam-qrcode-preview').classList.add('hidden');
    document.getElementById('exam-qrcode-preview').src = '';
    document.getElementById('exam-qrcode-placeholder').classList.remove('hidden');
    document.getElementById('exam-qrcode-remove').classList.add('hidden');
    document.getElementById('file-exam-qrcode').value = '';
  },

  async submit() {
    const name = document.getElementById('permit-name').value.trim();
    const phone = document.getElementById('permit-phone').value.trim();
    const gender = document.getElementById('permit-gender').value;
    const idCardNo = document.getElementById('permit-idcard').value.trim();
    const unit = document.getElementById('permit-unit').value.trim();
    const projectName = document.getElementById('permit-project-name').value.trim();
    const siteLocation = document.getElementById('permit-site-location').value.trim();
    const experience = document.getElementById('permit-experience').value;
    const jobTypes = this.getJobTypesArray();
    const startDateStr = document.getElementById('permit-start-date').value;
    const endDateStr = document.getElementById('permit-end-date').value;
    const examScoreStr = document.getElementById('permit-exam-score').value.trim();
    const examScore = parseInt(examScoreStr, 10);

    if (!name) { showToast('请输入姓名', 'error'); return; }
    if (!phone || !/^1\d{10}$/.test(phone)) { showToast('请输入正确的手机号', 'error'); return; }
    if (!gender) { showToast('请选择性别', 'error'); return; }
    if (!idCardNo || !/^\d{17}[\dXx]$/.test(idCardNo)) { showToast('请输入正确的18位身份证号', 'error'); return; }
    if (!this.idCardFront) { showToast('请上传身份证正面（人像面）', 'error'); return; }
    if (!this.idCardBack) { showToast('请上传身份证反面（国徽面）', 'error'); return; }
    if (!unit) { showToast('请输入单位名称', 'error'); return; }
    if (!projectName) { showToast('请输入落站项目名称', 'error'); return; }
    if (!siteLocation) { showToast('请输入落站地点', 'error'); return; }
    if (!experience) { showToast('请选择落站经验', 'error'); return; }
    if (jobTypes.length === 0) { showToast('请选择特种作业证书', 'error'); return; }
    if (!this.photoDataUrl) { showToast('请采集人像照片', 'error'); return; }
    if (!startDateStr) { showToast('请选择开始日期', 'error'); return; }
    if (!endDateStr) { showToast('请选择结束日期', 'error'); return; }

    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T23:59:59');
    if (endDate < startDate) { showToast('结束日期不能早于开始日期', 'error'); return; }
    if (!Training.isAllCompleted()) { showToast('请先完成所有培训课程学习，再参加考试', 'error'); return; }
    if (isNaN(examScore) || examScoreStr === '') { showToast('请输入考试分数', 'error'); return; }
    if (examScore < 0 || examScore > 100) { showToast('考试分数应在0-100之间', 'error'); return; }
    if (examScore < 80) { showToast('考试不合格（需≥80分），请重新考试', 'error'); return; }
    if (!this.examQRCode) { showToast('考试合格后，请上传考试合格截图', 'error'); return; }
    if (!this.catlEhs) { showToast('请上传宁德时代EHS公众号学习考试通过凭证', 'error'); return; }

    for (const jt of jobTypes) {
      if (jt.certName && !jt.certPhoto) { showToast(`请上传${jt.type}的${jt.certName}`, 'error'); return; }
      if (jt.certName && !jt.certNumber) { showToast(`请输入${jt.type}的${jt.certName}编号`, 'error'); return; }
    }

    showLoading('正在生成入场证...');

    try {
      const img = await FaceModule.dataUrlToImage(this.photoDataUrl);
      const faceResult = await FaceModule.detectAndDescribe(img);

      if (!faceResult.success) {
        hideLoading();
        showToast(faceResult.error || '人脸检测失败，请重新拍照', 'error');
        return;
      }

      const user = Store.getCurrentUser();
      const initialStatus = (user && user.role === 'admin') ? '有效' : '待审核';
      const now = new Date();
      const permit = {
        id: Store.genId(),
        permitNo: Store.genPermitNo(),
        name, phone, gender, idCardNo,
        idCardFront: this.idCardFront,
        idCardBack: this.idCardBack,
        unit, projectName, siteLocation, experience,
        jobType: this.getJobTypeDisplay(),
        jobTypes,
        photo: this.photoDataUrl,
        faceDescriptor: faceResult.descriptor,
        faceMethod: faceResult.method,
        filingDate: now.toISOString(),
        startDate: startDate.toISOString(),
        expiryDate: endDate.toISOString(),
        examScore,
        examQRCode: this.examQRCode,
        catlEhs: this.catlEhs,
        status: initialStatus,
        reviewedBy: null,
        reviewedAt: null,
        downloadStatus: false,
        verifyCount: 0,
        issued: false,
        createdAt: now.toISOString(),
      };

      const result = await Store.addPermit(permit);
      hideLoading();

      if (initialStatus === '待审核') {
        showToast('提交成功！请等待管理员审核开通', 'success');
      } else {
        showToast('入场许可证生成成功！', 'success');
      }

      Preview.show(result.id);
    } catch (e) {
      hideLoading();
      showToast('生成失败: ' + e.message, 'error');
    }
  },
};

// ==================== 证件预览 ====================

const Preview = {
  currentPermitId: null,

  async show(permitId) {
    this.currentPermitId = permitId;
    const permit = await Store.getPermitById(permitId);
    if (!permit) {
      showToast('证件不存在', 'error');
      showPage(getHomePage());
      return;
    }

    const qrUrl = await generateQRCodeDataURL(permit.permitNo, 96);

    const card = document.getElementById('permit-card');
    card.innerHTML = `
      <div class="permit-watermark">落站通</div>
      <div class="permit-header">
        <div class="permit-header-left">
          <div class="permit-logo">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#fff" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 15l-4-4 1.4-1.4 2.6 2.6 5.2-5.2L17.6 9.4 11 16z"/></svg>
          </div>
          <div>
            <div class="permit-title">承包商入场许可证</div>
            <div class="permit-issuer">中换电（浙江）科技有限公司</div>
            <div class="permit-no">NO: ${permit.permitNo}</div>
          </div>
        </div>
      </div>
      <div class="permit-body">
        <div class="permit-photo-box">
          <img src="${permit.photo}" alt="人像">
        </div>
        <div class="permit-info">
          <div class="permit-info-row"><span class="permit-info-label">姓名</span><span class="permit-info-value">${permit.name}</span></div>
          <div class="permit-info-row"><span class="permit-info-label">电话</span><span class="permit-info-value">${permit.phone || '-'}</span></div>
          <div class="permit-info-row"><span class="permit-info-label">性别</span><span class="permit-info-value">${permit.gender}</span></div>
          <div class="permit-info-row"><span class="permit-info-label">身份证</span><span class="permit-info-value">${permit.idCardNo || '-'}</span></div>
          <div class="permit-info-row"><span class="permit-info-label">单位</span><span class="permit-info-value">${permit.unit}</span></div>
          <div class="permit-info-row"><span class="permit-info-label">项目</span><span class="permit-info-value">${permit.projectName || '-'}</span></div>
          <div class="permit-info-row"><span class="permit-info-label">地点</span><span class="permit-info-value">${permit.siteLocation || '-'}</span></div>
          <div class="permit-info-row"><span class="permit-info-label">落站经验</span><span class="permit-info-value">${permit.experience || '-'}</span></div>
          <div class="permit-info-row"><span class="permit-info-label">考试</span><span class="permit-info-value" style="color:var(--color-success);font-weight:600">合格 ${permit.examScore != null ? permit.examScore + '分' : ''}</span></div>
          <div class="permit-info-row"><span class="permit-info-label">宁德时代EHS</span><span class="permit-info-value" style="color:var(--color-success);font-weight:500">${permit.catlEhs ? '已通过' : '-'}</span></div>
          <div class="permit-info-row"><span class="permit-info-label">证书</span><span class="permit-info-value">${permit.jobType}</span></div>
          ${(permit.jobTypes || []).filter(jt => jt.certName && jt.certNumber).map(jt => `
          <div class="permit-info-row"><span class="permit-info-label">${jt.type}证号</span><span class="permit-info-value" style="font-family:monospace">${jt.certNumber}</span></div>`).join('')}
          <div class="permit-info-row"><span class="permit-info-label">状态</span><span class="permit-info-value" style="color:${permit.status==='有效'?'var(--color-success)':(permit.status==='待审核'?'var(--color-warning)':'var(--color-danger)')}">${permit.status}</span></div>
          <div class="permit-info-row"><span class="permit-info-label">开始</span><span class="permit-info-value">${permit.startDate ? formatDate(permit.startDate) : formatDate(permit.filingDate)}</span></div>
        </div>
      </div>
      <div class="permit-footer">
        <div class="permit-validity">
          <div class="permit-validity-label">结束日期</div>
          <div class="permit-validity-value">${formatDate(permit.expiryDate)}</div>
          <div class="permit-validity-label" style="margin-top:4px">中换电（浙江）科技有限公司</div>
        </div>
        <div class="permit-qr">
          ${qrUrl ? `<img src="${qrUrl}" style="width:100%;height:100%;border-radius:2px" alt="QR">` : ''}
        </div>
        <div class="permit-seal">
          <div class="permit-seal-text">EHS<br>落站通<br>专用章</div>
        </div>
      </div>`;

    showPage('permit-preview');
  },

  async download() {
    if (!this.currentPermitId) return;
    const permit = await Store.getPermitById(this.currentPermitId);
    if (!permit) return;

    if (typeof html2canvas === 'undefined') {
      showToast('图片处理库未加载，请刷新页面重试', 'error');
      return;
    }

    showLoading('正在生成证件图片...');
    try {
      const card = document.getElementById('permit-card');
      const images = card.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; setTimeout(resolve, 3000); });
      }));
      await new Promise(r => setTimeout(r, 200));

      const canvas = await html2canvas(card, {
        scale: 3, useCORS: true, allowTaint: true,
        backgroundColor: '#0B3D91', logging: false,
      });

      const link = document.createElement('a');
      link.download = `入场许可证_${permit.name}_${permit.permitNo}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      await Store.updatePermit(permit.id, { downloadStatus: true });
      showToast('证件下载成功！', 'success');
    } catch (e) {
      console.error('下载失败:', e);
      showToast('下载失败，请重试', 'error');
    }
    hideLoading();
  },
};

// ==================== 证件明细 ====================

const Details = {
  async render() {
    await Store.refreshPermitStatus();
    await this.updateUnitFilter();
    this.renderList();
  },

  async updateUnitFilter() {
    const units = await Store.getUnitList();
    const select = document.getElementById('filter-unit');
    const current = select.value;
    select.innerHTML = '<option value="">全部单位</option>' +
      units.map(u => `<option value="${u}">${u}</option>`).join('');
    select.value = current;
  },

  async getFilteredPermits() {
    let permits = await Store.getPermits();
    const search = document.getElementById('detail-search').value.trim().toLowerCase();
    const status = document.getElementById('filter-status').value;
    const unit = document.getElementById('filter-unit').value;
    const jobType = document.getElementById('filter-jobtype').value;

    if (search) {
      permits = permits.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.permitNo.toLowerCase().includes(search) ||
        (p.phone && p.phone.includes(search)) ||
        (p.idCardNo && p.idCardNo.toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (status) permits = permits.filter(p => p.status === status);
    if (unit) permits = permits.filter(p => p.unit === unit);
    if (jobType) permits = permits.filter(p => {
      if (p.jobTypes && Array.isArray(p.jobTypes)) return p.jobTypes.some(jt => jt.type === jobType);
      return p.jobType === jobType;
    });
    return permits;
  },

  async renderList() {
    const permits = await this.getFilteredPermits();
    const list = document.getElementById('detail-list');

    document.getElementById('detail-total').textContent = permits.length;
    document.getElementById('detail-pending-count').textContent = permits.filter(p => p.status === '待审核').length;
    document.getElementById('detail-valid-count').textContent = permits.filter(p => p.status === '有效').length;
    document.getElementById('detail-expired-count').textContent = permits.filter(p => p.status === '已过期').length;
    document.getElementById('detail-exited-count').textContent = permits.filter(p => p.status === '已离场').length;

    if (permits.length === 0) {
      list.innerHTML = `<div class="empty-state">
          <svg viewBox="0 0 24 24" width="56" height="56"><path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          <p>暂无证件数据</p>
        </div>`;
      return;
    }

    list.innerHTML = permits.map(p => {
      const statusClass = p.status === '有效' ? 'status-valid' : (p.status === '已过期' ? 'status-expired' : (p.status === '已离场' ? 'status-exited' : (p.status === '待审核' ? 'status-pending' : 'status-rejected')));
      const photoSrc = p.photo || '';
      return `
        <div class="detail-item" data-id="${p.id}">
          <img class="detail-item-photo" src="${photoSrc || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath fill=%22%23ccc%22 d=%22M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z%22/%3E%3C/svg%3E'}" alt="照片">
          <div class="detail-item-info">
            <div class="detail-item-name">${p.name}<span class="status-badge ${statusClass}">${p.status}</span></div>
            <div class="detail-item-meta">
              <span>${p.unit}</span><span>${p.projectName || ''}</span><span>${p.siteLocation || ''}</span><span>${p.experience || ''}</span><span>${p.jobType}</span>
              <span style="color:var(--color-success);font-weight:500">考试合格${p.examScore != null ? ' ' + p.examScore + '分' : ''}</span>
              ${p.catlEhs ? '<span style="color:var(--color-success);font-weight:500">EHS已通过</span>' : ''}
            </div>
            <div class="detail-item-meta"><span>${p.phone || ''}</span><span>${p.startDate ? formatDate(p.startDate) : formatDate(p.filingDate)}</span></div>
            <div class="detail-item-meta"><span>编号: ${p.permitNo}</span><span>核验: ${p.verifyCount || 0}次</span><span>${p.issued ? '已发放' : '未发放'}</span></div>
            ${(p.jobTypes || []).filter(jt => jt.certName && jt.certNumber).length > 0 ? `
            <div class="detail-item-meta" style="color:var(--color-text-secondary);font-size:11px">
              ${(p.jobTypes || []).filter(jt => jt.certName && jt.certNumber).map(jt => `<span>${jt.type}证号: ${jt.certNumber}</span>`).join(' ')}
            </div>` : ''}
          </div>
          <div class="detail-item-actions">
            <button class="btn-icon-sm btn-view" data-action="view" data-id="${p.id}" title="查看证件">
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            </button>
            ${p.status !== '已离场' ? `<button class="btn-icon-sm btn-exit" data-action="exit" data-id="${p.id}" title="离场">
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
            </button>` : ''}
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'view') { Preview.show(id); }
        else if (action === 'exit') { this.exitPermit(id); }
      });
    });
  },

  async exitPermit(id) {
    const permit = await Store.getPermitById(id);
    if (!permit) return;
    const confirmed = await showConfirm('离场确认', `确认「${permit.name}」离场？离场后证件数据将被清空，不可恢复。`);
    if (!confirmed) return;
    showLoading('处理中...');
    await Store.exitPermit(id);
    hideLoading();
    showToast('离场成功，数据已清空', 'success');
    await this.renderList();
  },

  async exportCSV() {
    const permits = await this.getFilteredPermits();
    if (permits.length === 0) { showToast('没有可导出的数据', 'warning'); return; }

    const headers = ['证件编号', '姓名', '电话', '性别', '身份证号', '单位名称', '落站项目名称', '落站地点', '落站经验', '特种作业证书', '电工证号', '焊工证号', '高处作业证号', '司索工证号', '叉车证号', '安全员证号', '考试分数', '宁德时代EHS', '开始日期', '结束日期', '证件状态', '审核人', '审核时间', '核验次数', '发放状态'];
    const rows = permits.map(p => {
      const certNums = {};
      (p.jobTypes || []).forEach(jt => { if (jt.certNumber) certNums[jt.type] = jt.certNumber; });
      return [
        p.permitNo, p.name, p.phone || '', p.gender, p.idCardNo || '', p.unit, p.projectName || '', p.siteLocation || '', p.experience || '', p.jobType,
        certNums['电工'] || '', certNums['焊工'] || '', certNums['高处作业'] || '', certNums['司索工'] || '', certNums['叉车司机'] || '', certNums['安全员'] || '',
        p.examScore != null ? p.examScore : '', p.catlEhs ? '已通过' : '未提交',
        p.startDate ? formatDate(p.startDate) : formatDate(p.filingDate), formatDate(p.expiryDate),
        p.status, p.reviewedBy || '', p.reviewedAt ? formatDateTime(p.reviewedAt) : '', p.verifyCount || 0, p.issued ? '已发放' : '未发放'
      ];
    });

    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `证件明细_${formatDate(new Date().toISOString())}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
    showToast('导出成功', 'success');
  },

  async search() { await this.renderList(); },
};

// ==================== 证件审核 ====================

const Review = {
  async render() {
    await this.renderList();
    await updateReviewBadge();
  },

  async renderList() {
    const permits = await Store.getPendingPermits();
    const list = document.getElementById('review-list');
    document.getElementById('review-total').textContent = permits.length;
    await updateReviewBadge();

    if (permits.length === 0) {
      list.innerHTML = `<div class="empty-state">
          <svg viewBox="0 0 24 24" width="56" height="56"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
          <p>暂无待审核证件</p>
        </div>`;
      return;
    }

    list.innerHTML = permits.map(p => {
      const photoSrc = p.photo || '';
      return `
        <div class="review-item" data-id="${p.id}">
          <img class="review-item-photo" src="${photoSrc || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath fill=%22%23ccc%22 d=%22M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z%22/%3E%3C/svg%3E'}" alt="照片">
          <div class="review-item-info">
            <div class="review-item-name">${p.name}<span class="status-badge status-pending">待审核</span></div>
            <div class="review-item-meta"><span>${p.unit}</span><span>${p.projectName || ''}</span><span>${p.siteLocation || ''}</span><span>落站经验: ${p.experience || '-'}</span></div>
            <div class="review-item-meta"><span>${p.phone || ''}</span><span>身份证: ${p.idCardNo || '-'}</span></div>
            <div class="review-item-meta">
              <span>证书: ${p.jobType}</span>
              ${(p.jobTypes || []).filter(jt => jt.certName && jt.certNumber).length > 0 ? `<span style="font-size:11px">${(p.jobTypes || []).filter(jt => jt.certName && jt.certNumber).map(jt => jt.type + '证号:' + jt.certNumber).join(' ')}</span>` : ''}
              <span>考试: ${p.examScore != null ? p.examScore + '分' : '-'}</span>
              ${p.catlEhs ? '<span style="color:var(--color-success)">EHS: 已通过</span>' : '<span style="color:var(--color-danger)">EHS: 未提交</span>'}
            </div>
            <div class="review-item-meta"><span>编号: ${p.permitNo}</span><span>有效期: ${p.startDate ? formatDate(p.startDate) : '-'} ~ ${formatDate(p.expiryDate)}</span></div>
            <div class="review-item-meta"><span>提交时间: ${formatDateTime(p.filingDate)}</span></div>
          </div>
          <div class="review-item-actions">
            <button class="btn btn-primary btn-sm btn-approve" data-id="${p.id}">通过</button>
            <button class="btn btn-outline btn-sm btn-reject" data-id="${p.id}" style="color:var(--color-danger);border-color:var(--color-danger)">驳回</button>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.btn-approve').forEach(btn => {
      btn.addEventListener('click', () => this.approve(btn.dataset.id));
    });
    list.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', () => this.reject(btn.dataset.id));
    });
  },

  async approve(id) {
    const permit = await Store.getPermitById(id);
    if (!permit) return;
    const confirmed = await showConfirm('审核通过', `确认通过「${permit.name}」的入场证申请？`);
    if (!confirmed) return;

    if (Store._useApi) {
      try { await API.reviewPermit(id, 'approve'); } catch(e) { /* fallback */ }
    }
    const user = Store.getCurrentUser();
    await Store.updatePermit(id, {
      status: '有效', reviewedBy: user ? user.username : null, reviewedAt: new Date().toISOString(),
    });
    showToast('审核通过，证件已生效！', 'success');
    await this.renderList();
    if (document.getElementById('page-dashboard').classList.contains('active')) {
      await Dashboard.render();
    }
  },

  async reject(id) {
    const permit = await Store.getPermitById(id);
    if (!permit) return;
    const confirmed = await showConfirm('驳回确认', `确认驳回「${permit.name}」的入场证申请？驳回后用户可重新提交。`);
    if (!confirmed) return;

    if (Store._useApi) {
      try { await API.reviewPermit(id, 'reject'); } catch(e) { /* fallback */ }
    }
    const user = Store.getCurrentUser();
    await Store.updatePermit(id, {
      status: '已驳回', reviewedBy: user ? user.username : null, reviewedAt: new Date().toISOString(),
    });
    showToast('已驳回该申请', 'success');
    await this.renderList();
    if (document.getElementById('page-dashboard').classList.contains('active')) {
      await Dashboard.render();
    }
  },
};

async function updateReviewBadge() {
  const badge = document.getElementById('review-badge');
  if (!badge) return;
  const permits = await Store.getPendingPermits();
  const count = permits.length;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ==================== 拍照核验 ====================

const Verify = {
  photoDataUrl: null,
  stream: null,

  render() {
    this.reset();
    this.renderHistory();
  },

  reset() {
    this.stopCamera();
    this.photoDataUrl = null;
    document.getElementById('verify-photo').classList.add('hidden');
    document.getElementById('verify-photo').src = '';
    document.getElementById('verify-video').classList.add('hidden');
    document.getElementById('verify-placeholder').classList.remove('hidden');
    document.getElementById('verify-result').classList.add('hidden');
    document.getElementById('btn-verify-start').classList.add('hidden');
    document.getElementById('btn-verify-cancel').classList.add('hidden');
    document.getElementById('btn-verify-camera').classList.remove('hidden');
    document.getElementById('btn-verify-album').classList.remove('hidden');
    document.getElementById('file-verify-camera').value = '';
    document.getElementById('file-verify-album').value = '';
  },

  async startLiveCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }
      });
      const video = document.getElementById('verify-video');
      video.srcObject = this.stream;
      video.classList.remove('hidden');
      document.getElementById('verify-placeholder').classList.add('hidden');
      document.getElementById('verify-photo').classList.add('hidden');
      document.getElementById('btn-verify-camera').classList.add('hidden');
      document.getElementById('btn-verify-album').classList.add('hidden');
      document.getElementById('btn-verify-start').classList.remove('hidden');
      document.getElementById('btn-verify-start').innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> 拍摄';
      document.getElementById('btn-verify-cancel').classList.remove('hidden');
    } catch (err) {
      document.getElementById('file-verify-camera').click();
    }
  },

  captureFrame() {
    const video = document.getElementById('verify-video');
    if (!video.videoWidth) { showToast('摄像头未就绪，请重试', 'error'); return; }
    const canvas = document.getElementById('verify-canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    this.photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    this.stopCamera();
    document.getElementById('verify-photo').src = this.photoDataUrl;
    document.getElementById('verify-photo').classList.remove('hidden');
    document.getElementById('verify-video').classList.add('hidden');
    document.getElementById('btn-verify-start').innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> 开始识别';
  },

  stopCamera() {
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
  },

  async handlePhotoFile(file) {
    if (!file || !file.type.startsWith('image/')) { showToast('请选择图片文件', 'error'); return; }
    showLoading('处理图片中...');
    try {
      const { dataUrl } = await FaceModule.fileToImage(file);
      const compressed = await FaceModule.compressImage(dataUrl, 800, 0.85);
      this.photoDataUrl = compressed;
      this.stopCamera();
      document.getElementById('verify-photo').src = compressed;
      document.getElementById('verify-photo').classList.remove('hidden');
      document.getElementById('verify-video').classList.add('hidden');
      document.getElementById('verify-placeholder').classList.add('hidden');
      document.getElementById('btn-verify-camera').classList.add('hidden');
      document.getElementById('btn-verify-album').classList.add('hidden');
      document.getElementById('btn-verify-start').classList.remove('hidden');
      document.getElementById('btn-verify-start').innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> 开始识别';
      document.getElementById('btn-verify-cancel').classList.remove('hidden');
    } catch (e) { showToast('图片加载失败', 'error'); }
    hideLoading();
  },

  async startVerify() {
    if (this.stream) {
      this.captureFrame();
      if (!this.photoDataUrl) return;
      return;
    }

    if (!this.photoDataUrl) { showToast('请先拍照或选择照片', 'error'); return; }

    showLoading('AI识别中，请稍候...');
    document.getElementById('btn-verify-start').classList.add('hidden');

    try {
      await FaceModule.loadModels();
      const img = await FaceModule.dataUrlToImage(this.photoDataUrl);
      const result = await FaceModule.verifyAgainstDatabase(img);

      hideLoading();
      if (!result.success) { this.showResult({ matched: false, error: result.error }); return; }

      this.showResult(result);

      await Store.addVerification({
        id: Store.genId(),
        timestamp: new Date().toISOString(),
        photo: this.photoDataUrl,
        result: result.matched ? 'matched' : 'not_matched',
        matchedPermitId: result.permit ? result.permit.id : null,
        matchedName: result.permit ? result.permit.name : null,
        matchedUnit: result.permit ? result.permit.unit : null,
        similarity: result.similarity || 0,
      });

      if (result.matched && result.permit) {
        const permit = await Store.getPermitById(result.permit.id);
        if (permit) {
          if (Store._useApi) {
            try { await API.verifyPermit(permit.id); } catch(e) {}
          }
          await Store.updatePermit(permit.id, { verifyCount: (permit.verifyCount || 0) + 1 });
        }
      }

      this.renderHistory();
    } catch (e) {
      hideLoading();
      showToast('识别失败: ' + e.message, 'error');
      document.getElementById('btn-verify-start').classList.remove('hidden');
    }
  },

  showResult(result) {
    const container = document.getElementById('verify-result');
    container.classList.remove('hidden');

    if (result.matched) {
      const p = result.permit;
      const simPct = Math.round((result.similarity || 0) * 100);
      container.className = 'verify-result success';
      container.innerHTML = `
        <div class="verify-result-icon"><svg viewBox="0 0 24 24" width="36" height="36"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></div>
        <div class="verify-result-title">已备案</div>
        <div class="verify-result-detail">该人员已备案，相似度 ${simPct}%</div>
        ${p.photo ? `<img class="verify-result-photo" src="${p.photo}" alt="备案照片">` : ''}
        <div class="verify-result-info">
          <div class="verify-result-info-row"><span class="verify-result-info-label">姓名</span><span class="verify-result-info-value">${p.name}</span></div>
          <div class="verify-result-info-row"><span class="verify-result-info-label">电话</span><span class="verify-result-info-value">${p.phone || '-'}</span></div>
          <div class="verify-result-info-row"><span class="verify-result-info-label">身份证</span><span class="verify-result-info-value">${p.idCardNo || '-'}</span></div>
          <div class="verify-result-info-row"><span class="verify-result-info-label">单位</span><span class="verify-result-info-value">${p.unit}</span></div>
          <div class="verify-result-info-row"><span class="verify-result-info-label">项目</span><span class="verify-result-info-value">${p.projectName || '-'}</span></div>
          <div class="verify-result-info-row"><span class="verify-result-info-label">地点</span><span class="verify-result-info-value">${p.siteLocation || '-'}</span></div>
          <div class="verify-result-info-row"><span class="verify-result-info-label">考试</span><span class="verify-result-info-value" style="color:var(--color-success)">合格 ${p.examScore != null ? p.examScore + '分' : ''}</span></div>
          <div class="verify-result-info-row"><span class="verify-result-info-label">证书</span><span class="verify-result-info-value">${p.jobType}</span></div>
          <div class="verify-result-info-row"><span class="verify-result-info-label">状态</span><span class="verify-result-info-value" style="color:${p.status==='有效'?'var(--color-success)':(p.status==='待审核'?'var(--color-warning)':'var(--color-danger)')}">${p.status}</span></div>
          <div class="verify-result-info-row"><span class="verify-result-info-label">结束日期</span><span class="verify-result-info-value">${formatDate(p.expiryDate)}</span></div>
        </div>
        <button class="btn btn-primary btn-block" style="margin-top:12px" id="btn-view-permit-from-verify">查看证件</button>`;
      const viewBtn = document.getElementById('btn-view-permit-from-verify');
      if (viewBtn) viewBtn.addEventListener('click', () => Preview.show(p.id));
    } else {
      const simPct = result.bestSimilarity ? Math.round(result.bestSimilarity * 100) : 0;
      container.className = 'verify-result fail';
      container.innerHTML = `
        <div class="verify-result-icon"><svg viewBox="0 0 24 24" width="36" height="36"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></div>
        <div class="verify-result-title">未备案</div>
        <div class="verify-result-detail">${result.error || '该人员未在系统中备案'}</div>
        <button class="btn btn-primary btn-block" style="margin-top:12px" id="btn-goto-new-permit">立即办理入场证</button>`;
      const gotoBtn = document.getElementById('btn-goto-new-permit');
      if (gotoBtn) gotoBtn.addEventListener('click', () => { NewPermit.reset(); showPage('new-permit'); });
    }
  },

  async renderHistory() {
    const records = await Store.getVerifications();
    const list = document.getElementById('verify-history-list');
    document.getElementById('history-count').textContent = records.length + '条';

    if (records.length === 0) { list.innerHTML = '<div class="empty-state"><p>暂无核验记录</p></div>'; return; }

    list.innerHTML = records.slice(0, 20).map(r => `
      <div class="history-item">
        <img class="history-item-photo" src="${r.photo || ''}" alt="照片" onerror="this.style.display='none'">
        <div class="history-item-info">
          <div class="history-item-result" style="color: ${r.result === 'matched' ? 'var(--color-success)' : 'var(--color-danger)'}">
            ${r.result === 'matched' ? '已备案' : '未备案'}
            ${r.matchedName ? ' - ' + r.matchedName : ''}
          </div>
          <div class="history-item-time">${formatDateTime(r.timestamp)}</div>
        </div>
      </div>`).join('');
  },
};

// ==================== 设置页 ====================

const SettingsPage = {
  async render() {
    const user = Store.getCurrentUser();
    if (!user) return;

    document.getElementById('settings-username').textContent = user.username;
    document.getElementById('settings-role').textContent = user.role === 'admin' ? '管理员' : (user.unit || '普通用户');

    if (user.role === 'admin') {
      document.getElementById('admin-panel').classList.remove('hidden');
      document.getElementById('user-panel').classList.add('hidden');
      await this.renderUserList();
    } else {
      document.getElementById('admin-panel').classList.add('hidden');
      document.getElementById('user-panel').classList.remove('hidden');
    }

    this.generateCompanyQR();
  },

  async renderUserList() {
    const list = document.getElementById('user-list');
    list.innerHTML = '<div class="empty-state"><p>加载中...</p></div>';

    let users = [];
    try {
      users = (await Store.getUsers()).filter(u => u.role === 'user');
    } catch(e) {
      console.error('getUsers failed:', e);
      list.innerHTML = '<div class="empty-state"><p>加载失败，请重试</p></div>';
      return;
    }

    if (users.length === 0) { list.innerHTML = '<div class="empty-state"><p>暂无已开通账号</p></div>'; return; }

    list.innerHTML = users.map(u => `
      <div class="user-list-item">
        <div class="user-list-item-info">
          <div class="user-list-item-phone">${u.username}</div>
          <div class="user-list-item-unit">${u.unit || '未设置单位'}</div>
        </div>
        <button class="user-list-item-delete" data-id="${u.id}" title="删除">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>`).join('');

    list.querySelectorAll('.user-list-item-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const confirmed = await showConfirm('删除确认', '确认删除该用户账号？');
        if (confirmed) {
          await Auth.deleteUser(id);
          showToast('删除成功', 'success');
          await this.renderUserList();
        }
      });
    });
  },

  async createUser() {
    console.log('[createUser] clicked');
    const phoneEl = document.getElementById('new-user-phone');
    const pwdEl = document.getElementById('new-user-pwd');
    const unitEl = document.getElementById('new-user-unit');
    const btn = document.getElementById('btn-create-user');

    if (!phoneEl || !pwdEl || !unitEl || !btn) {
      console.error('[createUser] missing elements', { phoneEl: !!phoneEl, pwdEl: !!pwdEl, unitEl: !!unitEl, btn: !!btn });
      showToast('页面元素缺失，请刷新后重试', 'error');
      return;
    }

    const phone = phoneEl.value.trim();
    const pwd = pwdEl.value.trim();
    const unit = unitEl.value.trim();

    if (!phone) { showToast('请输入手机号', 'error'); return; }
    if (phone.length !== 11) { showToast('请输入正确的11位手机号', 'error'); return; }
    if (!pwd) { showToast('请设置初始密码', 'error'); return; }
    if (pwd.length < 4) { showToast('密码至少4位', 'error'); return; }
    if (!unit) { showToast('请输入单位名称', 'error'); return; }

    console.log('[createUser] params ok, phone=', phone, 'unit=', unit);

    // Loading state
    const origText = btn.textContent;
    btn.textContent = '开通中...';
    btn.disabled = true;

    try {
      const result = await Auth.createUser(phone, pwd, unit);
      console.log('[createUser] result=', result);
      if (result.success) {
        showToast('账号开通成功！', 'success');
        phoneEl.value = '';
        pwdEl.value = '';
        unitEl.value = '';
        await this.renderUserList();
      } else {
        showToast(result.msg || '创建失败', 'error');
      }
    } catch(e) {
      console.error('[createUser] error:', e);
      showToast('创建失败：' + (e.message || '未知错误'), 'error');
    } finally {
      btn.textContent = origText;
      btn.disabled = false;
    }
  },

  async changePassword() {
    const user = Store.getCurrentUser();
    if (!user) return;
    const oldPwd = document.getElementById('settings-old-pwd').value;
    const newPwd = document.getElementById('settings-new-pwd').value;
    const confirmPwd = document.getElementById('settings-confirm-pwd').value;

    if (newPwd !== confirmPwd) { showToast('两次输入的新密码不一致', 'error'); return; }
    const result = await Auth.changePassword(user.username, oldPwd, newPwd);
    if (result.success) {
      showToast('密码修改成功！', 'success');
      document.getElementById('settings-old-pwd').value = '';
      document.getElementById('settings-new-pwd').value = '';
      document.getElementById('settings-confirm-pwd').value = '';
    } else {
      showToast(result.msg, 'error');
    }
  },

  generateCompanyQR() {
    const container = document.getElementById('qrcode-container');
    if (!container || container.querySelector('canvas') || container.querySelector('img')) return;
    if (typeof QRCode === 'undefined') return;
    try {
      new QRCode(container, {
        text: 'https://8dc6137eb9314065854c7392081d4597.app.codebuddy.work/about.html',
        width: 88, height: 88,
        colorDark: '#0B3D91', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
    } catch (e) { console.warn('QR码生成失败:', e); }
  },
};

// ==================== 事件绑定 & 初始化 ====================

function bindEvents() {
  // ─── 登录页 ───
  document.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.login-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('login-' + tab.dataset.tab + '-panel').classList.add('active');
    });
  });

  document.getElementById('btn-login-user').addEventListener('click', async () => {
    const phone = document.getElementById('login-user-phone').value.trim();
    const pwd = document.getElementById('login-user-pwd').value;
    if (!phone || !pwd) { showToast('请填写完整信息', 'error'); return; }
    const result = await Auth.login(phone, pwd, 'user');
    if (result.success) { showToast('登录成功', 'success'); await showMainApp(); }
    else { showToast(result.msg, 'error'); }
  });

  document.getElementById('btn-login-admin').addEventListener('click', async () => {
    const name = document.getElementById('login-admin-name').value.trim();
    const pwd = document.getElementById('login-admin-pwd').value;
    if (!name || !pwd) { showToast('请填写完整信息', 'error'); return; }
    const result = await Auth.login(name, pwd, 'admin');
    if (result.success) { showToast('登录成功', 'success'); await showMainApp(); }
    else { showToast(result.msg, 'error'); }
  });

  document.getElementById('link-change-pwd').addEventListener('click', () => {
    document.querySelectorAll('.login-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('change-pwd-panel').classList.add('active');
  });

  document.getElementById('link-back-login').addEventListener('click', () => {
    document.querySelectorAll('.login-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('login-user-panel').classList.add('active');
  });

  document.getElementById('btn-change-pwd').addEventListener('click', async () => {
    const phone = document.getElementById('cpwd-phone').value.trim();
    const oldPwd = document.getElementById('cpwd-old').value;
    const newPwd = document.getElementById('cpwd-new').value;
    const confirmPwd = document.getElementById('cpwd-confirm').value;
    if (!phone || !oldPwd || !newPwd) { showToast('请填写完整信息', 'error'); return; }
    if (newPwd !== confirmPwd) { showToast('两次密码不一致', 'error'); return; }
    const result = await Auth.changePassword(phone, oldPwd, newPwd);
    if (result.success) {
      showToast('密码修改成功，请重新登录', 'success');
      document.querySelectorAll('.login-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('login-user-panel').classList.add('active');
      document.getElementById('cpwd-phone').value = '';
      document.getElementById('cpwd-old').value = '';
      document.getElementById('cpwd-new').value = '';
      document.getElementById('cpwd-confirm').value = '';
    } else { showToast(result.msg, 'error'); }
  });

  // ─── 底部导航 ───
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page === 'new-permit') NewPermit.reset();
      showPage(page);
    });
  });

  // ─── 首页 ───
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => showPage('details'));
  });

  document.getElementById('btn-add-permit').addEventListener('click', () => {
    NewPermit.reset();
    showPage('new-permit');
  });

  // ─── 新增入场证 ───
  document.getElementById('back-from-permit').addEventListener('click', () => showPage(getHomePage()));

  document.getElementById('btn-camera').addEventListener('click', () => document.getElementById('file-camera').click());
  document.getElementById('btn-album').addEventListener('click', () => document.getElementById('file-album').click());
  document.getElementById('btn-remove-photo').addEventListener('click', () => NewPermit.removePhoto());

  document.getElementById('file-camera').addEventListener('change', (e) => {
    if (e.target.files[0]) NewPermit.handlePhotoFile(e.target.files[0]);
  });
  document.getElementById('file-album').addEventListener('change', (e) => {
    if (e.target.files[0]) NewPermit.handlePhotoFile(e.target.files[0]);
  });

  document.getElementById('btn-submit-permit').addEventListener('click', () => NewPermit.submit());

  document.getElementById('permit-exam-score').addEventListener('input', (e) => {
    const score = parseInt(e.target.value, 10);
    const hint = document.getElementById('exam-score-hint');
    if (isNaN(score) || e.target.value === '') { hint.textContent = ''; hint.className = 'exam-score-hint'; }
    else if (score >= 80) { hint.textContent = '合格'; hint.className = 'exam-score-hint pass'; }
    else { hint.textContent = '不合格（需≥80分）'; hint.className = 'exam-score-hint fail'; }
  });

  document.querySelectorAll('.jobtype-chip').forEach(chip => {
    chip.addEventListener('click', () => NewPermit.toggleJobType(chip));
  });

  // ─── 证件预览 ───
  document.getElementById('back-from-preview').addEventListener('click', () => showPage(getHomePage()));
  document.getElementById('btn-download-permit').addEventListener('click', () => Preview.download());

  // ─── 明细页 ───
  document.getElementById('btn-detail-search').addEventListener('click', () => Details.search());
  document.getElementById('detail-search').addEventListener('keydown', (e) => { if (e.key === 'Enter') Details.search(); });
  document.getElementById('filter-status').addEventListener('change', () => Details.renderList());
  document.getElementById('filter-unit').addEventListener('change', () => Details.renderList());
  document.getElementById('filter-jobtype').addEventListener('change', () => Details.renderList());
  document.getElementById('btn-export-csv').addEventListener('click', () => Details.exportCSV());

  // ─── 核验页 ───
  document.getElementById('btn-verify-camera').addEventListener('click', () => Verify.startLiveCamera());
  document.getElementById('btn-verify-album').addEventListener('click', () => document.getElementById('file-verify-album').click());
  document.getElementById('btn-verify-start').addEventListener('click', () => Verify.startVerify());
  document.getElementById('btn-verify-cancel').addEventListener('click', () => Verify.reset());

  document.getElementById('file-verify-camera').addEventListener('change', (e) => {
    if (e.target.files[0]) Verify.handlePhotoFile(e.target.files[0]);
  });
  document.getElementById('file-verify-album').addEventListener('change', (e) => {
    if (e.target.files[0]) Verify.handlePhotoFile(e.target.files[0]);
  });

  // ─── 设置页 ───
  document.getElementById('btn-create-user').addEventListener('click', () => {
    Promise.resolve(SettingsPage.createUser()).catch(e => {
      console.error('[btn-create-user] handler error:', e);
      showToast('操作异常：' + (e && e.message || '未知错误'), 'error');
    });
  });
  document.getElementById('btn-settings-change-pwd').addEventListener('click', () => SettingsPage.changePassword());
  document.getElementById('btn-logout').addEventListener('click', () => Auth.logout());
  document.getElementById('btn-logout-user').addEventListener('click', () => Auth.logout());

  // ─── 文件上传 ───
  document.getElementById('file-idcard-front').addEventListener('change', (e) => {
    if (e.target.files[0]) NewPermit.handleIdCardFile('front', e.target.files[0]);
  });
  document.getElementById('file-idcard-back').addEventListener('change', (e) => {
    if (e.target.files[0]) NewPermit.handleIdCardFile('back', e.target.files[0]);
  });
  document.getElementById('file-exam-qrcode').addEventListener('change', (e) => {
    if (e.target.files[0]) NewPermit.handleExamQRCode(e.target.files[0]);
  });
  document.getElementById('file-catl-ehs').addEventListener('change', (e) => {
    if (e.target.files[0]) NewPermit.handleCatlEhs(e.target.files[0]);
  });

  // ─── 身份证移除按钮 ───
  document.getElementById('idcard-front-remove').addEventListener('click', () => NewPermit.removeIdCard('front'));
  document.getElementById('idcard-back-remove').addEventListener('click', () => NewPermit.removeIdCard('back'));
  document.getElementById('exam-qrcode-remove').addEventListener('click', () => NewPermit.removeExamQRCode());
  document.getElementById('catl-ehs-remove').addEventListener('click', () => NewPermit.removeCatlEhs());

  // ─── 幻灯片 ───
  document.getElementById('slideshow-close').addEventListener('click', () => Training.hideOverlay());
  document.getElementById('slideshow-prev').addEventListener('click', () => Training.prevSlide());
  document.getElementById('slideshow-next').addEventListener('click', () => Training.nextSlide());
}

// ==================== 启动 ====================

async function initApp() {
  showLoading('启动中...');

  // Safety timeout: force hide loading after 8 seconds no matter what
  const safetyTimer = setTimeout(() => {
    hideLoading();
    console.warn('initApp safety timeout triggered');
  }, 8000);

  try {
    // Bind events FIRST - never depend on network/Store.init
    try {
      bindEvents();
    } catch(e) {
      console.error('bindEvents failed:', e);
    }

    // Initialize store (detects API/Local mode)
    try {
      await Store.init();
    } catch(e) {
      console.warn('Store init failed:', e);
    }

    // Check if already logged in
    const savedUser = Store.getCurrentUser();
    if (savedUser) {
      // Show main app
      document.getElementById('page-login').classList.remove('active');
      document.getElementById('main-app').classList.remove('hidden');

      // Restore API auth if applicable
      if (Store._useApi) {
        try {
          const apiAuth = JSON.parse(localStorage.getItem('azt_api_auth') || 'null');
          if (apiAuth) {
            API.setAuth(apiAuth.phone, apiAuth.token);
          }
        } catch(e) {}
      }

      const isAdmin = savedUser.role === 'admin';
      const dashboardNav = document.querySelector('.nav-item[data-page="dashboard"]');
      const detailsNav = document.querySelector('.nav-item[data-page="details"]');
      const reviewNav = document.querySelector('.nav-item[data-page="review"]');
      const verifyNav = document.querySelector('.nav-item[data-page="verify"]');
      const backFromPermit = document.getElementById('back-from-permit');

      if (isAdmin) {
        if (dashboardNav) dashboardNav.classList.remove('hidden');
        if (detailsNav) detailsNav.classList.remove('hidden');
        if (reviewNav) reviewNav.classList.remove('hidden');
        if (verifyNav) verifyNav.classList.remove('hidden');
        if (backFromPermit) backFromPermit.classList.remove('hidden');
        try { await updateReviewBadge(); } catch(e) { console.warn('updateReviewBadge failed:', e); }
        try { await showPage('dashboard'); } catch(e) { console.warn('showPage dashboard failed:', e); }
      } else {
        if (dashboardNav) dashboardNav.classList.add('hidden');
        if (detailsNav) detailsNav.classList.add('hidden');
        if (reviewNav) reviewNav.classList.add('hidden');
        if (verifyNav) verifyNav.classList.add('hidden');
        if (backFromPermit) backFromPermit.classList.add('hidden');
        NewPermit.reset();
        showPage('new-permit');
      }

      FaceModule.loadModels().catch(() => {});
    }
  } catch(e) {
    console.error('initApp error:', e);
  } finally {
    clearTimeout(safetyTimer);
    hideLoading();
  }
}

document.addEventListener('DOMContentLoaded', initApp);
