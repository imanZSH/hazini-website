/**
 * Admin Panel Logic for Dr. Hazini and Mehr Golestan Association
 * Hybrid Architecture: Supports both Live Server API and Static GitHub Pages
 */

let IS_SERVER_MODE = true;
let currentTab = 'submissions';
let currentSubFilter = 'all';
let currentSubSearch = '';
let currentArtSearch = '';

let appData = {
  meta: {},
  services: [],
  pdfBooks: [],
  videos: [],
  reports: [],
  articles: [],
  brochures: [],
  submissions: []
};

// Check Authentication
const authToken = localStorage.getItem('hazini_admin_token') || sessionStorage.getItem('hazini_admin_token');
if (!authToken) {
  window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initModals();
  await initAppData();
  renderAllSections();
});

// Toast notification helper
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation');
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ----------------------------------------------------
// DATA INITIALIZATION & SYNC
// ----------------------------------------------------
async function initAppData() {
  const envBadge = document.getElementById('env-badge');
  const envText = document.getElementById('env-text');
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocalHost) {
    try {
      // 1. Try to fetch from Live Server API
      const res = await fetch('/api/submissions', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        IS_SERVER_MODE = true;
        const submissions = await res.json();
        
        const dataRes = await fetch('/api/data');
        const fullData = await dataRes.json();
        
        appData = {
          ...fullData,
          submissions: submissions || []
        };

        if (envBadge) {
          envBadge.className = 'mode-badge server';
          envText.innerHTML = '<i class="fa-solid fa-cloud-check"></i> سرور متصل است (Live API)';
        }
        return;
      }
    } catch (err) {
      console.log('Server API not accessible. Running in Static mode.');
    }
  }

  // 2. Static / GitHub Pages Mode
  IS_SERVER_MODE = false;
  if (envBadge) {
    envBadge.className = 'mode-badge static';
    envText.innerHTML = '<i class="fa-brands fa-github"></i> حالت آنلاین (GitHub Pages)';
  }

  // Load from localStorage or window.SITE_DATA
  const localSaved = localStorage.getItem('hazini_site_data');
  if (localSaved) {
    try {
      appData = JSON.parse(localSaved);
    } catch (e) {
      appData = window.SITE_DATA || {};
    }
  } else {
    appData = window.SITE_DATA ? JSON.parse(JSON.stringify(window.SITE_DATA)) : {};
  }

  // Check submissions in local storage
  const localSubs = localStorage.getItem('hazini_submissions');
  if (localSubs) {
    try {
      appData.submissions = JSON.parse(localSubs);
    } catch (e) {}
  } else if (!appData.submissions || appData.submissions.length === 0) {
    // Sample initial submissions for demo on GitHub Pages
    appData.submissions = [
      {
        id: 1,
        type: 'service',
        typeTitle: 'درخواست خدمات درمانی',
        date: '۱۴۰۳/۰۵/۲۸ - ۱۰:۳۰',
        patientName: 'رضا حسینی',
        phone: '09112700000',
        disease: 'سرطان ریه',
        serviceType: 'home-care',
        serviceTypeTitle: 'ویزیت و مراقبت در منزل',
        address: 'گرگان، خیابان ولیعصر، عدالت ۲۱',
        notes: 'بیمار نیاز فوری به اعزام پزشک جهت تسکین درد و تجویز آرام‌بخش دارد.',
        status: 'unread'
      },
      {
        id: 2,
        type: 'banner',
        typeTitle: 'سفارش بنر تسلیت',
        date: '۱۴۰۳/۰۵/۲۷ - ۱۶:۴۵',
        ordererName: 'مهندس احمدی',
        phone: '09113700000',
        deceasedName: 'حاج محمد حسینی',
        familyName: 'خاندان محترم حسینی و موسوی',
        location: 'مسجد جامع گرگان',
        ceremonyDate: 'پنج‌شنبه ۱ شهریور',
        ceremonyTime: '۱۶:۰۰ الی ۱۸:۰۰',
        bannerType: 'standing-single',
        bannerTypeTitle: 'استند ایستاده تک',
        status: 'unread'
      },
      {
        id: 3,
        type: 'volunteer',
        typeTitle: 'ثبت‌نام داوطلب',
        date: '۱۴۰۳/۰۵/۲۵ - ۱۱:۱۵',
        name: 'دکتر فاطمه محمدی',
        phone: '09111700000',
        job: 'پزشک عمومی',
        field: 'medical',
        fieldTitle: 'خدمات پزشکی و ویزیت در منزل',
        details: 'امکان اختصاص عصر روزهای پنج‌شنبه برای ویزیت بیماران در منزل.',
        status: 'read'
      },
      {
        id: 4,
        type: 'contact',
        typeTitle: 'تماس با ما',
        date: '۱۴۰۳/۰۵/۲۲ - ۰۹:۲۰',
        name: 'علی اکبری',
        phone: '09120000000',
        subject: 'consult',
        subjectTitle: 'مشاوره درمانی و طب تسکینی',
        message: 'با سلام، جهت دریافت وقت مشاوره تخصصی حضوری با جناب دکتر حزینی لطفا راهنمایی فرمایید.',
        status: 'read'
      }
    ];
    saveLocalData();
  }
}

function saveLocalData() {
  localStorage.setItem('hazini_site_data', JSON.stringify(appData));
  localStorage.setItem('hazini_submissions', JSON.stringify(appData.submissions || []));
}

// ----------------------------------------------------
// NAVIGATION & TABS
// ----------------------------------------------------
function initNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Logout button
  document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm('آیا از خروج از پنل اطمینان دارید؟')) {
      localStorage.removeItem('hazini_admin_token');
      sessionStorage.removeItem('hazini_admin_token');
      window.location.href = 'login.html';
    }
  });

  // Export Data Button
  document.getElementById('export-data-btn').addEventListener('click', openExportModal);

  // Quick Add Button
  document.getElementById('quick-add-btn').addEventListener('click', () => {
    if (currentTab === 'articles') openArticleModal();
    else if (currentTab === 'reports') openReportModal();
    else if (currentTab === 'videos') openVideoModal();
    else if (currentTab === 'brochures') openBrochureModal();
    else openArticleModal();
  });
}

function switchTab(tabId) {
  currentTab = tabId;

  // Update Sidebar Active state
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // Hide all tab sections
  document.querySelectorAll('.tab-content').forEach(sec => {
    sec.style.display = 'none';
    sec.classList.remove('active');
  });

  // Show selected tab section
  const targetSection = document.getElementById(`tab-${tabId}`);
  if (targetSection) {
    targetSection.style.display = 'block';
    targetSection.classList.add('active');
  }

  // Update Title in Topbar
  const titles = {
    submissions: '<i class="fa-solid fa-inbox"></i> صندوق پیام‌ها و فرم‌های ثبت‌شده',
    articles: '<i class="fa-solid fa-newspaper"></i> مدیریت مقالات و آموزش سلامت',
    reports: '<i class="fa-solid fa-file-pdf"></i> گزارش‌های عملکرد سالانه (اسناد PDF)',
    videos: '<i class="fa-solid fa-video"></i> رسانه و ویدیوهای آپارات',
    brochures: '<i class="fa-solid fa-book-medical"></i> کتب مرجع و بروشورهای آموزشی',
    settings: '<i class="fa-solid fa-sliders"></i> آمار صفحه اصلی و تنظیمات سایت'
  };
  document.getElementById('current-tab-title').innerHTML = titles[tabId] || 'داشبورد مدیریت';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ----------------------------------------------------
// RENDER ALL SECTIONS
// ----------------------------------------------------
function renderAllSections() {
  updateSummaryStats();
  renderSubmissions();
  renderArticles();
  renderReports();
  renderVideos();
  renderBrochures();
  renderSettingsForm();
}

function updateSummaryStats() {
  const subs = appData.submissions || [];
  const unreadCount = subs.filter(s => s.status === 'unread').length;

  document.getElementById('stat-unread-count').textContent = unreadCount.toLocaleString('fa-IR');
  document.getElementById('stat-articles-count').textContent = (appData.articles || []).length.toLocaleString('fa-IR');
  document.getElementById('stat-reports-count').textContent = (appData.reports || []).length.toLocaleString('fa-IR');
  document.getElementById('stat-videos-count').textContent = (appData.videos || []).length.toLocaleString('fa-IR');

  const badge = document.getElementById('unread-count-badge');
  if (unreadCount > 0) {
    badge.textContent = unreadCount.toLocaleString('fa-IR');
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// ====================================================
// 1. SUBMISSIONS & INBOX MODULE
// ====================================================
function renderSubmissions() {
  const tbody = document.getElementById('submissions-table-body');
  if (!tbody) return;

  const subs = appData.submissions || [];
  
  // Count by categories
  const countAll = subs.length;
  const countService = subs.filter(s => s.type === 'service').length;
  const countBanner = subs.filter(s => s.type === 'banner').length;
  const countVolunteer = subs.filter(s => s.type === 'volunteer').length;
  const countContact = subs.filter(s => s.type === 'contact').length;

  document.getElementById('count-all-sub').textContent = countAll.toLocaleString('fa-IR');
  document.getElementById('count-service-sub').textContent = countService.toLocaleString('fa-IR');
  document.getElementById('count-banner-sub').textContent = countBanner.toLocaleString('fa-IR');
  document.getElementById('count-volunteer-sub').textContent = countVolunteer.toLocaleString('fa-IR');
  document.getElementById('count-contact-sub').textContent = countContact.toLocaleString('fa-IR');

  // Filter
  let filtered = subs;
  if (currentSubFilter !== 'all') {
    filtered = filtered.filter(s => s.type === currentSubFilter);
  }

  if (currentSubSearch.trim() !== '') {
    const q = currentSubSearch.toLowerCase().trim();
    filtered = filtered.filter(s => {
      const name = (s.patientName || s.ordererName || s.name || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      const text = (s.notes || s.message || s.details || s.deceasedName || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || text.includes(q);
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-regular fa-folder-open" style="font-size: 2.5rem; margin-bottom: 10px; display: block; color: #CBD5E1;"></i>
          هیچ فرم یا پیامی در این دسته‌بندی یافت نشد.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((item, idx) => {
    const isUnread = item.status === 'unread';
    const name = item.patientName || item.ordererName || item.name || 'ثبت‌شده';
    const typeBadge = getTypeBadge(item.type, item.typeTitle);

    return `
      <tr class="${isUnread ? 'unread-row' : ''}">
        <td>${(idx + 1).toLocaleString('fa-IR')}</td>
        <td>${typeBadge}</td>
        <td><strong>${name}</strong></td>
        <td><a href="tel:${item.phone}" style="color: var(--primary); text-decoration: none; font-weight: bold;"><i class="fa-solid fa-phone" style="font-size: 0.8rem;"></i> ${item.phone}</a></td>
        <td style="font-size: 0.85rem; color: var(--text-muted);">${item.date || '-'}</td>
        <td>
          <span class="badge ${isUnread ? 'badge-danger' : 'badge-success'}">
            <i class="fa-solid ${isUnread ? 'fa-envelope' : 'fa-envelope-open'}"></i>
            ${isUnread ? 'خوانده نشده' : 'بررسی شده'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon view" title="مشاهده کامل جزئیات" onclick="openSubmissionModal(${item.id})">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-icon ${isUnread ? 'edit' : ''}" title="${isUnread ? 'علامت به عنوان بررسی شده' : 'علامت به عنوان خوانده‌نشده'}" onclick="toggleSubmissionStatus(${item.id})">
              <i class="fa-solid ${isUnread ? 'fa-check' : 'fa-rotate-left'}"></i>
            </button>
            <button class="btn-icon delete" title="حذف فرم" onclick="deleteSubmission(${item.id})">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getTypeBadge(type, title) {
  switch (type) {
    case 'service':
      return `<span class="badge badge-primary"><i class="fa-solid fa-hand-holding-medical"></i> ${title || 'درخواست خدمات'}</span>`;
    case 'banner':
      return `<span class="badge badge-warning"><i class="fa-solid fa-ribbon"></i> ${title || 'سفارش بنر'}</span>`;
    case 'volunteer':
      return `<span class="badge badge-success"><i class="fa-solid fa-heart"></i> ${title || 'ثبت‌نام داوطلب'}</span>`;
    case 'contact':
    default:
      return `<span class="badge badge-info"><i class="fa-solid fa-comment-dots"></i> ${title || 'تماس با ما'}</span>`;
  }
}

// Submission Filter listeners
document.querySelectorAll('#submission-filter-pills .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#submission-filter-pills .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSubFilter = btn.getAttribute('data-filter') || 'all';
    renderSubmissions();
  });
});

const subSearchInput = document.getElementById('submissions-search');
if (subSearchInput) {
  subSearchInput.addEventListener('input', (e) => {
    currentSubSearch = e.target.value;
    renderSubmissions();
  });
}

// View Submission Details Modal
function openSubmissionModal(id) {
  const item = (appData.submissions || []).find(s => s.id === id);
  if (!item) return;

  const modal = document.getElementById('modal-submission');
  const titleEl = document.getElementById('sub-modal-title');
  const bodyEl = document.getElementById('sub-modal-body');
  const footerEl = document.getElementById('sub-modal-footer');

  titleEl.innerHTML = `<i class="fa-solid fa-inbox"></i> جزئیات ${item.typeTitle || 'فرم'}`;

  let detailsHtml = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--border);">
      <div>
        ${getTypeBadge(item.type, item.typeTitle)}
        <span style="font-size: 0.85rem; color: var(--text-muted); margin-right: 12px;"><i class="fa-regular fa-clock"></i> تاریخ: ${item.date}</span>
      </div>
      <a href="tel:${item.phone}" class="btn btn-sm btn-primary">
        <i class="fa-solid fa-phone"></i> تماس با ${item.phone}
      </a>
    </div>
  `;

  if (item.type === 'service') {
    detailsHtml += `
      <div class="form-grid" style="font-size: 0.95rem;">
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>نام بیمار:</strong> ${item.patientName || '-'}</div>
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>تشخیص پزشکی:</strong> ${item.disease || '-'}</div>
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>نوع خدمت درخواستی:</strong> ${item.serviceTypeTitle || item.serviceType || '-'}</div>
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>شماره همراه:</strong> ${item.phone}</div>
        <div class="full" style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>آدرس سکونت:</strong> ${item.address || '-'}</div>
        <div class="full" style="background: #FFFBEB; padding: 14px; border-radius: 8px; border: 1px solid #FDE68A;">
          <strong>توضیحات و شرح حال بیمار:</strong>
          <p style="margin-top: 6px; color: #78350F; white-space: pre-wrap;">${item.notes || 'توضیحاتی درج نشده است.'}</p>
        </div>
      </div>
    `;
  } else if (item.type === 'banner') {
    detailsHtml += `
      <div class="form-grid" style="font-size: 0.95rem;">
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>سفارش‌دهنده:</strong> ${item.ordererName || '-'}</div>
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>شماره تماس:</strong> ${item.phone}</div>
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>نام متوفی گرامی:</strong> ${item.deceasedName || '-'}</div>
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>خاندان معزا:</strong> ${item.familyName || '-'}</div>
        <div class="full" style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>محل و مسجد مراسم:</strong> ${item.location || '-'}</div>
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>تاریخ مراسم:</strong> ${item.ceremonyDate || '-'}</div>
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>ساعت مراسم:</strong> ${item.ceremonyTime || '-'}</div>
        <div class="full" style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>طرح انتخابی استند:</strong> ${item.bannerTypeTitle || item.bannerType || '-'}</div>
      </div>
    `;
  } else if (item.type === 'volunteer') {
    detailsHtml += `
      <div class="form-grid" style="font-size: 0.95rem;">
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>نام داوطلب:</strong> ${item.name || '-'}</div>
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>شغل و تخصص:</strong> ${item.job || '-'}</div>
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>حوزه همکاری:</strong> ${item.fieldTitle || item.field || '-'}</div>
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>شماره همراه:</strong> ${item.phone}</div>
        <div class="full" style="background: #F8FAFC; padding: 14px; border-radius: 8px;">
          <strong>توضیحات و زمان‌های آزاد:</strong>
          <p style="margin-top: 6px; white-space: pre-wrap;">${item.details || 'توضیحی درج نشده است.'}</p>
        </div>
      </div>
    `;
  } else {
    detailsHtml += `
      <div class="form-grid" style="font-size: 0.95rem;">
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>نام فرستنده:</strong> ${item.name || '-'}</div>
        <div style="background: #F8FAFC; padding: 14px; border-radius: 8px;"><strong>موضوع پیام:</strong> ${item.subjectTitle || item.subject || '-'}</div>
        <div class="full" style="background: #F8FAFC; padding: 14px; border-radius: 8px;">
          <strong>متن پیام:</strong>
          <p style="margin-top: 6px; white-space: pre-wrap;">${item.message || '-'}</p>
        </div>
      </div>
    `;
  }

  bodyEl.innerHTML = detailsHtml;

  footerEl.innerHTML = `
    <button class="btn btn-secondary" onclick="closeAdminModal('modal-submission')">بستن</button>
    <button class="btn btn-success" onclick="toggleSubmissionStatus(${item.id}); closeAdminModal('modal-submission');">
      <i class="fa-solid fa-check"></i> ${item.status === 'unread' ? 'علامت به عنوان بررسی شده' : 'علامت به عنوان خوانده‌نشده'}
    </button>
  `;

  modal.classList.add('active');
}

async function toggleSubmissionStatus(id) {
  const item = (appData.submissions || []).find(s => s.id === id);
  if (!item) return;

  const newStatus = item.status === 'unread' ? 'read' : 'unread';

  if (IS_SERVER_MODE) {
    try {
      await fetch(`/api/submissions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error(e);
    }
  }

  item.status = newStatus;
  saveLocalData();
  renderSubmissions();
  updateSummaryStats();
  showToast('وضعیت فرم با موفقیت به‌روزرسانی شد.', 'success');
}

async function deleteSubmission(id) {
  if (!confirm('آیا از حذف این فرم از صندوق اطمینان دارید؟')) return;

  if (IS_SERVER_MODE) {
    try {
      await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (e) {
      console.error(e);
    }
  }

  appData.submissions = (appData.submissions || []).filter(s => s.id !== id);
  saveLocalData();
  renderSubmissions();
  updateSummaryStats();
  showToast('فرم با موفقیت حذف شد.', 'success');
}

// ====================================================
// 2. ARTICLES MODULE
// ====================================================
function renderArticles() {
  const tbody = document.getElementById('articles-table-body');
  if (!tbody) return;

  const articles = appData.articles || [];
  let filtered = articles;

  if (currentArtSearch.trim() !== '') {
    const q = currentArtSearch.toLowerCase().trim();
    filtered = filtered.filter(a => (a.title || '').toLowerCase().includes(q) || (a.category || '').toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
          مقاله‌ای یافت نشد.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((a, idx) => `
    <tr>
      <td>
        <img src="${a.image || '../assets/images/100-15-600x400.jpg'}" style="width: 50px; height: 40px; border-radius: 6px; object-fit: cover;" onerror="this.src='../assets/images/100-15-600x400.jpg'">
      </td>
      <td>
        <strong>${a.title}</strong>
        ${a.aparatId ? `<br><small style="color: var(--accent);"><i class="fa-solid fa-video"></i> آپارات: ${a.aparatId}</small>` : ''}
      </td>
      <td><span class="badge badge-primary">${a.category || '-'}</span></td>
      <td style="font-size: 0.85rem; color: var(--text-muted);">${a.date || '-'}</td>
      <td>
        ${a.pdfFile ? `<a href="${a.pdfFile}" target="_blank" class="badge badge-danger"><i class="fa-solid fa-file-pdf"></i> PDF</a>` : '-'}
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-icon edit" title="ویرایش" onclick="editArticleModal(${a.id})">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon delete" title="حذف" onclick="deleteArticle(${a.id})">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

const artSearchInp = document.getElementById('articles-search');
if (artSearchInp) {
  artSearchInp.addEventListener('input', (e) => {
    currentArtSearch = e.target.value;
    renderArticles();
  });
}

function openArticleModal() {
  document.getElementById('article-form').reset();
  document.getElementById('art-id').value = '';
  document.getElementById('article-modal-title').innerHTML = '<i class="fa-solid fa-plus"></i> افزودن مقاله جدید';
  document.getElementById('art-date').value = getPersianDateNow();
  document.getElementById('modal-article').classList.add('active');
}

function editArticleModal(id) {
  const a = (appData.articles || []).find(item => item.id === id);
  if (!a) return;

  document.getElementById('art-id').value = a.id;
  document.getElementById('art-title').value = a.title || '';
  document.getElementById('art-category').value = a.category || 'مقالات و آموزش سلامت';
  document.getElementById('art-date').value = a.date || '';
  document.getElementById('art-summary').value = a.summary || '';
  document.getElementById('art-content').value = a.content || '';
  document.getElementById('art-aparat').value = a.aparatId || '';

  document.getElementById('article-modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> ویرایش مقاله';
  document.getElementById('modal-article').classList.add('active');
}

document.getElementById('article-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('art-id').value;
  const isEdit = Boolean(id);

  const title = document.getElementById('art-title').value.trim();
  const category = document.getElementById('art-category').value;
  const date = document.getElementById('art-date').value.trim() || getPersianDateNow();
  const summary = document.getElementById('art-summary').value.trim();
  const content = document.getElementById('art-content').value.trim();
  const aparatId = document.getElementById('art-aparat').value.trim() || null;
  const imgFile = document.getElementById('art-image-file').files[0];
  const pdfFile = document.getElementById('art-pdf-file').files[0];

  if (IS_SERVER_MODE) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('date', date);
    formData.append('summary', summary);
    formData.append('content', content);
    if (aparatId) formData.append('aparatId', aparatId);
    if (imgFile) formData.append('imageFile', imgFile);
    if (pdfFile) formData.append('pdfAttachment', pdfFile);

    try {
      const url = isEdit ? `/api/articles/${id}` : '/api/articles';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast(isEdit ? 'مقاله با موفقیت ویرایش شد.' : 'مقاله جدید با موفقیت ذخیره شد.', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Update locally
  if (isEdit) {
    const art = (appData.articles || []).find(a => a.id === parseInt(id, 10));
    if (art) {
      art.title = title;
      art.category = category;
      art.date = date;
      art.summary = summary;
      art.content = content;
      art.aparatId = aparatId;
    }
  } else {
    const newId = appData.articles.length > 0 ? Math.max(...appData.articles.map(a => a.id || 0)) + 1 : 1;
    appData.articles.unshift({
      id: newId,
      title,
      category,
      date,
      summary,
      content,
      aparatId,
      image: 'assets/images/100-15-600x400.jpg',
      pdfFile: null
    });
  }

  saveLocalData();
  closeAdminModal('modal-article');
  renderArticles();
  updateSummaryStats();
  if (!IS_SERVER_MODE) showToast('مقاله در حافظه ذخیره شد. برای اعمال روی گیت‌هاب دکمه خروجی را بزنید.', 'success');
});

async function deleteArticle(id) {
  if (!confirm('آیا از حذف این مقاله اطمینان دارید؟')) return;

  if (IS_SERVER_MODE) {
    try {
      await fetch(`/api/articles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (e) {}
  }

  appData.articles = (appData.articles || []).filter(a => a.id !== id);
  saveLocalData();
  renderArticles();
  updateSummaryStats();
  showToast('مقاله با موفقیت حذف شد.', 'success');
}

// ====================================================
// 3. REPORTS MODULE
// ====================================================
function renderReports() {
  const tbody = document.getElementById('reports-table-body');
  if (!tbody) return;

  const reports = appData.reports || [];
  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">گزارشی ثبت نشده است.</td></tr>`;
    return;
  }

  tbody.innerHTML = reports.map(r => `
    <tr>
      <td><span class="badge badge-primary">${r.year || '-'}</span></td>
      <td><strong>${r.title}</strong></td>
      <td><code style="background: #F1F5F9; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">${r.fileName || 'report.pdf'}</code> (${r.size || '-'})</td>
      <td style="font-size: 0.85rem; color: var(--text-muted); max-width: 300px;">${r.desc || '-'}</td>
      <td>
        <a href="../${r.file}" target="_blank" class="btn btn-outline btn-sm">
          <i class="fa-solid fa-download"></i> دانلود
        </a>
      </td>
      <td>
        <button class="btn-icon delete" title="حذف" onclick="deleteReport(${r.id})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function openReportModal() {
  document.getElementById('report-form').reset();
  document.getElementById('modal-report').classList.add('active');
}

document.getElementById('report-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('rep-title').value.trim();
  const year = document.getElementById('rep-year').value.trim();
  const type = document.getElementById('rep-type').value;
  const desc = document.getElementById('rep-desc').value.trim();
  const file = document.getElementById('rep-file').files[0];

  if (!file && IS_SERVER_MODE) {
    alert('لطفاً فایل PDF گزارش را انتخاب نمایید.');
    return;
  }

  if (IS_SERVER_MODE) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('year', year);
    formData.append('type', type);
    formData.append('desc', desc);
    if (file) formData.append('reportPdf', file);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast('گزارش عملکرد با موفقیت بارگذاری شد.', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  }

  const newId = appData.reports.length > 0 ? Math.max(...appData.reports.map(r => r.id || 0)) + 1 : 1;
  appData.reports.unshift({
    id: newId,
    title,
    year,
    type,
    desc,
    file: file ? `assets/reports/${file.name}` : 'assets/reports/report.pdf',
    fileName: file ? file.name : 'report.pdf',
    size: '۱ MB'
  });

  saveLocalData();
  closeAdminModal('modal-report');
  renderReports();
  updateSummaryStats();
  if (!IS_SERVER_MODE) showToast('گزارش اضافه شد. برای اعمال روی گیت‌هاب دکمه خروجی را بزنید.', 'success');
});

async function deleteReport(id) {
  if (!confirm('آیا از حذف این گزارش عملکرد اطمینان دارید؟')) return;

  if (IS_SERVER_MODE) {
    try {
      await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (e) {}
  }

  appData.reports = (appData.reports || []).filter(r => r.id !== id);
  saveLocalData();
  renderReports();
  updateSummaryStats();
  showToast('گزارش با موفقیت حذف شد.', 'success');
}

// ====================================================
// 4. VIDEOS MODULE
// ====================================================
function renderVideos() {
  const tbody = document.getElementById('videos-table-body');
  if (!tbody) return;

  const videos = appData.videos || [];
  if (videos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">ویدیویی ثبت نشده است.</td></tr>`;
    return;
  }

  tbody.innerHTML = videos.map(v => `
    <tr>
      <td>
        <img src="${v.image ? '../' + v.image : '../assets/images/mmmm-600x400.jpg'}" style="width: 60px; height: 42px; border-radius: 6px; object-fit: cover;" onerror="this.src='../assets/images/mmmm-600x400.jpg'">
      </td>
      <td>
        <strong>${v.title}</strong>
        ${v.subtitle ? `<br><small style="color: var(--text-muted);">${v.subtitle}</small>` : ''}
      </td>
      <td><a href="https://www.aparat.com/v/${v.aparatId}" target="_blank" class="badge badge-warning"><i class="fa-solid fa-play"></i> ${v.aparatId}</a></td>
      <td style="font-size: 0.85rem; color: var(--text-muted);">${v.date || '-'}</td>
      <td>
        <button class="btn-icon delete" title="حذف" onclick="deleteVideo(${v.id})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function openVideoModal() {
  document.getElementById('video-form').reset();
  document.getElementById('vid-date').value = getPersianDateNow();
  document.getElementById('modal-video').classList.add('active');
}

document.getElementById('video-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('vid-title').value.trim();
  const subtitle = document.getElementById('vid-subtitle').value.trim();
  const aparatId = document.getElementById('vid-aparat').value.trim();
  const date = document.getElementById('vid-date').value.trim() || getPersianDateNow();
  const file = document.getElementById('vid-thumb-file').files[0];

  if (IS_SERVER_MODE) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('subtitle', subtitle);
    formData.append('aparatId', aparatId);
    formData.append('date', date);
    if (file) formData.append('thumbFile', file);

    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast('ویدیو با موفقیت افزوده شد.', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  }

  const newId = appData.videos.length > 0 ? Math.max(...appData.videos.map(v => v.id || 0)) + 1 : 1;
  appData.videos.unshift({
    id: newId,
    title,
    subtitle,
    aparatId,
    date,
    image: 'assets/images/mmmm-600x400.jpg'
  });

  saveLocalData();
  closeAdminModal('modal-video');
  renderVideos();
  updateSummaryStats();
  if (!IS_SERVER_MODE) showToast('ویدیو ذخیره شد. برای اعمال روی گیت‌هاب دکمه خروجی را بزنید.', 'success');
});

async function deleteVideo(id) {
  if (!confirm('آیا از حذف این ویدیو اطمینان دارید؟')) return;

  if (IS_SERVER_MODE) {
    try {
      await fetch(`/api/videos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (e) {}
  }

  appData.videos = (appData.videos || []).filter(v => v.id !== id);
  saveLocalData();
  renderVideos();
  updateSummaryStats();
  showToast('ویدیو با موفقیت حذف شد.', 'success');
}

// ====================================================
// 5. BROCHURES & BOOKS MODULE
// ====================================================
function renderBrochures() {
  const tbody = document.getElementById('brochures-table-body');
  if (!tbody) return;

  const list = [];
  (appData.brochures || []).forEach(b => list.push({ ...b, docKind: 'بروشور' }));
  (appData.pdfBooks || []).forEach(k => list.push({ ...k, docKind: 'کتاب مرجع' }));

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">فایلی ثبت نشده است.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td>
        <span class="badge ${item.docKind === 'کتاب مرجع' ? 'badge-danger' : 'badge-info'}">
          <i class="fa-solid ${item.docKind === 'کتاب مرجع' ? 'fa-book' : 'fa-file-word'}"></i> ${item.docKind}
        </span>
      </td>
      <td><strong>${item.title}</strong></td>
      <td>${item.author || item.category || '-'}</td>
      <td style="font-size: 0.85rem; color: var(--text-muted);">${item.size || '-'}</td>
      <td>
        <a href="../${item.file}" target="_blank" class="btn btn-outline btn-sm">
          <i class="fa-solid fa-download"></i> دانلود
        </a>
      </td>
      <td>
        <button class="btn-icon delete" title="حذف" onclick="deleteBrochureOrBook('${item.docKind}', ${item.id})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function openBrochureModal() {
  document.getElementById('brochure-form').reset();
  document.getElementById('modal-brochure').classList.add('active');
}

document.getElementById('brochure-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const docType = document.getElementById('doc-type-select').value;
  const category = document.getElementById('doc-category').value.trim() || 'آموزش سلامت';
  const title = document.getElementById('doc-title').value.trim();
  const author = document.getElementById('doc-author').value.trim();
  const desc = document.getElementById('doc-desc').value.trim();
  const file = document.getElementById('doc-file').files[0];

  if (IS_SERVER_MODE) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('desc', desc);
    if (docType === 'book') {
      formData.append('author', author);
      if (file) formData.append('bookPdf', file);
    } else {
      formData.append('category', category);
      if (file) formData.append('docFile', file);
    }

    try {
      const endpoint = docType === 'book' ? '/api/pdf-books' : '/api/brochures';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast('سند با موفقیت افزوده شد.', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (docType === 'book') {
    if (!appData.pdfBooks) appData.pdfBooks = [];
    const newId = appData.pdfBooks.length > 0 ? Math.max(...appData.pdfBooks.map(k => k.id || 0)) + 1 : 1;
    appData.pdfBooks.unshift({
      id: newId,
      title,
      author: author || 'دکتر عبدالرحیم حزینی',
      dateShamsi: getPersianDateNow(),
      size: '۱ MB',
      desc,
      file: file ? `assets/docs/${file.name}` : 'assets/docs/book.pdf'
    });
  } else {
    if (!appData.brochures) appData.brochures = [];
    const newId = appData.brochures.length > 0 ? Math.max(...appData.brochures.map(b => b.id || 0)) + 1 : 1;
    appData.brochures.unshift({
      id: newId,
      title,
      category,
      fileName: file ? file.name : 'brochure.docx',
      file: file ? `assets/docs/${file.name}` : 'assets/docs/brochure.docx',
      size: '۱۰۰ KB',
      desc
    });
  }

  saveLocalData();
  closeAdminModal('modal-brochure');
  renderBrochures();
  if (!IS_SERVER_MODE) showToast('فایل ذخیره شد. برای اعمال روی گیت‌هاب دکمه خروجی را بزنید.', 'success');
});

async function deleteBrochureOrBook(kind, id) {
  if (!confirm(`آیا از حذف این ${kind} اطمینان دارید؟`)) return;

  if (IS_SERVER_MODE) {
    try {
      const endpoint = kind === 'کتاب مرجع' ? `/api/pdf-books/${id}` : `/api/brochures/${id}`;
      await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (e) {}
  }

  if (kind === 'کتاب مرجع') {
    appData.pdfBooks = (appData.pdfBooks || []).filter(k => k.id !== id);
  } else {
    appData.brochures = (appData.brochures || []).filter(b => b.id !== id);
  }

  saveLocalData();
  renderBrochures();
  showToast(`${kind} با موفقیت حذف شد.`, 'success');
}

// ====================================================
// 6. SETTINGS & STATS MODULE
// ====================================================
function renderSettingsForm() {
  const meta = appData.meta || {};
  const stats = meta.stats || {};

  document.getElementById('stat-inp-patients').value = stats.patients || '+۵,۰۰۰';
  document.getElementById('stat-inp-visits').value = stats.homeVisits || '+۱۲,۰۰۰';
  document.getElementById('stat-inp-years').value = stats.years || '۱۰+';
  document.getElementById('stat-inp-volunteers').value = stats.volunteers || '+۱۵۰';

  document.getElementById('setting-phone1').value = meta.phone1 || '01732229007';
  document.getElementById('setting-phone2').value = meta.phone2 || '01732224414';
  document.getElementById('setting-email').value = meta.email || 'info@hazini.ir';
  document.getElementById('setting-instagram').value = meta.instagram || 'https://www.instagram.com/golestancancer/';
  document.getElementById('setting-address').value = meta.address || 'استان گلستان، گرگان، کانون حامیان بیماران سرطانی و صعب‌العلاج مهر گلستان';
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const newMeta = {
    phone1: document.getElementById('setting-phone1').value.trim(),
    phone2: document.getElementById('setting-phone2').value.trim(),
    email: document.getElementById('setting-email').value.trim(),
    instagram: document.getElementById('setting-instagram').value.trim(),
    address: document.getElementById('setting-address').value.trim()
  };

  const newStats = {
    patients: document.getElementById('stat-inp-patients').value.trim(),
    homeVisits: document.getElementById('stat-inp-visits').value.trim(),
    years: document.getElementById('stat-inp-years').value.trim(),
    volunteers: document.getElementById('stat-inp-volunteers').value.trim()
  };

  if (IS_SERVER_MODE) {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ meta: newMeta, stats: newStats })
      });
    } catch (err) {}
  }

  appData.meta = { ...appData.meta, ...newMeta, stats: { ...appData.meta.stats, ...newStats } };
  saveLocalData();
  showToast('آمار و تنظیمات سایت با موفقیت به‌روزرسانی شد.', 'success');
});

// Change Password
document.getElementById('change-pass-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const curPass = document.getElementById('cur-pass').value.trim();
  const newPass = document.getElementById('new-pass').value.trim();

  if (IS_SERVER_MODE) {
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ currentPassword: curPass, newPassword: newPass })
      });
      const data = await res.json();
      if (data.success) {
        showToast('رمز عبور با موفقیت تغییر یافت.', 'success');
        document.getElementById('change-pass-form').reset();
      } else {
        alert(data.message || 'خطا در تغییر رمز عبور.');
      }
      return;
    } catch (e) {}
  }

  localStorage.setItem('hazini_custom_admin_password', newPass);
  showToast('رمز عبور با موفقیت تغییر کرد.', 'success');
  document.getElementById('change-pass-form').reset();
});

// ====================================================
// 7. EXPORT DATA (FOR GITHUB PAGES SYNC)
// ====================================================
function openExportModal() {
  const modal = document.getElementById('modal-export');
  const preview = document.getElementById('export-json-preview');
  
  const cleanData = JSON.parse(JSON.stringify(appData));
  delete cleanData.adminConfig;

  preview.value = JSON.stringify(cleanData, null, 2);
  modal.classList.add('active');
}

function downloadExportFile(filename) {
  const cleanData = JSON.parse(JSON.stringify(appData));
  delete cleanData.adminConfig;

  let content = '';
  let mimeType = 'text/plain';

  if (filename === 'data.js') {
    content = `/**\n * Data store for Dr. Hazini and Mehr Golestan Association\n * Exported from Admin Panel\n */\nwindow.SITE_DATA = ${JSON.stringify(cleanData, null, 2)};\n`;
    mimeType = 'application/javascript';
  } else {
    content = JSON.stringify(cleanData, null, 2);
    mimeType = 'application/json';
  }

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`فایل ${filename} با موفقیت دانلود شد.`, 'success');
}

function copyExportToClipboard() {
  const preview = document.getElementById('export-json-preview');
  preview.select();
  navigator.clipboard.writeText(preview.value);
  showToast('داده‌ها با موفقیت در کلیپ‌بورد کپی شد.', 'success');
}

// ====================================================
// MODAL HELPERS & UTILITIES
// ====================================================
function initModals() {
  document.querySelectorAll('.admin-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.admin-modal-overlay').forEach(o => o.classList.remove('active'));
    }
  });
}

function closeAdminModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function getPersianDateNow() {
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return formatter.format(new Date());
  } catch (e) {
    return '۱۴۰۳';
  }
}
