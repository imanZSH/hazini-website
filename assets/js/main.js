/**
 * Main Interactive Script for Dr. Hazini and Mehr Golestan Foundation
 */

document.addEventListener('DOMContentLoaded', async () => {
  await initLiveSiteData();
  initMobileNav();
  highlightActiveNav();
  initStatsCounter();
  initArticleFilters();
  initModals();
  initForms();
});

async function initLiveSiteData() {
  // Check LocalStorage override first (for GitHub Pages testing)
  const localSaved = localStorage.getItem('hazini_site_data');
  if (localSaved) {
    try {
      window.SITE_DATA = JSON.parse(localSaved);
    } catch (e) {}
  }

  // Try fetching fresh data from Live Server API if running on server
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const freshData = await res.json();
      window.SITE_DATA = freshData;
    }
  } catch (err) {
    // Running statically (GitHub Pages) - window.SITE_DATA remains default or local
  }
}

// Toast notification manager
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// 1. Mobile Navigation
function initMobileNav() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      const isOpen = navLinks.classList.contains('mobile-open');
      if (isOpen) {
        navLinks.classList.remove('mobile-open');
        menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
      } else {
        navLinks.classList.add('mobile-open');
        menuBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      }
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
        menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
      });
    });
  }
}

// 2. Active Page Highlighter
function highlightActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// 3. Stats Counter Animation
function initStatsCounter() {
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  if (!statNumbers.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'), 10);
        const suffix = el.getAttribute('data-suffix') || '';
        const prefix = el.getAttribute('data-prefix') || '';
        
        let start = 0;
        const duration = 1800;
        const stepTime = 20;
        const totalSteps = duration / stepTime;
        const stepIncrement = target / totalSteps;

        const timer = setInterval(() => {
          start += stepIncrement;
          if (start >= target) {
            el.textContent = `${prefix}${target.toLocaleString('fa-IR')}${suffix}`;
            clearInterval(timer);
          } else {
            el.textContent = `${prefix}${Math.floor(start).toLocaleString('fa-IR')}${suffix}`;
          }
        }, stepTime);

        observer.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  statNumbers.forEach(num => observer.observe(num));
}

// 4. Articles Filtering & Search
function initArticleFilters() {
  const grid = document.getElementById('articles-grid');
  const searchInput = document.getElementById('article-search');
  const pills = document.querySelectorAll('.filter-pill');

  if (!grid || !window.SITE_DATA) return;

  const allArticles = window.SITE_DATA.articles || [];
  let currentCategory = 'all';
  let currentSearch = '';

  function renderArticles() {
    let filtered = allArticles;

    if (currentCategory !== 'all') {
      filtered = filtered.filter(a => a.category === currentCategory);
    }

    if (currentSearch.trim() !== '') {
      const q = currentSearch.toLowerCase().trim();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.content.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: #fff; border-radius: 16px; border: 1px dashed var(--border);">
          <i class="fa-solid fa-magnifying-glass" style="font-size: 3rem; color: var(--text-light); margin-bottom: 16px;"></i>
          <h4 style="font-weight: 800; margin-bottom: 8px;">موردی با این مشخصات یافت نشد</h4>
          <p style="color: var(--text-muted);">لطفاً واژه جستجو یا دسته‌بندی دیگری را امتحان کنید.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(a => `
      <div class="article-card">
        <div class="article-thumb">
          <img src="${a.image}" alt="${a.title}" onerror="this.src='assets/images/100-15-600x400.jpg'" loading="lazy">
          <span class="article-category">${a.category}</span>
        </div>
        <div class="article-body">
          <div class="article-date">
            <i class="fa-regular fa-calendar-check"></i>
            <span>${a.date}</span>
          </div>
          <h3 class="article-title">${a.title}</h3>
          <p class="article-snippet">${a.summary}</p>
          <div class="article-footer">
            <button class="btn btn-outline btn-sm" onclick="openArticleModal(${a.id})">
              <i class="fa-solid fa-book-open"></i> مطالعه کامل
            </button>
            ${a.pdfFile ? `
              <a href="${a.pdfFile}" class="btn btn-accent btn-sm" download>
                <i class="fa-solid fa-file-pdf"></i> دانلود PDF
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  // Initial Render
  renderArticles();

  // Search Listener
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderArticles();
    });
  }

  // Category Pills
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.getAttribute('data-category') || 'all';
      renderArticles();
    });
  });
}

// 5. Modals (Article Reader & Video Player)
function initModals() {
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');

  if (overlay && closeBtn) {
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    const container = document.getElementById('modal-body-container');
    if (container) container.innerHTML = '';
  }
}

function openArticleModal(id) {
  if (!window.SITE_DATA) return;
  const article = window.SITE_DATA.articles.find(a => a.id === id);
  if (!article) return;

  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-body-container');
  if (!overlay || !container) return;

  // Format paragraphs
  const paragraphs = article.content.split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => {
      if (p.startsWith('###')) {
        return `<h4 style="font-weight: 800; color: var(--primary-dark); margin: 24px 0 10px;">${p.replace('###', '').trim()}</h4>`;
      }
      return `<p>${p}</p>`;
    }).join('');

  container.innerHTML = `
    <div class="modal-article-header">
      <span class="badge badge-primary" style="margin-bottom: 10px;">${article.category}</span>
      <h2 class="modal-article-title">${article.title}</h2>
      <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 14px;">
        <span><i class="fa-regular fa-calendar"></i> ${article.date}</span>
        <span><i class="fa-solid fa-user-doctor"></i> مرکز آموزش و مقالات کانون مهر</span>
      </div>
    </div>
    <div class="modal-article-body">
      ${article.image ? `<img src="${article.image}" alt="${article.title}" style="width: 100%; max-height: 380px; object-fit: cover; border-radius: 12px; margin-bottom: 24px;">` : ''}
      ${paragraphs}
      ${article.pdfFile ? `
        <div style="margin-top: 30px; padding: 20px; background: #E0F7FA; border-radius: 12px; border: 1px solid #B2EBF2; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div>
            <strong style="color: var(--primary-dark); display: block;">دانلود کتاب/راهنمای کامل این مقاله</strong>
            <span style="font-size: 0.85rem; color: var(--text-muted);">نسخه اصلی و پی‌دی‌اف مرجع علمی</span>
          </div>
          <a href="${article.pdfFile}" class="btn btn-accent" download>
            <i class="fa-solid fa-download"></i> دریافت فایل PDF
          </a>
        </div>
      ` : ''}
    </div>
  `;

  overlay.classList.add('active');
}

function openVideoModal(aparatId, title) {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-body-container');
  if (!overlay || !container) return;

  container.innerHTML = `
    <div class="modal-article-header">
      <span class="badge badge-accent" style="margin-bottom: 10px;">ویدیو و مستند</span>
      <h2 class="modal-article-title">${title}</h2>
    </div>
    <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; background: #000; margin-bottom: 20px;">
      <iframe 
        src="https://www.aparat.com/video/video/embed/videohash/${aparatId}/vt/frame" 
        allowFullScreen="true" 
        webkitallowfullscreen="true" 
        mozallowfullscreen="true"
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;">
      </iframe>
    </div>
    <p style="color: var(--text-muted); font-size: 0.9rem; text-align: center;">
      در صورت عدم پخش خودکار می‌توانید ویدیو را مستقیماً در 
      <a href="https://www.aparat.com/v/${aparatId}" target="_blank" style="font-weight: 700; text-decoration: underline;">سایت آپارات</a> 
      مشاهده نمایید.
    </p>
  `;

  overlay.classList.add('active');
}

function openBrochureModal(id) {
  if (!window.SITE_DATA || !window.SITE_DATA.brochures) return;
  const b = window.SITE_DATA.brochures.find(item => item.id === id);
  if (!b) return;

  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-body-container');
  if (!overlay || !container) return;

  container.innerHTML = `
    <div class="modal-article-header">
      <span class="badge badge-success" style="margin-bottom: 10px;">${b.category}</span>
      <h2 class="modal-article-title">${b.title}</h2>
      <p style="color: var(--text-muted); font-size: 0.95rem;">${b.desc}</p>
    </div>
    <div style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px;">
      ${b.images.map((img, idx) => `
        <div style="border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: #fff; box-shadow: var(--shadow-sm);">
          <div style="padding: 8px 14px; background: #F8FAFC; border-bottom: 1px solid var(--border); font-size: 0.85rem; font-weight: 700; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
            <span>صفحه ${idx + 1}</span>
            <a href="${img}" download="brochure-${id}-page-${idx+1}.jpg" class="btn btn-sm btn-outline" style="padding: 4px 10px; font-size: 0.75rem;">
              <i class="fa-solid fa-download"></i> دریافت فایل اصلی
            </a>
          </div>
          <img src="${img}" alt="${b.title} صفحه ${idx + 1}" style="width: 100%; height: auto; display: block;">
        </div>
      `).join('')}
    </div>
    <div style="text-align: center;">
      <button class="btn btn-primary" onclick="closeModal()">
        <i class="fa-solid fa-check"></i> بستن راهنما
      </button>
    </div>
  `;

  overlay.classList.add('active');
}

function openImageModal(src, title) {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-body-container');
  if (!overlay || !container) return;

  container.innerHTML = `
    <div class="modal-article-header">
      <span class="badge badge-success" style="margin-bottom: 10px;">سند و تصویر رسمی</span>
      <h2 class="modal-article-title">${title}</h2>
    </div>
    <div style="text-align: center; margin-bottom: 20px; background: #F8FAFC; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; padding: 10px;">
      <img src="${src}" alt="${title}" style="max-width: 100%; height: auto; max-height: 75vh; object-fit: contain; display: inline-block; border-radius: 8px;">
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <a href="${src}" download class="btn btn-primary btn-sm">
        <i class="fa-solid fa-download"></i> دانلود تصویر اصلی باکیفیت
      </a>
      <button class="btn btn-outline btn-sm" onclick="closeModal()">
        <i class="fa-solid fa-xmark"></i> بستن
      </button>
    </div>
  `;

  overlay.classList.add('active');
}

// Helper: Async Form Submitter with Hybrid API & LocalStorage support
async function submitSiteForm(payload, formElement, successMessage) {
  const submitBtn = formElement.querySelector('button[type="submit"]');
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> در حال ثبت...';
  }

  try {
    // 1. Try Server API
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast(successMessage, 'success');
      formElement.reset();
      return;
    }
  } catch (err) {
    // 2. Server offline / GitHub Pages (Static hosting fallback)
    console.log('Server not reachable, saving submission to localStorage (GitHub Pages mode).');
  }

  // Save to LocalStorage for GitHub Pages / Static testing
  try {
    let localSubs = [];
    const saved = localStorage.getItem('hazini_submissions');
    if (saved) {
      localSubs = JSON.parse(saved);
    }
    const newId = localSubs.length > 0 ? Math.max(...localSubs.map(s => s.id || 0)) + 1 : 1;
    const now = new Date();
    let dateStr = now.toLocaleDateString('fa-IR') + ' - ' + now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    localSubs.unshift({
      id: newId,
      date: dateStr,
      status: 'unread',
      ...payload
    });

    localStorage.setItem('hazini_submissions', JSON.stringify(localSubs));
    showToast(successMessage, 'success');
    formElement.reset();
  } catch (e) {
    showToast(successMessage, 'success');
    formElement.reset();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }
}

// 6. Interactive Forms
function initForms() {
  // 1. Service Request Form (services.html)
  const serviceForm = document.getElementById('service-request-form');
  if (serviceForm) {
    serviceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(serviceForm);
      const serviceSelect = serviceForm.querySelector('select[name="serviceType"]');
      const serviceTypeTitle = serviceSelect && serviceSelect.selectedIndex >= 0 ? serviceSelect.options[serviceSelect.selectedIndex].text : '';

      const payload = {
        type: 'service',
        typeTitle: 'درخواست خدمات درمانی',
        patientName: formData.get('patientName') || '',
        phone: formData.get('phone') || '',
        disease: formData.get('disease') || '',
        serviceType: formData.get('serviceType') || '',
        serviceTypeTitle: serviceTypeTitle,
        address: formData.get('address') || '',
        notes: formData.get('notes') || ''
      };

      submitSiteForm(payload, serviceForm, 'درخواست خدمات درمانی با موفقیت ثبت شد. کادر درمان به زودی با شما تماس خواهند گرفت.');
    });
  }

  // 2. Memorial Banner Order Form (donate.html)
  const bannerForm = document.getElementById('banner-order-form');
  if (bannerForm) {
    bannerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(bannerForm);
      const bannerSelect = bannerForm.querySelector('select[name="bannerType"]');
      const bannerTypeTitle = bannerSelect && bannerSelect.selectedIndex >= 0 ? bannerSelect.options[bannerSelect.selectedIndex].text : '';

      const payload = {
        type: 'banner',
        typeTitle: 'سفارش بنر تسلیت',
        ordererName: formData.get('ordererName') || '',
        phone: formData.get('phone') || '',
        deceasedName: formData.get('deceasedName') || '',
        familyName: formData.get('familyName') || '',
        location: formData.get('location') || '',
        ceremonyDate: formData.get('ceremonyDate') || '',
        ceremonyTime: formData.get('ceremonyTime') || '',
        bannerType: formData.get('bannerType') || '',
        bannerTypeTitle: bannerTypeTitle
      };

      submitSiteForm(payload, bannerForm, 'سفارش استند تسلیت ثبت شد. کارشناسان کانون جهت هماهنگی تماس خواهند گرفت.');
    });
  }

  // 3. Volunteer Registration Form (donate.html)
  const volunteerForm = document.getElementById('volunteer-form');
  if (volunteerForm) {
    volunteerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(volunteerForm);
      const fieldSelect = volunteerForm.querySelector('select[name="field"]');
      const fieldTitle = fieldSelect && fieldSelect.selectedIndex >= 0 ? fieldSelect.options[fieldSelect.selectedIndex].text : '';

      const payload = {
        type: 'volunteer',
        typeTitle: 'ثبت‌نام داوطلب',
        name: formData.get('name') || '',
        phone: formData.get('phone') || '',
        job: formData.get('job') || '',
        field: formData.get('field') || '',
        fieldTitle: fieldTitle,
        details: formData.get('details') || ''
      };

      submitSiteForm(payload, volunteerForm, 'اطلاعات داوطلبی شما ثبت شد. با تشکر از همراهی پرمهرتان.');
    });
  }

  // 4. Contact Form (contact.html)
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(contactForm);
      const subSelect = contactForm.querySelector('select[name="subject"]');
      const subjectTitle = subSelect && subSelect.selectedIndex >= 0 ? subSelect.options[subSelect.selectedIndex].text : '';

      const payload = {
        type: 'contact',
        typeTitle: 'تماس با ما',
        name: formData.get('name') || '',
        phone: formData.get('phone') || '',
        subject: formData.get('subject') || '',
        subjectTitle: subjectTitle,
        message: formData.get('message') || ''
      };

      submitSiteForm(payload, contactForm, 'پیام شما با موفقیت ارسال شد. در اسرع وقت پاسخگوی شما هستیم.');
    });
  }
}
