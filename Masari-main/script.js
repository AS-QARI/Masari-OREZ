const OLD_KEY = 'bluder_v7_full_cv';
const LOCAL_KEY = 'masari_cv_store';

// Auto-migration for existing users
if (localStorage.getItem(OLD_KEY) && !localStorage.getItem(LOCAL_KEY)) {
    localStorage.setItem(LOCAL_KEY, localStorage.getItem(OLD_KEY));
}

let resumeData = {
    personal: {
        name: "",
        highlights: "",
        phone: "",
        email: "",
        social: "",
        github: "",
        location: ""
    },
    summary: "",
    skills: [],
    projects: [],
    experience: [],
    education: [],
    certifications: [],
    volunteering: [],
    sectionOrder: ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'awards', 'volunteering'],
    settings: { fontSizeName: 26, fontSizeTitle: 12.5, fontSizeRole: 11, fontSizeDate: 9.5, fontSizeBody: 9.5, fontSizeContact: 9.5, fontFamily: 'Inter', isBold: false, inlineEntity: false, marginName: -1, marginContact: 12, marginTopSection: 6, marginItem: 4, template: 'default', contactOrder: ['phone', 'email', 'social', 'github', 'location'], sectionMargins: { summary: 0, skills: 0, projects: 0, experience: 0, education: 0, certifications: 0, awards: 0, volunteering: 0 } }
};

window.onload = () => {
    const template = document.getElementById('pdf-root');
    const container = document.getElementById('desktop-preview-container');
    if (template && container) container.appendChild(template);

    loadProgress();
    renderAll();
    lucide.createIcons();
    handleSocialInput(resumeData.personal.social || "");
    updateProgressiveForms();

    // Initialize Sortable sidebar
    const sidebarNav = document.getElementById('sidebar-nav');
    if (sidebarNav && typeof Sortable !== 'undefined') {
        new Sortable(sidebarNav, {
            animation: 150,
            filter: '.no-drag', // 'الرئيسية' is not draggable
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: function() {
                // Read the DOM order
                const items = sidebarNav.querySelectorAll('.nav-item[data-section]');
                const newOrder = Array.from(items).map(el => el.getAttribute('data-section'));
                resumeData.sectionOrder = newOrder;
                saveAndRefresh(false);
            }
        });
    }
};

/* --- NAVIGATION --- */
function showSection(num) {
    document.querySelectorAll('.section-wrapper').forEach(el => el.classList.remove('active'));
    document.querySelector(`#sec-${num}`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const activeNav = document.querySelector(`#nav-sec-${num}`);
    activeNav.classList.add('active');

    // Smooth horizontal scroll to center active tab on mobile
    if (window.innerWidth <= 1024) {
        activeNav.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    document.getElementById('main-editor').scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileModal() {
    const modal = document.getElementById('mobilePreviewModal');
    const root = document.getElementById('pdf-root');
    const isOpening = !modal.classList.contains('active');

    if (isOpening) {
        document.getElementById('mobile-preview-container').appendChild(root);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        document.getElementById('desktop-preview-container').appendChild(root);
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/* --- LOGIC  --- */
function handleSocialInput(val) {
    resumeData.personal.social = val;
    const iconBox = document.getElementById('social-icon-box');
    const previewIcon = document.getElementById('cv-social-icon');

    let iconClass = "fas fa-link";
    const low = (val || "").toLowerCase();

    if (low.includes('linkedin.com')) iconClass = "fa-brands fa-linkedin color-linkedin";
    else if (low.includes('github.com')) iconClass = "fa-brands fa-github color-github";
    else if (low.includes('twitter.com') || low.includes('x.com')) iconClass = "fa-brands fa-x-twitter color-x";
    else if (low.includes('behance.net')) iconClass = "fa-brands fa-behance color-behance";
    else if (low.includes('dribbble.com')) iconClass = "fa-brands fa-dribbble color-dribbble";
    else if (low.includes('vimeo.com')) iconClass = "fa-brands fa-vimeo color-vimeo";
    else if (low.includes('youtube.com')) iconClass = "fa-brands fa-youtube color-youtube";

    iconBox.innerHTML = `<i class="${iconClass}" style="opacity:1;"></i>`;

    // Clean CV icon
    let cvClass = iconClass.split(' ')[0] + " " + iconClass.split(' ')[1];
    previewIcon.className = `${cvClass} cv-icon`;

    // Extraction logic
    let docSocial = val;
    try {
        if (val.startsWith('http')) {
            const url = new URL(val);
            let path = url.pathname;
            if (low.includes('linkedin.com/in/')) {
                const matches = path.match(/\/in\/([^\/]+)/);
                if (matches && matches[1]) docSocial = matches[1];
            } else {
                docSocial = path.replace(/^\//, '').replace(/\/$/, '') || url.hostname;
            }
        }
    } catch (e) { }

    const socialSpan = document.getElementById('cv-social');
    socialSpan.textContent = docSocial || val || "";
    if (val && val.trim() !== '') {
        socialSpan.href = val.startsWith('http') ? val : 'https://' + val;
    } else {
        socialSpan.removeAttribute('href');
    }
    saveAndRefresh(false);
}

function handleGithubInput(val) {
    if (!resumeData.personal) resumeData.personal = {};
    resumeData.personal.github = val;
    saveAndRefresh(false);
}

function moveContactItem(type, delta) {
    if (!resumeData.settings) resumeData.settings = {};
    if (!resumeData.settings.contactOrder) {
        resumeData.settings.contactOrder = ['phone', 'email', 'social', 'github', 'location'];
    }
    const arr = resumeData.settings.contactOrder;
    const idx = arr.indexOf(type);
    if (idx === -1) return;
    const targetIdx = idx + delta;
    if (targetIdx >= 0 && targetIdx < arr.length) {
        const temp = arr[idx];
        arr[idx] = arr[targetIdx];
        arr[targetIdx] = temp;
        saveAndRefresh(false);
        // Update form field order visually
        applyContactOrderToForm();
    }
}

function applyContactOrderToForm() {
    const order = (resumeData.settings && resumeData.settings.contactOrder) || ['phone', 'email', 'social', 'github', 'location'];
    const grid = document.querySelector('#sec-1 .form-grid');
    if (!grid) return;
    // Physically reorder DOM children to match contact order (CSS order doesn't work reliably with grid)
    // Find the anchor (last non-contact child, i.e. the Highlights field)
    const anchorFg = grid.querySelector('.col-span-2:last-of-type') || null;
    order.forEach(key => {
        const fg = document.getElementById('fg-' + key);
        if (fg) grid.appendChild(fg); // AppendChild moves to end in specified order
    });
}

function formatPhoneField(el) {
    if (!el.value) return;
    let digits = el.value.replace(/\D/g, '');
    if (digits.startsWith('966') && digits.length === 12) {
        el.value = `+966 ${digits.substring(3, 5)} ${digits.substring(5, 8)} ${digits.substring(8, 12)}`;
    } else if (digits.startsWith('05') && digits.length === 10) {
        el.value = `+966 ${digits.substring(1, 3)} ${digits.substring(3, 6)} ${digits.substring(6, 10)}`;
    } else if (digits.startsWith('5') && digits.length === 9) {
        el.value = `+966 ${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5, 9)}`;
    }
    saveAndRefresh(false);
}

function updateInputFields() {
    const p = resumeData.personal;
    document.getElementById('in-name').value = p.name || "";
    document.getElementById('in-highlights').value = p.highlights || "";
    document.getElementById('in-phone').value = p.phone || "";
    document.getElementById('in-email').value = p.email || "";
    document.getElementById('in-social').value = p.social || "";
    const githubIn = document.getElementById('in-github');
    if (githubIn) githubIn.value = p.github || "";
    document.getElementById('in-location').value = p.location || "";
    applyContactOrderToForm();
    if (document.getElementById('in-summary')) {
        document.getElementById('in-summary').value = resumeData.summary || "";
    }
    
    const fontDropdown = document.getElementById('in-fontFamily');
    if (fontDropdown && resumeData.settings && resumeData.settings.fontFamily) {
        fontDropdown.value = resumeData.settings.fontFamily;
    }
    
    if (!resumeData.sectionTitles) resumeData.sectionTitles = {};
    const secs = ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'awards', 'volunteering'];
    secs.forEach(k => {
        const el = document.getElementById('in-title-' + k);
        if (el && resumeData.sectionTitles[k]) el.value = resumeData.sectionTitles[k];
    });

    const checkBold = document.getElementById('in-isBold');
    if (checkBold && resumeData.settings && resumeData.settings.isBold !== undefined) {
        checkBold.checked = resumeData.settings.isBold;
    }
    const selTemplate = document.getElementById('sel-template');
    if (selTemplate && resumeData.settings && resumeData.settings.template !== undefined) {
        selTemplate.value = resumeData.settings.template;
    }
    const checkInline = document.getElementById('in-inlineEntity');
    if (checkInline && resumeData.settings && resumeData.settings.inlineEntity !== undefined) {
        checkInline.checked = resumeData.settings.inlineEntity;
    }
    // Restore social show full setting
    const checkSocialFull = document.getElementById('in-socialShowFull');
    if (checkSocialFull && resumeData.settings) {
        checkSocialFull.checked = !!resumeData.settings.socialShowFull;
    }
}

/* Download dropdown toggle */
function toggleDownloadMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('download-menu');
    if (!menu) return;
    menu.classList.toggle('open');
    // Close when clicking anywhere else
    if (menu.classList.contains('open')) {
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(ev) {
                if (!menu.contains(ev.target)) {
                    menu.classList.remove('open');
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 10);
    }
}

/* LinkedIn display toggle */
function toggleSocialDisplay(showFull) {
    if (!resumeData.settings) resumeData.settings = {};
    resumeData.settings.socialShowFull = showFull;
    saveAndRefresh(false);
}

/* Download as PNG Image */
function downloadAsImage() {
    const el = document.querySelector('#pdf-root');
    if (!el) { alert('لا توجد معاينة للتحميل.'); return; }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => {
        html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `${resumeData.personal.name || 'CV'}_Resume.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    };
    document.head.appendChild(script);
}

/* Download as Word (basic HTML-based .doc) */
function downloadAsWord() {
    const p = resumeData.personal;
    const sett = resumeData.settings || {};
    const order = resumeData.sectionOrder || ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'awards', 'volunteering'];
    const titles = resumeData.sectionTitles || {};
    
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>CV</title>
<style>
body { font-family: Calibri, sans-serif; font-size: 11pt; margin: 2cm; }
h1 { font-size: 20pt; text-align: center; margin-bottom: 4pt; }
.contact { text-align: center; font-size: 9pt; color: #555; margin-bottom: 12pt; }
h2 { font-size: 11.5pt; border-bottom: 1px solid #bbb; padding-bottom: 2pt; margin-top: 10pt; margin-bottom: 4pt; text-transform: uppercase; letter-spacing: 0.5pt; }
.row1 { display: flex; justify-content: space-between; font-weight: bold; }
.row2 { display: flex; justify-content: space-between; font-style: italic; color: #444; font-size: 10pt; margin-bottom: 2pt; }
ul { margin: 2pt 0 6pt 18pt; }
li { margin-bottom: 2pt; }
</style></head><body>`;

    html += `<h1>${escapeHTML(p.name || '')}</h1>`;
    if (p.highlights) html += `<p style="text-align:center; font-weight:bold; font-size:9.5pt; color:#444;">${escapeHTML(p.highlights)}</p>`;
    
    const contacts = [p.phone, p.email, p.social ? p.social.replace(/^https?:\/\//, '').replace(/\/$/, '') : '', p.location].filter(Boolean);
    html += `<p class="contact">${contacts.join(' | ')}</p>`;

    order.forEach(sec => {
        if (sec === 'summary' && resumeData.summary) {
            html += `<h2>${escapeHTML(titles.summary || 'Summary')}</h2><p>${escapeHTML(resumeData.summary)}</p>`;
        } else if (sec === 'experience' && resumeData.experience?.length) {
            html += `<h2>${escapeHTML(titles.experience || 'Experience')}</h2>`;
            resumeData.experience.forEach(ex => {
                html += `<div class="row1"><span>${escapeHTML(ex.role)}</span><span>${escapeHTML(ex.date)}</span></div>`;
                if (ex.company) html += `<div class="row2"><span>${escapeHTML(ex.company)}${ex.location ? ' — ' + escapeHTML(ex.location) : ''}</span></div>`;
                if (ex.items) html += `<ul>${ex.items.split('\n').filter(l=>l.trim()).map(l=>`<li>${escapeHTML(l)}</li>`).join('')}</ul>`;
            });
        } else if (sec === 'education' && resumeData.education?.length) {
            html += `<h2>${escapeHTML(titles.education || 'Education')}</h2>`;
            resumeData.education.forEach(ed => {
                let dStr = ed.date;
                if (ed.isExpectedGrad && dStr) dStr = 'Expected: ' + dStr;
                html += `<div class="row1"><span>${escapeHTML(ed.school)}</span><span>${escapeHTML(dStr)}</span></div>`;
                if (ed.degree) html += `<div class="row2"><span>${escapeHTML(ed.degree)}${ed.location ? ' — ' + escapeHTML(ed.location) : ''}</span></div>`;
                if (ed.items) html += `<ul>${ed.items.split('\n').filter(l=>l.trim()).map(l=>`<li>${escapeHTML(l)}</li>`).join('')}</ul>`;
            });
        } else if (sec === 'skills' && resumeData.skills?.length) {
            html += `<h2>${escapeHTML(titles.skills || 'Skills')}</h2>`;
            resumeData.skills.forEach(sk => {
                if (sk.category || sk.items) {
                    let items = (sk.items||'').split('\n').filter(i=>i.trim()).join(', ');
                    html += `<p><strong>${escapeHTML(sk.category)}${sk.category ? ': ' : ''}</strong>${escapeHTML(items)}</p>`;
                }
            });
        } else if (sec === 'projects' && resumeData.projects?.length) {
            html += `<h2>${escapeHTML(titles.projects || 'Projects')}</h2>`;
            resumeData.projects.forEach(pr => {
                html += `<div class="row1"><span>${escapeHTML(pr.name)}</span><span>${escapeHTML(pr.date)}</span></div>`;
                if (pr.items) html += `<ul>${pr.items.split('\n').filter(l=>l.trim()).map(l=>`<li>${escapeHTML(l)}</li>`).join('')}</ul>`;
            });
        } else if (sec === 'volunteering' && resumeData.volunteering?.length) {
            html += `<h2>${escapeHTML(titles.volunteering || 'Volunteering')}</h2>`;
            resumeData.volunteering.forEach(vo => {
                html += `<div class="row1"><span>${escapeHTML(vo.role)}</span><span>${escapeHTML(vo.date)}</span></div>`;
                if (vo.org) html += `<div class="row2"><span>${escapeHTML(vo.org)}${vo.location ? ' — ' + escapeHTML(vo.location) : ''}</span></div>`;
                if (vo.items) html += `<ul>${vo.items.split('\n').filter(l=>l.trim()).map(l=>`<li>${escapeHTML(l)}</li>`).join('')}</ul>`;
            });
        } else if (sec === 'certifications' && resumeData.certifications?.length) {
            html += `<h2>${escapeHTML(titles.certifications || 'Certifications')}</h2>`;
            resumeData.certifications.forEach(ce => {
                html += `<div class="row1"><span>${escapeHTML(ce.name)}</span><span>${escapeHTML(ce.date)}</span></div>`;
                if (ce.issuer) html += `<div class="row2"><span>${escapeHTML(ce.issuer)}</span></div>`;
            });
        } else if (sec === 'awards' && resumeData.awards?.length) {
            html += `<h2>${escapeHTML(titles.awards || 'Awards & Honors')}</h2>`;
            resumeData.awards.forEach(aw => {
                html += `<div class="row1"><span>${escapeHTML(aw.name)}</span><span>${escapeHTML(aw.date)}</span></div>`;
                if (aw.items) html += `<ul>${aw.items.split('\n').filter(l=>l.trim()).map(l=>`<li>${escapeHTML(l)}</li>`).join('')}</ul>`;
            });
        }
    });

    html += '</body></html>';
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${p.name || 'CV'}_Resume.doc`;
    link.click();
}

function changeFontFamily(val) {
    if (!resumeData.settings) {
        resumeData.settings = { fontSizeName: 26, fontSizeTitle: 12.5, fontSizeRole: 11, fontSizeDate: 9.5, fontSizeBody: 9.5, fontFamily: 'Inter', isBold: false };
    }
    resumeData.settings.fontFamily = val;
    saveAndRefresh();
}

function changeFontBold(checked) {
    if (!resumeData.settings) {
        resumeData.settings = { fontSizeName: 26, fontSizeTitle: 12.5, fontSizeRole: 11, fontSizeDate: 9.5, fontSizeBody: 9.5, fontFamily: 'Inter', isBold: checked };
    }
    resumeData.settings.isBold = checked;
    saveAndRefresh();
}

function changeFontSize(type, delta) {
    if (!resumeData.settings) {
        resumeData.settings = { fontSizeName: 26, fontSizeTitle: 12.5, fontSizeRole: 11, fontSizeDate: 9.5, fontSizeBody: 9.5, fontFamily: 'Inter', isBold: false };
    }

    
    // Add missing properties for backward compatibility
    if (resumeData.settings.fontSizeRole === undefined) resumeData.settings.fontSizeRole = 11;
    if (resumeData.settings.fontSizeDate === undefined) resumeData.settings.fontSizeDate = 9.5;

    let current = resumeData.settings[type];
    
    if (type === 'fontSizeName' && (current + delta < 14 || current + delta > 46)) return;
    if (type === 'fontSizeTitle' && (current + delta < 9 || current + delta > 24)) return;
    if ((type === 'fontSizeRole' || type === 'fontSizeDate' || type === 'fontSizeBody') && (current + delta < 6 || current + delta > 16)) return;
    
    resumeData.settings[type] = current + delta;
    saveAndRefresh();
}

function renderAll(buildEdit = true) {
    renderPersonal();
    renderSummary();
    renderSkills(buildEdit);
    renderProjects(buildEdit);
    renderExperience(buildEdit);
    renderEducation(buildEdit);
    renderCertifications(buildEdit);
    renderAwards(buildEdit);
    renderVolunteering(buildEdit);

    // Call lucide to render trash icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Process progressive disclosure for the new items
    if (buildEdit) {
        updateProgressiveForms();
    }
    reorderPreviewSections();
    applyFontSettings();
    detectPageOverflow();
}

function detectPageOverflow() {
    const master = document.getElementById('pdf-root');
    const indicator = document.getElementById('page-break-indicator');
    if (!master || !indicator) return;

    // A4 height is roughly 297mm.
    const a4HeightPx = 1122; // 297mm * 3.7795 (at 96dpi)
    
    // Position the indicator at the break point
    indicator.style.top = a4HeightPx + "px";

    if (master.scrollHeight > a4HeightPx + 5) {
        indicator.classList.add('visible');
    } else {
        indicator.classList.remove('visible');
    }
}

function changeTemplate(val) {
    if (!resumeData.settings) resumeData.settings = {};
    resumeData.settings.template = val;
    saveAndRefresh();
}

// margin handler
function changeInlineEntity(checked) {
    if (!resumeData.settings) resumeData.settings = {};
    resumeData.settings.inlineEntity = checked;
    saveAndRefresh();
}

function changeMargin(type, delta) {
    if (!resumeData.settings) resumeData.settings = {};
    
    if (resumeData.settings.marginName === undefined) resumeData.settings.marginName = -1;
    if (resumeData.settings.marginContact === undefined) resumeData.settings.marginContact = 12;
    if (resumeData.settings.marginTopSection === undefined) resumeData.settings.marginTopSection = 6;
    if (resumeData.settings.marginItem === undefined) resumeData.settings.marginItem = 4;

    let current = resumeData.settings[type];
    
    if (current + delta < -10 || current + delta > 40) return;
    
    resumeData.settings[type] = current + delta;
    saveAndRefresh();
}

function changeSectionMargin(section, delta) {
    if (!resumeData.settings) resumeData.settings = {};
    if (!resumeData.settings.sectionMargins) {
        resumeData.settings.sectionMargins = { summary: 0, skills: 0, projects: 0, experience: 0, education: 0, certifications: 0, awards: 0, volunteering: 0 };
    }
    const current = resumeData.settings.sectionMargins[section] || 0;
    const next = current + delta;
    if (next < -30 || next > 60) return;
    resumeData.settings.sectionMargins[section] = next;
    saveAndRefresh();
}

function applyFontSettings() {
    if (!resumeData.settings) {
        resumeData.settings = { fontSizeName: 26, fontSizeTitle: 12.5, fontSizeRole: 11, fontSizeDate: 9.5, fontSizeBody: 9.5, fontSizeContact: 9.5, fontFamily: 'Inter', isBold: false, inlineEntity: false, marginName: -1, marginContact: 12, marginTopSection: 6, marginItem: 4 };
    }
    // Backward comp
    if (resumeData.settings.fontSizeRole === undefined) resumeData.settings.fontSizeRole = 11;
    if (resumeData.settings.fontSizeDate === undefined) resumeData.settings.fontSizeDate = 9.5;
    if (resumeData.settings.fontSizeContact === undefined) resumeData.settings.fontSizeContact = 9.5;
    if (resumeData.settings.marginName === undefined) resumeData.settings.marginName = -1;
    if (resumeData.settings.marginContact === undefined) resumeData.settings.marginContact = 12;
    if (resumeData.settings.marginTopSection === undefined) resumeData.settings.marginTopSection = 6;
    if (resumeData.settings.marginItem === undefined) resumeData.settings.marginItem = 4;
    if (resumeData.settings.template === undefined) resumeData.settings.template = 'default';
    if (!resumeData.settings.sectionMargins) resumeData.settings.sectionMargins = { summary: 0, skills: 0, projects: 0, experience: 0, education: 0, certifications: 0, awards: 0, volunteering: 0 };

    const { fontSizeName, fontSizeTitle, fontSizeRole, fontSizeDate, fontSizeBody, fontSizeContact, fontFamily, isBold, marginName, marginContact, marginTopSection, marginItem, template } = resumeData.settings;
    
    // Update Labels
    const lblName = document.getElementById('lbl-fontSizeName');
    if (lblName) lblName.textContent = fontSizeName;
    const lblTitle = document.getElementById('lbl-fontSizeTitle');
    if (lblTitle) lblTitle.textContent = fontSizeTitle;
    const lblRole = document.getElementById('lbl-fontSizeRole');
    if (lblRole) lblRole.textContent = fontSizeRole;
    const lblDate = document.getElementById('lbl-fontSizeDate');
    if (lblDate) lblDate.textContent = fontSizeDate;
    const lblBody = document.getElementById('lbl-fontSizeBody');
    if (lblBody) lblBody.textContent = fontSizeBody;
    const lblContact = document.getElementById('lbl-fontSizeContact');
    if (lblContact) lblContact.textContent = fontSizeContact;
    
    const lblMarginName = document.getElementById('lbl-marginName');
    if (lblMarginName) lblMarginName.textContent = marginName;
    const lblMarginContact = document.getElementById('lbl-marginContact');
    if (lblMarginContact) lblMarginContact.textContent = marginContact;
    const lblMarginTopSection = document.getElementById('lbl-marginTopSection');
    if (lblMarginTopSection) lblMarginTopSection.textContent = marginTopSection;
    const lblMarginItem = document.getElementById('lbl-marginItem');
    if (lblMarginItem) lblMarginItem.textContent = marginItem;
    
    // Web Preview DOM styles
    const docRoot = document.querySelector('.cv-document');
    if(docRoot) {
        const ffMap = {
            'Inter': 'Inter, sans-serif',
            'Calibri': 'Calibri, "Segoe UI", sans-serif',
            'LMRoman': '"Times New Roman", Times, serif'
        };
        docRoot.style.fontFamily = ffMap[fontFamily || 'Inter'];

        if (isBold) {
            docRoot.classList.add('bold-text-mode');
        } else {
            docRoot.classList.remove('bold-text-mode');
        }
    }

    const nameEl = document.getElementById('cv-name');
    if(nameEl) {
        nameEl.style.fontSize = fontSizeName + 'pt';
        nameEl.style.marginBottom = marginName + 'pt';
    }

    const contactEl = document.querySelector('.cv-contact');
    if (contactEl) {
        contactEl.style.marginBottom = marginContact + 'pt';
    }

    const sectionTitles = document.querySelectorAll('.cv-section-title');
    sectionTitles.forEach(el => {
        el.style.fontSize = fontSizeTitle + 'pt';
        el.style.marginTop = marginTopSection + 'pt';
    });
    
    // Per-section margin override in the web preview
    const sm = resumeData.settings.sectionMargins || {};
    const sectionKeys = ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'awards', 'volunteering'];
    sectionKeys.forEach(k => {
        const titleEl = document.getElementById('title-' + k);
        if (titleEl) {
            const extra = sm[k] || 0;
            titleEl.style.marginTop = (marginTopSection + extra) + 'pt';
        }
        // Update the label in the settings panel
        const lbl = document.getElementById('lbl-secMargin-' + k);
        if (lbl) lbl.textContent = (sm[k] || 0);
    });

    const roleElements = document.querySelectorAll('.cv-row-1 span:first-child, .cv-row-2 .cv-role, .cv-row-2 em, .cv-item > span > strong, .cv-row-1 span strong');
    roleElements.forEach(el => el.style.fontSize = fontSizeRole + 'pt');

    const dateElements = document.querySelectorAll('.cv-date');
    dateElements.forEach(el => el.style.fontSize = fontSizeDate + 'pt');

    const bodyElements = document.querySelectorAll('.cv-bullets li, #v-summary-items, #v-skills-items div, .cv-row-2 span:not(.cv-date):not(.cv-role)');
    bodyElements.forEach(el => el.style.fontSize = fontSizeBody + 'pt');

    const contactItems = document.querySelectorAll('.cv-contact, .cv-contact a, .cv-contact .c-item');
    contactItems.forEach(el => el.style.fontSize = fontSizeContact + 'pt');

    const itemsList = document.querySelectorAll('.cv-bullets, #v-summary-items');
    itemsList.forEach(el => el.style.marginBottom = marginItem + 'pt');


    // Custom Section Titles rendering
    if(!resumeData.sectionTitles) resumeData.sectionTitles = {};
    const defs = {
        summary: 'SUMMARY',
        skills: 'SKILLS',
        projects: 'PROJECTS',
        experience: 'EXPERIENCE',
        education: 'EDUCATION',
        certifications: 'CERTIFICATIONS',
        awards: 'AWARDS & HONORS',
        volunteering: 'VOLUNTEERING'
    };
    Object.keys(defs).forEach(k => {
        const titleEl = document.getElementById('title-' + k);
        if (titleEl) {
            titleEl.textContent = (resumeData.sectionTitles[k] || defs[k]).trim().toUpperCase();
        }
    });
}

function reorderPreviewSections() {
    const docRoot = document.querySelector('.cv-document');
    if(!docRoot) return;
    
    // The mapping of section strings to element IDs
    const sectionIds = {
        summary: 'v-summary',
        skills: 'v-skills',
        projects: 'v-proj',
        experience: 'v-exp',
        education: 'v-edu',
        certifications: 'v-cert',
        awards: 'v-award',
        volunteering: 'v-vol'
    };
    
    (resumeData.sectionOrder || ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'awards', 'volunteering']).forEach(secKey => {
        const id = sectionIds[secKey];
        if(!id) return;
        const el = document.getElementById(id);
        if(el) docRoot.appendChild(el); // Move to the end in the correct order
    });
}

function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[m]));
}

function formatBold(txt) {
    return escapeHTML(txt).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

/* RENDERING BLOCKS */
function renderPersonal() {
    const p = resumeData.personal;
    document.getElementById('cv-name').textContent = p.name || "";
    if (p.highlights) {
        document.getElementById('cv-highlights').textContent = p.highlights;
        document.getElementById('cv-highlights').style.display = 'block';
    } else {
        document.getElementById('cv-highlights').style.display = 'none';
    }

    // DYNAMIC CONTACT RENDER (based on contactOrder)
    const order = resumeData.settings.contactOrder || ['phone', 'email', 'social', 'github', 'location'];
    const contactHtml = [];
    const buildContact = (type) => {
        let text = p[type] || "";
        if(!text) return "";
        let icon = "", linkAttr = "", isSocial = false;
        
        if (type === 'phone') {
            icon = '<i class="fas fa-phone-alt cv-icon"></i>';
        } else if (type === 'email') {
            icon = '<i class="fas fa-envelope cv-icon"></i>';
        } else if (type === 'location') {
            icon = '<i class="fas fa-map-marker-alt cv-icon"></i>';
        } else if (type === 'social') {
            let iconClass = "fas fa-link cv-icon";
            const low = text.toLowerCase();
            if (low.includes('linkedin')) iconClass = "fa-brands fa-linkedin cv-icon";
            else if (low.includes('twitter') || low.includes('x.com')) iconClass = "fa-brands fa-x-twitter cv-icon";
            else if (low.includes('behance')) iconClass = "fa-brands fa-behance cv-icon";
            else if (low.includes('dribbble')) iconClass = "fa-brands fa-dribbble cv-icon";
            
            icon = `<i class="${iconClass}"></i>`;
            let href = text.startsWith('http') ? text : 'https://' + text;
            linkAttr = `href="${href}" target="_blank" style="color: #0a66c2; text-decoration: none;"`;
            
            const showFull = resumeData.settings?.socialShowFull;
            if (showFull) {
                // Show full URL as clickable link
                text = text.replace(/^https?:\/\//, '').replace(/\/$/, '');
            } else {
                // Extract username/path only
                text = (text.indexOf('linkedin.com/in/') > -1) ? text.split('linkedin.com/in/')[1].replace(/\/$/, '') : text.replace(/^https?:\/\//, '').replace(/\/$/, '');
            }
            isSocial = true;
        } else if (type === 'github') {
            let iconClass = "fa-brands fa-github cv-icon";
            icon = `<i class="${iconClass}"></i>`;
            let isLink = text.includes('github.com');
            let href = isLink ? (text.startsWith('http') ? text : 'https://' + text) : 'https://github.com/' + text;
            linkAttr = `href="${href}" target="_blank" style="color: #24292e; text-decoration: none;"`;
            text = isLink ? text.replace(/^https?:\/\//, '').replace(/\/$/, '') : text;
            isSocial = true;
        }

        if (isSocial) {
             return `<span class="c-item">${icon} <a class="mono" ${linkAttr}>${escapeHTML(text)}</a></span>`;
        } else {
             return `<span class="c-item">${icon} <span class="mono">${escapeHTML(text)}</span></span>`;
        }
    };

    order.forEach(type => {
        let html = buildContact(type);
        if(html) contactHtml.push(html);
    });

    const contactContainer = document.getElementById('cv-contact-container');
    if(contactContainer) {
        contactContainer.innerHTML = contactHtml.join('<span class="cv-sep"> | </span>');
    }
}

function renderSummary() {
    const sum = resumeData.summary || "";
    const vSum = document.getElementById('v-summary');
    const vSumItems = document.getElementById('v-summary-items');
    if (vSum && vSumItems) {
        if (sum.trim()) {
            vSum.style.display = "block";
            vSumItems.innerHTML = escapeHTML(sum).replace(/\n/g, '<br>');
        } else {
            vSum.style.display = "none";
            vSumItems.innerHTML = "";
        }
    }
}

function buildBulletPoints(text) {
    if (!text) return "";
    return `<ul class="cv-bullets">${text.split('\n').filter(i => i.trim()).map(i => `<li>${formatBold(i)}</li>`).join('')}</ul>`;
}

function renderSkills(buildEdit = true) {
    const editList = document.getElementById('skills-list');
    const viewList = document.getElementById('v-skills-items');
    if (buildEdit) editList.innerHTML = "";
    viewList.innerHTML = "";
    document.getElementById('v-skills').style.display = resumeData.skills.length ? "block" : "none";

    resumeData.skills.forEach((sk, index) => {
        if (buildEdit) {
            const card = document.createElement('div'); card.className = 'item-card';
            card.innerHTML = `
                <div class="reorder-actions">
                    <button class="btn-reorder" onclick="moveItemUp('skills', ${index})" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى"><i data-lucide="chevron-up" style="width:16px;"></i></button>
                    <button class="btn-reorder" onclick="moveItemDown('skills', ${index})" ${index === resumeData.skills.length - 1 ? 'disabled' : ''} title="تحريك لأسفل"><i data-lucide="chevron-down" style="width:16px;"></i></button>
                </div>
                <button class="btn-delete" onclick="removeItem('skills', ${sk.id})" title="حذف الفئة"><i data-lucide="trash-2" style="width:18px;"></i></button>
                <div class="form-grid">
                    <div class="form-group"><label class="form-label">عنوان الفئة</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(sk.category)}" oninput="updateItem('skills', ${sk.id}, 'category', this.value)" placeholder="Category Name"></div>
                    <div class="form-group col-span-2">
                        <label class="form-label">محتوى الفئة (اكتب ليظهر سطر جديد تلقائياً)</label>
                        ${getDynamicRowsHtml('skills', sk.id, sk.items)}
                    </div>
                </div>`;
            editList.appendChild(card);
        }
        if (sk.category || sk.items) {
            let itemsStr = (sk.items || "").split('\n').filter(i => i.trim()).join(', ');
            viewList.innerHTML += `<div style="font-size:9.5pt;margin-bottom:4px;"><strong>${sk.category ? escapeHTML(sk.category) + ":" : ""}</strong> ${escapeHTML(itemsStr)}</div>`;
        }
    });
}


function addSkillSuggestion(cat) {
    let items = "";
    if (cat === "Languages") items = "Python, JavaScript, SQL";
    if (cat === "Tools & Frameworks") items = "React, Docker, AWS, Git";
    if (cat === "Soft Skills") items = "Leadership, Problem Solving, Communication";
    resumeData.skills.push({ id: Date.now(), category: cat, items: items });
    saveAndRefresh();
}

function addSkillObj() { resumeData.skills.push({ id: Date.now(), category: "", items: "" }); saveAndRefresh(); }

function renderProjects(buildEdit = true) {
    const editList = document.getElementById('project-list');
    const viewList = document.getElementById('v-project-items');
    if (buildEdit) editList.innerHTML = "";
    viewList.innerHTML = "";
    document.getElementById('v-proj').style.display = resumeData.projects.length ? "block" : "none";

    resumeData.projects.forEach((p, index) => {
        if (buildEdit) {
            const card = document.createElement('div'); card.className = 'item-card';

            card.innerHTML = `
                <div class="reorder-actions">
                    <button class="btn-reorder" onclick="moveItemUp('projects', ${index})" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى"><i data-lucide="chevron-up" style="width:16px;"></i></button>
                    <button class="btn-reorder" onclick="moveItemDown('projects', ${index})" ${index === resumeData.projects.length - 1 ? 'disabled' : ''} title="تحريك لأسفل"><i data-lucide="chevron-down" style="width:16px;"></i></button>
                </div>
                <button class="btn-delete" onclick="removeItem('projects', ${p.id})"><i data-lucide="trash-2" style="width:18px;"></i></button>
                <div class="form-grid">
                    <div class="form-group"><label class="form-label">المشروع</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(p.name)}" oninput="updateItem('projects', ${p.id}, 'name', this.value)" placeholder="مثال: Hajj & Umrah Guide App"></div>
                    <div class="form-group"><label class="form-label">الفترة (Date)</label><div class="fake-input" onclick="openDatePicker('projects', ${p.id}, 'date')"><span style="direction:ltr; display:inline-block">${escapeHTML(p.date) || 'اختر الفترة...'}</span><i data-lucide="calendar" style="width:16px;"></i></div></div>
                    <div class="form-group col-span-2"><label class="form-label">رابط المشروع (اختياري)</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(p.link || '')}" oninput="updateItem('projects', ${p.id}, 'link', this.value)" placeholder="https://github.com/..."></div>
                    <div class="form-group col-span-2">
                        <label class="form-label">التفاصيل / الإنجازات (اكتب ليظهر سطر جديد تلقائياً)</label>
                        ${getDynamicRowsHtml('projects', p.id, p.items)}
                    </div>
                </div>`;
            editList.appendChild(card);
        }
        const item = document.createElement('div'); item.className = "cv-item";
        let cleanText = escapeHTML(p.link ? p.link.replace(/^https?:\/\//, '').replace(/\/$/, '') : '');
        let linkHtmlUI = p.link ? `<div class="cv-row-2"><a href="${escapeHTML(p.link)}" target="_blank" style="color: #333; text-decoration: none; font-size: 0.85em;"><i class="fas fa-link" style="font-size:0.8em; margin-inline-end: 4px;"></i>${cleanText}</a></div>` : "";

        item.innerHTML = `<div class="cv-row-1"><span><strong>${escapeHTML(p.name)}</strong></span><span class="cv-date">${escapeHTML(p.date)}</span></div>${linkHtmlUI}${buildBulletPoints(p.items)}`;
        viewList.appendChild(item);
    });
}

function renderExperience(buildEdit = true) {
    const editList = document.getElementById('experience-list');
    const viewList = document.getElementById('v-experience-items');
    if (buildEdit) editList.innerHTML = "";
    viewList.innerHTML = "";
    document.getElementById('v-exp').style.display = resumeData.experience.length ? "block" : "none";

    resumeData.experience.forEach((exp, index) => {
        if (buildEdit) {
            const card = document.createElement('div'); card.className = 'item-card';
            card.innerHTML = `
                <div class="reorder-actions">
                    <button class="btn-reorder" onclick="moveItemUp('experience', ${index})" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى"><i data-lucide="chevron-up" style="width:16px;"></i></button>
                    <button class="btn-reorder" onclick="moveItemDown('experience', ${index})" ${index === resumeData.experience.length - 1 ? 'disabled' : ''} title="تحريك لأسفل"><i data-lucide="chevron-down" style="width:16px;"></i></button>
                </div>
                <button class="btn-delete" onclick="removeItem('experience', ${exp.id})"><i data-lucide="trash-2" style="width:18px;"></i></button>
                <div class="form-grid">
                    <div class="form-group"><label class="form-label">المسمى (Role)</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(exp.role)}" oninput="updateItem('experience', ${exp.id}, 'role', this.value)" placeholder="مثال: Software Engineer"></div>
                    <div class="form-group">
                        <label class="form-label">نوع العمل (Job Type)</label>
                        <select class="form-input" style="direction:ltr;" onchange="updateItem('experience', ${exp.id}, 'jobType', this.value)">
                            <option value="" ${!exp.jobType ? 'selected' : ''}>بدون (None)</option>
                            <option value="Full-time" ${exp.jobType === 'Full-time' ? 'selected' : ''}>Full-time</option>
                            <option value="Part-time" ${exp.jobType === 'Part-time' ? 'selected' : ''}>Part-time</option>
                            <option value="Internship" ${exp.jobType === 'Internship' ? 'selected' : ''}>Internship</option>
                            <option value="Freelance" ${exp.jobType === 'Freelance' ? 'selected' : ''}>Freelance</option>
                            <option value="Contract" ${exp.jobType === 'Contract' ? 'selected' : ''}>Contract</option>
                        </select>
                    </div>
                    <div class="form-group"><label class="form-label">الشركة (Company)</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(exp.company)}" oninput="updateItem('experience', ${exp.id}, 'company', this.value)" placeholder="مثال: Google"></div>
                    <div class="form-group"><label class="form-label">الفترة (Date)</label><div class="fake-input" onclick="openDatePicker('experience', ${exp.id}, 'date')"><span style="direction:ltr; display:inline-block">${escapeHTML(exp.date) || 'اختر الفترة...'}</span><i data-lucide="calendar" style="width:16px;"></i></div></div>
                    <div class="form-group col-span-2"><label class="form-label">المنطقة (Location)</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(exp.location)}" oninput="updateItem('experience', ${exp.id}, 'location', this.value)" placeholder="مثال: Mountain View, USA"></div>
                    <div class="form-group col-span-2">
                        <label class="form-label">المهام والانجازات (اكتب ليظهر سطر جديد تلقائياً)</label>
                        ${getDynamicRowsHtml('experience', exp.id, exp.items)}
                    </div>
                </div>`;
            editList.appendChild(card);
        }
        const item = document.createElement('div'); item.className = "cv-item";
        let companyLoc = exp.location ? `${escapeHTML(exp.company)} - ${escapeHTML(exp.location)}` : escapeHTML(exp.company);
        let titleRow, subtRow;
        
        if (resumeData.settings?.inlineEntity) {
             let leftHTML = "";
             if (exp.role && companyLoc) {
                 leftHTML = `<strong>${escapeHTML(exp.role)}</strong><span style="font-weight:400; color:#555; font-size:0.95em;"> | ${companyLoc}</span>`;
             } else if (exp.role) {
                 leftHTML = `<strong>${escapeHTML(exp.role)}</strong>`;
             } else if (companyLoc) {
                 leftHTML = `<strong>${companyLoc}</strong>`;
             }
             titleRow = `<div class="cv-row-1"><span>${leftHTML}</span><span class="cv-date">${escapeHTML(exp.date)}</span></div>`;
             subtRow = exp.jobType ? `<div class="cv-row-2"><span><em>${escapeHTML(exp.jobType)}</em></span><span class="cv-date"></span></div>` : "";
        } else {
             titleRow = `<div class="cv-row-1"><span><strong>${escapeHTML(exp.role)}</strong></span><span class="cv-date">${escapeHTML(exp.date)}</span></div>`;
             subtRow = `<div class="cv-row-2"><span><em>${companyLoc}</em></span><span class="cv-date">${escapeHTML(exp.jobType) || ''}</span></div>`;
        }
        
        item.innerHTML = titleRow + subtRow + buildBulletPoints(exp.items);
        viewList.appendChild(item);
    });
}

function renderEducation(buildEdit = true) {
    const editList = document.getElementById('education-list');
    const viewList = document.getElementById('v-education-items');
    if (buildEdit) editList.innerHTML = "";
    viewList.innerHTML = "";
    document.getElementById('v-edu').style.display = resumeData.education.length ? "block" : "none";

    resumeData.education.forEach((e, index) => {
        if (buildEdit) {
            const card = document.createElement('div'); card.className = 'item-card';
            card.innerHTML = `
                <div class="reorder-actions">
                    <button class="btn-reorder" onclick="moveItemUp('education', ${index})" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى"><i data-lucide="chevron-up" style="width:16px;"></i></button>
                    <button class="btn-reorder" onclick="moveItemDown('education', ${index})" ${index === resumeData.education.length - 1 ? 'disabled' : ''} title="تحريك لأسفل"><i data-lucide="chevron-down" style="width:16px;"></i></button>
                </div>
                <button class="btn-delete" onclick="removeItem('education', ${e.id})"><i data-lucide="trash-2" style="width:18px;"></i></button>
                <div class="form-grid">
                    <div class="form-group"><label class="form-label">المؤسسة / الجامعة</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(e.school)}" oninput="updateItem('education', ${e.id}, 'school', this.value)" placeholder="مثال: King Saud University"></div>
                    <div class="form-group"><label class="form-label">المدينة</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(e.location)}" oninput="updateItem('education', ${e.id}, 'location', this.value)" placeholder="مثال: Riyadh, KSA"></div>
                    <div class="form-group"><label class="form-label">الدرجة (Degree & GPA)</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(e.degree)}" oninput="updateItem('education', ${e.id}, 'degree', this.value)" placeholder="مثال: B.S. in Computer Science, GPA: 3.8/4.0"></div>
                    <div class="form-group"><label class="form-label">الفترة (Date)</label><div class="fake-input" onclick="openDatePicker('education', ${e.id}, 'date')"><span style="direction:ltr; display:inline-block">${escapeHTML(e.date) || 'اختر الفترة...'}</span><i data-lucide="calendar" style="width:16px;"></i></div></div>
                    <div class="form-group col-span-2">
                        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;" class="form-label">
                            <input type="checkbox" ${e.isExpectedGrad ? 'checked' : ''} onchange="updateItem('education', ${e.id}, 'isExpectedGrad', this.checked)">
                            <span>التاريخ هو تاريخ تخرج متوقع (Expected Graduation)</span>
                        </label>
                    </div>
                    <div class="form-group col-span-2">
                        <label class="form-label">التفاصيل المؤهل (اكتب ليظهر سطر جديد تلقائياً)</label>
                        ${getDynamicRowsHtml('education', e.id, e.items)}
                    </div>
                </div>`;
            editList.appendChild(card);
        }
        const item = document.createElement('div'); item.className = "cv-item";
        let dStr = escapeHTML(e.date);
        if (e.isExpectedGrad && dStr) dStr = "Expected Graduation: " + dStr;
        let titleRow, subtRow;
        if (resumeData.settings?.inlineEntity) {
             let locStr = e.location ? `${e.school} - ${e.location}` : e.school;
             let leftHTML = "";
             if (e.degree && locStr) {
                 leftHTML = `<strong>${escapeHTML(e.degree)}</strong><span style="font-weight:400; color:#555; font-size:0.95em;"> | ${escapeHTML(locStr)}</span>`;
             } else if (e.degree) {
                 leftHTML = `<strong>${escapeHTML(e.degree)}</strong>`;
             } else if (locStr) {
                 leftHTML = `<strong>${escapeHTML(locStr)}</strong>`;
             }
             titleRow = `<div class="cv-row-1"><span>${leftHTML}</span><span class="cv-date">${dStr}</span></div>`;
             subtRow = "";
        } else {
             titleRow = `<div class="cv-row-1"><span><strong>${escapeHTML(e.school)}</strong></span><span class="cv-date">${escapeHTML(e.location)}</span></div>`;
             subtRow = `<div class="cv-row-2"><span class="cv-role"><em>${escapeHTML(e.degree)}</em></span><span class="cv-date">${dStr}</span></div>`;
        }
        item.innerHTML = titleRow + subtRow + buildBulletPoints(e.items);
        viewList.appendChild(item);
    });
}

function renderCertifications(buildEdit = true) {
    const editList = document.getElementById('certification-list');
    const viewList = document.getElementById('v-certification-items');
    if (buildEdit) editList.innerHTML = "";
    viewList.innerHTML = "";
    document.getElementById('v-cert').style.display = resumeData.certifications.length ? "block" : "none";

    resumeData.certifications.forEach((cert, index) => {
        if (buildEdit) {
            const card = document.createElement('div'); card.className = 'item-card';
            card.innerHTML = `
                <div class="reorder-actions">
                    <button class="btn-reorder" onclick="moveItemUp('certifications', ${index})" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى"><i data-lucide="chevron-up" style="width:16px;"></i></button>
                    <button class="btn-reorder" onclick="moveItemDown('certifications', ${index})" ${index === resumeData.certifications.length - 1 ? 'disabled' : ''} title="تحريك لأسفل"><i data-lucide="chevron-down" style="width:16px;"></i></button>
                </div>
                <button class="btn-delete" onclick="removeItem('certifications', ${cert.id})"><i data-lucide="trash-2" style="width:18px;"></i></button>
                <div class="form-grid">
                    <div class="form-group col-span-2"><label class="form-label">اسم الشهادة (Certificate Name)</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(cert.name)}" oninput="updateItem('certifications', ${cert.id}, 'name', this.value)" placeholder="مثال: CompTIA A+ Certification"></div>
                    <div class="form-group"><label class="form-label">جهة الإصدار (Issuer)</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(cert.issuer)}" oninput="updateItem('certifications', ${cert.id}, 'issuer', this.value)" placeholder="مثال: CompTIA"></div>
                    <div class="form-group"><label class="form-label">الفترة (Date)</label><div class="fake-input" onclick="openDatePicker('certifications', ${cert.id}, 'date')"><span style="direction:ltr; display:inline-block">${escapeHTML(cert.date) || 'اختر الفترة...'}</span><i data-lucide="calendar" style="width:16px;"></i></div></div>
                    <div class="form-group col-span-2">
                        <label class="form-label">تفاصيل إضافية (اختياري - اكتب ليظهر سطر جديد تلقائياً)</label>
                        ${getDynamicRowsHtml('certifications', cert.id, cert.items)}
                    </div>
                </div>`;
            editList.appendChild(card);
        }
        const item = document.createElement('div'); item.className = "cv-item";
        let titleLine = `<div class="cv-row-1"><span>${escapeHTML(cert.name)}</span><span class="cv-date">${escapeHTML(cert.date)}</span></div>`;
        if (cert.issuer) titleLine += `<div class="cv-row-2"><span class="cv-role">${escapeHTML(cert.issuer)}</span></div>`;
        item.innerHTML = titleLine + buildBulletPoints(cert.items);
        viewList.appendChild(item);
    });
}

function renderAwards(buildEdit = true) {
    const editList = document.getElementById('award-list');
    const viewList = document.getElementById('v-award-items');
    if (buildEdit) editList.innerHTML = "";
    viewList.innerHTML = "";
    document.getElementById('v-award').style.display = resumeData.awards.length ? "block" : "none";

    resumeData.awards.forEach((aw, index) => {
        if (buildEdit) {
            const card = document.createElement('div'); card.className = 'item-card';
            card.innerHTML = `
                <div class="reorder-actions">
                    <button class="btn-reorder" onclick="moveItemUp('awards', ${index})" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى"><i data-lucide="chevron-up" style="width:16px;"></i></button>
                    <button class="btn-reorder" onclick="moveItemDown('awards', ${index})" ${index === resumeData.awards.length - 1 ? 'disabled' : ''} title="تحريك لأسفل"><i data-lucide="chevron-down" style="width:16px;"></i></button>
                </div>
                <button class="btn-delete" onclick="removeItem('awards', ${aw.id})"><i data-lucide="trash-2" style="width:18px;"></i></button>
                <div class="form-grid">
                    <div class="form-group"><label class="form-label">عنوان الجائزة</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(aw.name)}" oninput="updateItem('awards', ${aw.id}, 'name', this.value)" placeholder="مثال: Employee of the Year"></div>
                    <div class="form-group"><label class="form-label">الفترة (Date)</label><div class="fake-input" onclick="openDatePicker('awards', ${aw.id}, 'date')"><span style="direction:ltr; display:inline-block">${escapeHTML(aw.date) || 'اختر الفترة...'}</span><i data-lucide="calendar" style="width:16px;"></i></div></div>
                    <div class="form-group col-span-2">
                        <label class="form-label">التفاصيل أو الإنجاز (اكتب ليظهر سطر جديد تلقائياً)</label>
                        ${getDynamicRowsHtml('awards', aw.id, aw.items)}
                    </div>
                </div>`;
            editList.appendChild(card);
        }
        const item = document.createElement('div'); item.className = "cv-item";
        item.innerHTML = `<div class="cv-row-1"><span>${escapeHTML(aw.name)}</span><span class="cv-date">${escapeHTML(aw.date)}</span></div>${buildBulletPoints(aw.items)}`;
        viewList.appendChild(item);
    });
}

function renderVolunteering(buildEdit = true) {
    const editList = document.getElementById('volunteering-list');
    const viewList = document.getElementById('v-volunteering-items');
    if (buildEdit) editList.innerHTML = "";
    viewList.innerHTML = "";
    document.getElementById('v-vol').style.display = resumeData.volunteering.length ? "block" : "none";

    resumeData.volunteering.forEach((vol, index) => {
        if (buildEdit) {
            const card = document.createElement('div'); card.className = 'item-card';
            card.innerHTML = `
                <div class="reorder-actions">
                    <button class="btn-reorder" onclick="moveItemUp('volunteering', ${index})" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى"><i data-lucide="chevron-up" style="width:16px;"></i></button>
                    <button class="btn-reorder" onclick="moveItemDown('volunteering', ${index})" ${index === resumeData.volunteering.length - 1 ? 'disabled' : ''} title="تحريك لأسفل"><i data-lucide="chevron-down" style="width:16px;"></i></button>
                </div>
                <button class="btn-delete" onclick="removeItem('volunteering', ${vol.id})"><i data-lucide="trash-2" style="width:18px;"></i></button>
                <div class="form-grid">
                    <div class="form-group"><label class="form-label">المنظمة (Organization)</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(vol.org)}" oninput="updateItem('volunteering', ${vol.id}, 'org', this.value)" placeholder="مثال: Red Crescent"></div>
                    <div class="form-group"><label class="form-label">الفترة (Date)</label><div class="fake-input" onclick="openDatePicker('volunteering', ${vol.id}, 'date')"><span style="direction:ltr; display:inline-block">${escapeHTML(vol.date) || 'اختر الفترة...'}</span><i data-lucide="calendar" style="width:16px;"></i></div></div>
                    <div class="form-group"><label class="form-label">الدور (Role)</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(vol.role)}" oninput="updateItem('volunteering', ${vol.id}, 'role', this.value)" placeholder="مثال: Volunteer First Aid Responder"></div>
                    <div class="form-group"><label class="form-label">المنطقة (Location)</label><input type="text" style="direction:ltr;" class="form-input" value="${escapeHTML(vol.location)}" oninput="updateItem('volunteering', ${vol.id}, 'location', this.value)" placeholder="مثال: Jeddah, KSA"></div>
                    <div class="form-group col-span-2">
                        <label class="form-label">المهام التطوعية (اكتب ليظهر سطر جديد تلقائياً)</label>
                        ${getDynamicRowsHtml('volunteering', vol.id, vol.items)}
                    </div>
                </div>`;
            editList.appendChild(card);
        }
        const item = document.createElement('div'); item.className = "cv-item";
        let titleRow, subtRow;
        if (resumeData.settings?.inlineEntity) {
             let subStr = vol.role ? (vol.location ? `${vol.role} - ${vol.location}` : vol.role) : vol.location;
             let leftHTML = "";
             if (vol.org && subStr) {
                 leftHTML = `<strong>${escapeHTML(vol.org)}</strong><span style="font-weight:400; color:#555; font-size:0.95em;"> | ${escapeHTML(subStr)}</span>`;
             } else if (vol.org) {
                 leftHTML = `<strong>${escapeHTML(vol.org)}</strong>`;
             } else if (subStr) {
                 leftHTML = `<strong>${escapeHTML(subStr)}</strong>`;
             }
             titleRow = `<div class="cv-row-1"><span>${leftHTML}</span><span class="cv-date">${escapeHTML(vol.date)}</span></div>`;
             subtRow = "";
        } else {
             titleRow = `<div class="cv-row-1"><span><strong>${escapeHTML(vol.org)}</strong></span><span class="cv-date">${escapeHTML(vol.date)}</span></div>`;
             subtRow = `<div class="cv-row-2"><span><em>${escapeHTML(vol.role)}</em></span><span>${escapeHTML(vol.location)}</span></div>`;
        }
        item.innerHTML = titleRow + subtRow + buildBulletPoints(vol.items);
        viewList.appendChild(item);
    });
    // lucide.createIcons(); // Disabled here to avoid icon redraw issues on edit updates
}

/** CRUD HELPERS **/
function saveAndRefresh(buildEdit = true) {
    resumeData.personal.name = document.getElementById('in-name').value;
    resumeData.personal.highlights = document.getElementById('in-highlights').value;
    resumeData.personal.phone = document.getElementById('in-phone').value;
    resumeData.personal.email = document.getElementById('in-email').value;
    resumeData.personal.social = document.getElementById('in-social').value;
    resumeData.personal.github = document.getElementById('in-github').value;
    resumeData.personal.location = document.getElementById('in-location').value;
    if (document.getElementById('in-summary')) {
        resumeData.summary = document.getElementById('in-summary').value;
    }
    
    if (!resumeData.sectionTitles) resumeData.sectionTitles = {};
    const secs = ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'awards', 'volunteering'];
    secs.forEach(k => {
        const el = document.getElementById('in-title-' + k);
        if (el) resumeData.sectionTitles[k] = el.value;
    });

    saveProgress();
    renderAll(buildEdit);
}

function updateItem(type, id, key, value, buildEdit = false) {
    const item = resumeData[type].find(i => i.id === id);
    if (item) item[key] = value;
    saveProgress();
    renderAll(buildEdit);
    updateProgressiveForms();
}

function addItem(type, obj) { resumeData[type].push(obj); saveAndRefresh(); }
function addExperience() { addItem('experience', { id: Date.now(), company: "", date: "", role: "", location: "", items: "" }); }
function addProject() { addItem('projects', { id: Date.now(), name: "", date: "", link: "", items: "" }); }
function addEducation() { addItem('education', { id: Date.now(), school: "", date: "", degree: "", location: "", items: "" }); }
function addCertification() { addItem('certifications', { id: Date.now(), name: "", date: "", issuer: "", items: "" }); }
function addAward() { addItem('awards', { id: Date.now(), name: "", date: "", items: "" }); }
function addVolunteering() { addItem('volunteering', { id: Date.now(), role: "", date: "", org: "", location: "", items: "" }); }

function removeItem(type, id) { resumeData[type] = resumeData[type].filter(i => i.id !== id); saveAndRefresh(); }

function moveItemUp(type, index) {
    if (index > 0) {
        let arr = resumeData[type];
        [arr[index], arr[index - 1]] = [arr[index - 1], arr[index]];
        saveAndRefresh();
    }
}

function moveItemDown(type, index) {
    let arr = resumeData[type];
    if (index < arr.length - 1) {
        [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
        saveAndRefresh();
    }
}

function handleGenericSubItemChange(type, id) {
    const listDiv = document.getElementById(`dyn-list-${type}-${id}`);
    if (!listDiv) return;
    const inputs = Array.from(listDiv.querySelectorAll(`.dyn-item-in-${type}-${id}`));
    const vals = inputs.map(i => i.value);

    const arr = resumeData[type];
    const item = arr.find(x => x.id === id);
    if (item) {
        // Collect only non-empty real content
        const finalVals = vals.filter(x => x.trim() !== "");
        item.items = finalVals.join('\n');
        saveProgress();
        renderAll(false);
    }

    // Add new row if the last one isn't empty
    if (inputs.length > 0 && inputs[inputs.length - 1].value.trim() !== "") {
        appendGenericRow(type, id);
    }
}

function getSectionPlaceholder(type) {
    if (type === 'skills') return "e.g., JavaScript, React, Leadership";
    if (type === 'projects') return "e.g., Designed and developed the UI using...";
    if (type === 'experience') return "e.g., Improved system performance by 30% through...";
    if (type === 'education') return "e.g., GPA: 4.8/5.0 with First Class Honors.";
    if (type === 'certifications') return "e.g., Passed the final exam with distinction...";
    if (type === 'awards') return "e.g., Awarded First Place in the national competition...";
    if (type === 'volunteering') return "e.g., Provided technical support to hundreds of...";
    return "- ...";
}

function appendGenericRow(type, id) {
    const listDiv = document.getElementById(`dyn-list-${type}-${id}`);
    if (!listDiv) return;
    const row = document.createElement('div');
    row.className = "dyn-row dyn-proj-row"; // Reuse project row animation
    row.style.display = "flex";
    row.style.gap = "0.5rem";
    row.style.marginBottom = "0.8rem";
    row.style.alignItems = "center";

    const ph = getSectionPlaceholder(type);

    row.innerHTML = `<input type="text" class="form-input dyn-item-in-${type}-${id}" style="direction:ltr;" value="" oninput="handleGenericSubItemChange('${type}', ${id})" placeholder="${ph}">
    <button class="btn-icon-danger" tabindex="-1" onclick="this.parentElement.remove(); handleGenericSubItemChange('${type}', ${id});" aria-label="حذف"><i data-lucide="trash-2" style="width:18px;"></i></button>`;

    listDiv.appendChild(row);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function getDynamicRowsHtml(type, id, itemsText) {
    let itemsArr = (itemsText || "").split('\n');
    if (itemsArr.length === 0 || itemsArr[itemsArr.length - 1] !== "") itemsArr.push("");
    let rowsHtml = "";
    const ph = getSectionPlaceholder(type);
    itemsArr.forEach((txt) => {
        rowsHtml += `<div class="dyn-row" style="display:flex; gap:0.5rem; margin-bottom:0.8rem; align-items:center;">
            <input type="text" class="form-input dyn-item-in-${type}-${id}" style="direction:ltr;" value="${escapeHTML(txt)}" oninput="handleGenericSubItemChange('${type}', ${id})" placeholder="${ph}">
            <button class="btn-icon-danger" tabindex="-1" onclick="this.parentElement.remove(); handleGenericSubItemChange('${type}', ${id});" aria-label="حذف"><i data-lucide="trash-2" style="width:18px;"></i></button>
        </div>`;
    });
    return `<div id="dyn-list-${type}-${id}">${rowsHtml}</div>`;
}

function handleProjItemChange(id) { handleGenericSubItemChange('projects', id); }
function appendProjItemRow(id) { appendGenericRow('projects', id); }

function updateProgressiveForms() {
    document.querySelectorAll('.item-card').forEach(card => {
        const groups = Array.from(card.querySelectorAll('.form-group'));
        if (groups.length === 0) return;

        // Always show the first field
        groups[0].style.display = 'flex';

        // Check if the first field has a value
        const firstInput = groups[0].querySelector('input, textarea');
        let hasValue = false;
        if (firstInput) {
            hasValue = firstInput.value.trim() !== '';
        }

        // Show the rest only if the first has value
        for (let i = 1; i < groups.length; i++) {
            if (hasValue) {
                if (groups[i].style.display === 'none' || groups[i].style.display === '') {
                    groups[i].style.display = 'flex';
                    groups[i].classList.add('prog-reveal');
                }
            } else {
                if (groups[i].style.display !== 'none') {
                    groups[i].style.display = 'none';
                    groups[i].classList.remove('prog-reveal');
                }
            }
        }
    });
}

function saveProgress() { localStorage.setItem(LOCAL_KEY, JSON.stringify(resumeData)); }
function loadProgress() {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) {
        let loaded = JSON.parse(saved);
        // Ensure new arrays exist if user loads older state
        ['certifications', 'awards', 'volunteering', 'skills', 'experience', 'projects', 'education'].forEach(arr => {
            if (!loaded[arr]) loaded[arr] = [];
        });
        if (!loaded.sectionOrder || loaded.sectionOrder.length === 0) {
            loaded.sectionOrder = ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'awards', 'volunteering'];
        }
        if (!loaded.settings) {
            loaded.settings = { fontSizeName: 26, fontSizeTitle: 12.5, fontSizeRole: 11, fontSizeDate: 9.5, fontSizeBody: 9.5, fontFamily: 'Inter', isBold: false, inlineEntity: false, marginName: -1, marginContact: 12, marginTopSection: 6, marginItem: 4 };
        }
        if (loaded.settings.fontSizeRole === undefined) loaded.settings.fontSizeRole = 11;
        if (loaded.settings.fontSizeDate === undefined) loaded.settings.fontSizeDate = 9.5;
        if (loaded.settings.marginName === undefined) loaded.settings.marginName = -1;
        if (loaded.settings.marginContact === undefined) loaded.settings.marginContact = 12;
        if (loaded.settings.marginTopSection === undefined) loaded.settings.marginTopSection = 6;
        if (loaded.settings.marginItem === undefined) loaded.settings.marginItem = 4;
        resumeData = loaded;
        updateInputFields();

        // Also reorder the sidebar DOM natively based on sectionOrder
        const sidebarNav = document.getElementById('sidebar-nav');
        if(sidebarNav) {
            resumeData.sectionOrder.forEach(secName => {
                const el = sidebarNav.querySelector(`.nav-item[data-section="${secName}"]`);
                if(el) sidebarNav.appendChild(el);
            });
        }
    }
}

// Reset data (load dummy content)
function resetData() {
    document.getElementById('resetModal').classList.add('active');
}
function closeResetModal() {
    document.getElementById('resetModal').classList.remove('active');
}
function confirmReset() {
    const dummyData = {
        personal: { name: "Sultan Abdullah AlFaifi", highlights: "KAUST AI Program | McKinsey Forward Fellow | SCE Member", phone: "+966 50 399 0106", email: "sultan@example.com", social: "https://www.linkedin.com/in/alfaifi-sultan", location: "Makkah, KSA" },
        summary: "A passionate Software Engineer with a focus on building engaging and scalable applications. Experienced in modern web technologies, dedicated to solving complex problems and delivering high-quality solutions.",
        skills: [{ id: 101, category: "Languages", items: "Python\nJavaScript\nTypeScript\nJava" }, { id: 102, category: "Tools", items: "React\nNode.js\nGit\nDocker" }],
        projects: [{ id: 3, name: "Hajj & Umrah Guide App", date: "Mar. 2021 -- Nov. 2021", link: "https://github.com/sultan/hajj-app", items: "Built a cross-platform mobile application to assist pilgrims.\nIntegrated live maps and offline features for accessibility." }],
        experience: [{ id: 1, company: "Tech Solutions Co.", date: "Jan. 2022 -- Present", role: "Software Engineer", location: "Makkah, KSA", items: "Developed scalable web applications serving thousands of users.\nOptimized database queries, reducing load times by 40%." }],
        education: [{ id: 4, school: "Umm Al-Qura University", date: "Aug. 2017 -- May. 2021", degree: "B.S. in Computer Science", location: "Makkah, KSA", items: "**GPA**: 4.8/5.0 with First Class Honors.\n**Coursework**: Data Structures, Web Engineering." }],
        certifications: [{ id: 103, name: "AWS Certified Developer – Associate", date: "Mar. 2022", issuer: "Amazon Web Services", items: "Completed official AWS developer module.\nPassed the exam with a 950/1000 score." }],
        awards: [{ id: 104, name: "First Place - Hackathon Makkah", date: "Sept. 2020", items: "Led a team of 4 to build an innovative crowd-management AI solution." }],
        volunteering: [{ id: 105, role: "Mentor & Tech Support", date: "Ramadan 2019", org: "Grand Mosque Visitors Care", location: "Makkah, KSA", items: "Assisted elderly pilgrims with digital apps and wayfinding." }],
        sectionOrder: ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'awards', 'volunteering'],
        settings: { fontSizeName: 26, fontSizeTitle: 12.5, fontSizeRole: 11, fontSizeDate: 9.5, fontSizeBody: 9.5, fontFamily: 'Inter', isBold: false }
    };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(dummyData));
    loadProgress();
    renderAll(true);
    closeResetModal();
}

// Clear all data (make empty)
function confirmClearDataModal() {
    document.getElementById('clearModal').classList.add('active');
}
function closeClearModal() {
    document.getElementById('clearModal').classList.remove('active');
}
function confirmClearAll() {
    localStorage.removeItem(LOCAL_KEY);
    resumeData = {
        personal: { name: "", highlights: "", phone: "", email: "", social: "", location: "" },
        summary: "",
        skills: [], projects: [], experience: [], education: [], certifications: [], awards: [], volunteering: [],
        sectionOrder: ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'awards', 'volunteering'],
        settings: { fontSizeName: 26, fontSizeTitle: 12.5, fontSizeRole: 11, fontSizeDate: 9.5, fontSizeBody: 9.5, fontFamily: 'Inter', isBold: false }
    };
    updateInputFields();
    renderAll(true);
    closeClearModal();
}

/* PDF Generate */
function downloadPDF(event) {
    if (typeof pdfMake === 'undefined') {
        alert("جاري تحميل المكتبات... يرجى المحاولة بعد قليل.");
        return;
    }

    // Determine which button was clicked
    const btn = (event && event.currentTarget) ? event.currentTarget : document.getElementById('download-btn-desktop');
    if (!btn) return;

    if (btn.disabled) return;
    const originalContent = btn.innerHTML;
    const isMobile = window.innerWidth <= 1024;

    // Visual feedback
    btn.innerHTML = isMobile ? '<i class="fas fa-spinner fa-spin"></i>' : '<i class="fas fa-spinner fa-spin" style="margin-inline-end: 8px;"></i> جاري التحميل...';
    btn.disabled = true;

    // Use a single short timeout to let the UI update text to "Loading...", then freeze main thread to build PDF
    setTimeout(() => {
        try {
            // Using completely local custom font via VFS generated file
            pdfMake.fonts = {
                Inter: {
                    normal: "Inter-Regular.ttf",
                    bold: "Inter-Bold.ttf",
                    italics: "Inter-Regular.ttf",
                    bolditalics: "Inter-Bold.ttf",
                },
                InterBlack: {
                    normal: "Inter-Black.ttf",
                    bold: "Inter-Black.ttf",
                    italics: "Inter-Black.ttf",
                    bolditalics: "Inter-Black.ttf",
                },
                Calibri: {
                    normal: "Calibri-Regular.ttf",
                    bold: "Calibri-Bold.ttf",
                    italics: "Calibri-Regular.ttf",
                    bolditalics: "Calibri-Bold.ttf",
                },
                LMRoman: {
                    normal: "LMRoman-Regular.ttf",
                    bold: "LMRoman-Bold.ttf",
                    italics: "LMRoman-Regular.ttf",
                    bolditalics: "LMRoman-Bold.ttf",
                }
            };
            const fSizeName = resumeData.settings?.fontSizeName || 26;
            const fSizeTitle = resumeData.settings?.fontSizeTitle || 12.5;
            const fSizeRole = resumeData.settings?.fontSizeRole || 11;
            const fSizeDate = resumeData.settings?.fontSizeDate || 9.5;
            const fSizeBody = resumeData.settings?.fontSizeBody || 9.5;
            const isBoldDoc = resumeData.settings?.isBold || false;
            
            const selectedFont = resumeData.settings?.fontFamily || 'Inter';

            const d = {
                pageSize: 'A4',
                pageMargins: [35, 35, 35, 35],
                defaultStyle: { font: selectedFont, color: '#1a1a1a', lineHeight: 1.2, bold: isBoldDoc },
                styles: {
                    name: { font: selectedFont === 'Inter' ? 'InterBlack' : selectedFont, bold: selectedFont !== 'Inter', fontSize: fSizeName, alignment: 'center', margin: [0, 0, 0, resumeData.settings.marginName !== undefined ? resumeData.settings.marginName : -1], color: '#000000', characterSpacing: 0 },
                    contact: { fontSize: fSizeBody - 1, alignment: 'center', color: '#1a1a1a', margin: [0, 0, 0, 6] },
                    contactLink: { fontSize: fSizeBody - 1, color: '#1a1a1a' },
                    sectionTitle: { fontSize: fSizeTitle, bold: true, margin: [0, resumeData.settings.marginTopSection !== undefined ? resumeData.settings.marginTopSection : 6, 0, 2], color: '#000000', characterSpacing: 0.5 },
                    itemTitle: { fontSize: fSizeRole, bold: true, color: '#000000' },
                    itemRow: { margin: [0, 0, 0, 0.5] },
                    bullets: { fontSize: fSizeBody - 0.5, lineHeight: 1.2, margin: [0, 1, 0, resumeData.settings.marginItem !== undefined ? resumeData.settings.marginItem : 4] },
                    skillRow: { fontSize: fSizeBody, margin: [0, 0, 0, 1] },
                    subtitle: { fontSize: fSizeRole - 0.5, bold: true, italics: true, color: '#333333' },
                    subtitleAcademic: { fontSize: fSizeRole - 0.5, bold: false, italics: true, color: '#333333' },
                    dateText: { fontSize: fSizeDate },
                    dateTextBold: { fontSize: fSizeDate, bold: true },
                    dateTextItalic: { fontSize: fSizeDate, italics: true, bold: false },
                    projectLink: { fontSize: fSizeBody - 0.5, color: '#1a1a1a', decoration: 'underline' }
                },
                content: []
            };

            const addSectionLine = () => {
                d.content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 525, y2: 0, lineWidth: 1.2, lineColor: '#bbbbbb' }], margin: [0, 0, 0, 4] });
            };

            const parseBold = (str) => {
                if (!str) return "";
                let parts = str.split(/(\*\*.*?\*\*)/g);
                return parts.map(p => {
                    if (p.startsWith('**') && p.endsWith('**')) return { text: p.substring(2, p.length - 2), bold: true, color: '#000000' };
                    return { text: p };
                });
            };

            const buildBullets = (itemsStr) => {
                if (!itemsStr) return null;
                const lines = itemsStr.split('\n').map(s => s.trim()).filter(Boolean);
                if (!lines.length) return null;

                return {
                    stack: lines.map(l => ({
                        columns: [
                            { text: "•", width: 10, margin: [0, 0, 4, 0] },
                            { text: parseBold(l), width: "*" }
                        ],
                        margin: [0, 1, 0, 0]
                    })),
                    style: 'bullets'
                };
            };

            const p = resumeData.personal;
            if (p.name) d.content.push({ text: p.name, style: 'name' });
            if (p.highlights) d.content.push({ text: p.highlights, fontSize: 9.5, bold: true, alignment: 'center', margin: [0, -4, 0, 10], color: '#444444' });

            const getIconPath = (type) => {
                const attrs = 'fill="#444444" stroke="none"';
                let path = '';
                if (type === 'phone') path = '<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>';
                else if (type === 'email') path = '<path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>';
                else if (type === 'location') path = '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>';
                else if (type === 'linkedin') path = '<path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>';
                else if (type === 'github') path = '<path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>';
                else if (type === 'behance') path = '<path d="M22 12c0-2.52-2.02-4.5-4.5-4.5S13 9.48 13 12c0 2.57 2.1 4.5 4.5 4.5 1.95 0 3.48-.96 4.1-2.4h-1.63c-.41.6-1.1 1-1.95 1-1.4 0-2.38-1.03-2.5-2.6h4.48V12zm-4.50-3.1c1.19 0 2 .88 2.31 2.06h-4.22c.2-1.29 1-2.06 1.91-2.06zM9 10.5V7H4v10h5.5c1.8 0 3.2-1.1 3.2-2.5 0-1.12-.76-2-1.85-2.33C11.9 11.83 12.5 10.95 12.5 10c0-1.38-1.15-2.5-2.65-2.5H9zM7 9h2c.6 0 1 .45 1 1 0 .6-.4 1-1 1H7V9zm0 6v-3h2.3c.75 0 1.25.4 1.25 1.15C10.55 14.1 9.9 15 9.15 15H7zm8.5-9h4v1.5h-4V6z"/>';
                else if (type === 'external') path = '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>';
                else path = '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" fill="none" stroke="#444444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';

                return {
                    svg: `<svg viewBox="0 0 24 24" ${attrs}>${path}</svg>`,
                    width: 10,
                    height: 10,
                    margin: [0, 0.5, 2, 0] // Lifted slightly to match text baseline perfectly
                };
            };

            let allContactsInfo = [];
            const cOrder = resumeData.settings.contactOrder || ['phone', 'email', 'social', 'github', 'location'];
            cOrder.forEach(type => {
                if (type === 'phone' && p.phone) {
                    allContactsInfo.push({
                        text: p.phone.trim().replace(/\s+/g, '\u00A0'),
                        rawLength: Math.min(p.phone.length, 25),
                        icon: 'phone',
                        url: 'tel:' + p.phone.replace(/[^0-9+]/g, '')
                    });
                }
                if (type === 'email' && p.email) {
                    let disp = p.email.length > 45 ? p.email.substring(0, 42) + '...' : p.email;
                    allContactsInfo.push({
                        text: disp,
                        rawLength: disp.length,
                        icon: 'email',
                        url: 'mailto:' + p.email
                    });
                }
                if (type === 'social' && p.social) {
                    let cleanUrl = p.social.replace(/^https?:\/\//, '').replace(/^www\./, '').split('?')[0].replace(/\/$/, "");
                    let scUrl = p.social.startsWith('http') ? p.social : 'https://' + p.social;
                    let disp;
                    const showFull = resumeData.settings?.socialShowFull;
                    if (showFull) {
                        // Show full URL (matches web preview)
                        disp = cleanUrl;
                    } else {
                        // Show username only (strip linkedin.com/in/ etc.)
                        if (cleanUrl.indexOf('linkedin.com/in/') > -1) {
                            disp = cleanUrl.split('linkedin.com/in/')[1].replace(/\/$/, '');
                        } else {
                            disp = cleanUrl;
                        }
                    }
                    disp = disp.length > 45 ? disp.substring(0, 42) + '...' : disp;
                    let iconType = 'social';
                    if (cleanUrl.includes('linkedin.com')) iconType = 'linkedin';
                    else if (cleanUrl.includes('twitter.com') || cleanUrl.includes('x.com')) iconType = 'social';
                    else if (cleanUrl.includes('behance.net')) iconType = 'behance';
                    allContactsInfo.push({
                        text: disp,
                        rawLength: disp.length,
                        icon: iconType,
                        url: scUrl,
                        isSocial: true
                    });
                }
                if (type === 'github' && p.github) {
                    let text = p.github;
                    let isLink = text.includes('github.com');
                    let href = isLink ? (text.startsWith('http') ? text : 'https://' + text) : 'https://github.com/' + text;
                    let disp = isLink ? text.replace(/^https?:\/\//, '').replace(/\/$/, '') : text;
                    disp = disp.length > 45 ? disp.substring(0, 42) + '...' : disp;
                    allContactsInfo.push({
                        text: disp,
                        rawLength: disp.length,
                        icon: 'github',
                        url: href,
                        isSocial: true
                    });
                }
                if (type === 'location' && p.location) {
                    let disp = p.location.length > 30 ? p.location.substring(0, 27) + '...' : p.location;
                    allContactsInfo.push({
                        text: disp.trim().replace(/\s+/g, '\u00A0'),
                        rawLength: disp.length,
                        icon: 'location'
                    });
                }
            });

            // Dynamic layout grouping logic
            let rows = [];
            let currentRow = [];
            let currentLen = 0;

            allContactsInfo.forEach(c => {
                let itemLen = c.rawLength + 4;
                // Increased threshold to 120 points/chars to allow more items to stay on one line
                if (currentRow.length > 0 && (currentLen + itemLen > 120)) {
                    rows.push(currentRow);
                    currentRow = [];
                    currentLen = 0;
                }
                currentRow.push(c);
                currentLen += itemLen;
            });
            if (currentRow.length > 0) rows.push(currentRow);

            // Render logically chunked rows beautifully
            rows.forEach((rowItems, rowIndex) => {
                let rowCols = [];
                rowItems.forEach((c, idx) => {
                    let txtObj = { text: c.text, width: 'auto', style: 'contactLink' };
                    if (c.url) {
                        txtObj.link = c.url;
                        if (c.isSocial) {
                            txtObj.color = '#0a66c2';
                        }
                    }

                    rowCols.push({ columns: [getIconPath(c.icon), txtObj], width: 'auto' });

                    if (idx < rowItems.length - 1) {
                        rowCols.push({ text: "|", color: '#cccccc', margin: [6, 0, 6, 0], width: 'auto' });
                    }
                });

                d.content.push({
                    columns: [
                        { width: '*', text: '' },
                        { width: 'auto', columns: rowCols, columnGap: 0 },
                        { width: '*', text: '' }
                    ],
                    margin: [0, 0, 0, rowIndex === rows.length - 1 ? (resumeData.settings.marginContact !== undefined ? resumeData.settings.marginContact : 12) : 6]
                });
            });

            const buildRow = (left1, right1, left2, right1HeaderLabel, desc, left2Link = null) => {
                const linesCount = (desc || "").split('\n').filter(x => x.trim()).length;
                let block = { unbreakable: linesCount <= 4, stack: [] };
                let isAca = resumeData.settings?.template === 'academic';

                if (left1 || right1) {
                    let left1Obj = typeof left1 === 'string' ? { text: left1 || "", style: 'itemTitle', width: '*' } : { text: left1, width: '*' };
                    block.stack.push({
                        columns: [
                            left1Obj,
                            { text: right1 || "", style: isAca ? 'dateTextBold' : 'dateText', alignment: 'right', width: 'auto' }
                        ],
                        style: 'itemRow'
                    });
                }
                if (left2 || right1HeaderLabel) {
                    let leftCol;
                    if (left2Link) {
                        leftCol = {
                            width: '*',
                            columns: [
                                { ...getIconPath('link'), width: 8, height: 8, margin: [0, 2, 6, 0] },
                                { text: left2 || "", style: 'projectLink', link: left2Link, width: 'auto' }
                            ],
                            columnGap: 4
                        };
                    } else {
                        leftCol = { text: left2 || "", style: isAca ? 'subtitleAcademic' : 'subtitle', width: '*' };
                    }

                    block.stack.push({
                        columns: [
                            leftCol,
                            { text: right1HeaderLabel || "", style: isAca ? 'dateTextItalic' : 'dateText', alignment: 'right', width: 'auto' }
                        ],
                        style: 'itemRow'
                    });
                }
                const b = buildBullets(desc);
                if (b) block.stack.push(b);
                block.stack.push({ text: '', margin: [0, 0, 0, 2] });
                d.content.push(block);
            };

            const isAca = resumeData.settings?.template === 'academic';
            const gSM = resumeData.settings?.sectionMargins || {};
            const baseTopMargin = resumeData.settings.marginTopSection !== undefined ? resumeData.settings.marginTopSection : 6;
            const secTitle = (key, label) => ({
                text: isAca ? label : label.toUpperCase(),
                style: 'sectionTitle',
                margin: [0, baseTopMargin + (gSM[key] || 0), 0, 2]
            });
            const renderPDFSection = {
                summary: () => {
                    if (resumeData.summary && resumeData.summary.trim()) {
                        let t = resumeData.sectionTitles?.summary || 'SUMMARY';
                        d.content.push(secTitle('summary', t));
                        addSectionLine();
                        d.content.push({ text: resumeData.summary.trim(), fontSize: fSizeBody, lineHeight: 1.3, margin: [0, 0, 0, resumeData.settings.marginItem !== undefined ? resumeData.settings.marginItem : 6], color: '#333333' });
                    }
                },
                skills: () => {
                    if (resumeData.skills && resumeData.skills.length) {
                        let t = resumeData.sectionTitles?.skills || 'SKILLS';
                        d.content.push(secTitle('skills', t));
                        addSectionLine();
                        let skBlock = { unbreakable: true, stack: [] };
                        resumeData.skills.forEach(sk => {
                            if (!sk.category && !sk.items) return;
                            let itemsStr = (sk.items || "").split('\n').filter(i => i.trim()).join(', ');
                            skBlock.stack.push({
                                text: [{ text: (sk.category ? sk.category + ': ' : ''), bold: true }, itemsStr],
                                style: 'skillRow'
                            });
                        });
                        skBlock.stack.push({ text: '', margin: [0, 0, 0, 4] });
                        d.content.push(skBlock);
                    }
                },
                projects: () => {
                    if (resumeData.projects && resumeData.projects.length) {
                        let t = resumeData.sectionTitles?.projects || 'PROJECTS';
                        d.content.push(secTitle('projects', t));
                        addSectionLine();
                        resumeData.projects.forEach(pr => {
                            let cleanLink = pr.link ? pr.link.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
                            let fullLink = pr.link ? (pr.link.startsWith('http') ? pr.link : 'https://' + pr.link) : null;
                            buildRow(pr.name, pr.date, cleanLink, null, pr.items, fullLink);
                        });
                    }
                },
                experience: () => {
                    if (resumeData.experience && resumeData.experience.length) {
                        let t = resumeData.sectionTitles?.experience || 'EXPERIENCE';
                        d.content.push(secTitle('experience', t));
                        addSectionLine();
                        resumeData.experience.forEach(ex => {
                            let locStr = ex.location ? `${ex.company} - ${ex.location}` : ex.company;
                            if (resumeData.settings?.inlineEntity) {
                                let inlineArr = [];
                                if (ex.role) inlineArr.push({ text: ex.role, style: 'itemTitle' });
                                if (locStr) {
                                    if (inlineArr.length > 0) inlineArr.push({ text: ' | ' + locStr, bold: false, italics: false, color: '#555555', fontSize: fSizeRole - 0.5 });
                                    else inlineArr.push({ text: locStr, style: 'itemTitle' });
                                }
                                buildRow(inlineArr.length ? inlineArr : "", ex.date, "", ex.jobType || "", ex.items);
                            } else {
                                buildRow(isAca ? ex.company : ex.role, ex.date, isAca ? ex.role : locStr, isAca ? ex.location : (ex.jobType || ""), ex.items);
                            }
                        });
                    }
                },
                education: () => {
                    if (resumeData.education && resumeData.education.length) {
                        let t = resumeData.sectionTitles?.education || 'EDUCATION';
                        d.content.push(secTitle('education', t));
                        addSectionLine();
                        resumeData.education.forEach(ed => {
                            let dStr = ed.date;
                            if (ed.isExpectedGrad && dStr) dStr = "Expected Graduation: " + dStr;
                            if (resumeData.settings?.inlineEntity) {
                                let locStr = ed.location ? `${ed.school} - ${ed.location}` : ed.school;
                                let inlineArr = [];
                                if (ed.degree) inlineArr.push({ text: ed.degree, style: 'itemTitle' });
                                if (locStr) {
                                    if (inlineArr.length > 0) inlineArr.push({ text: ' | ' + locStr, bold: false, italics: false, color: '#555555', fontSize: fSizeRole - 0.5 });
                                    else inlineArr.push({ text: locStr, style: 'itemTitle' });
                                }
                                buildRow(inlineArr.length ? inlineArr : "", dStr, "", "", ed.items);
                            } else {
                                buildRow(ed.school, dStr, ed.degree, ed.location || "", ed.items);
                            }
                        });
                    }
                },
                certifications: () => {
                    if (resumeData.certifications && resumeData.certifications.length) {
                        let t = resumeData.sectionTitles?.certifications || 'CERTIFICATIONS';
                        d.content.push(secTitle('certifications', t));
                        addSectionLine();
                        resumeData.certifications.forEach(ce => buildRow(ce.name, ce.date, ce.issuer || "", "", ce.items));
                    }
                },
                awards: () => {
                    if (resumeData.awards && resumeData.awards.length) {
                        let t = resumeData.sectionTitles?.awards || 'AWARDS & HONORS';
                        d.content.push(secTitle('awards', t));
                        addSectionLine();
                        resumeData.awards.forEach(aw => buildRow(aw.name, aw.date, null, null, aw.items));
                    }
                },
                volunteering: () => {
                    if (resumeData.volunteering && resumeData.volunteering.length) {
                        let t = resumeData.sectionTitles?.volunteering || 'VOLUNTEERING';
                        d.content.push(secTitle('volunteering', t));
                        addSectionLine();
                        resumeData.volunteering.forEach(vo => {
                            if (resumeData.settings?.inlineEntity) {
                                let orgLoc = vo.location ? `${vo.org} - ${vo.location}` : vo.org;
                                let inlineArr = [];
                                if (vo.role) inlineArr.push({ text: vo.role, style: 'itemTitle' });
                                if (orgLoc) {
                                    if (inlineArr.length > 0) inlineArr.push({ text: ' | ' + orgLoc, bold: false, italics: false, color: '#555555', fontSize: fSizeRole - 0.5 });
                                    else inlineArr.push({ text: orgLoc, style: 'itemTitle' });
                                }
                                buildRow(inlineArr.length ? inlineArr : "", vo.date, "", "", vo.items);
                            } else {
                                buildRow(vo.org, vo.date, vo.role, vo.location, vo.items);
                            }
                        });
                    }
                }
            };

            (resumeData.sectionOrder || ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'awards', 'volunteering']).forEach(sec => {
                if (renderPDFSection[sec]) renderPDFSection[sec]();
            });

            const pdfDoc = pdfMake.createPdf(d);
            pdfDoc.download(`${resumeData.personal.name || 'CV'}_Resume.pdf`);
        } catch (e) {
            console.error("PDF Generation Error:", e);
            alert("حدث خطأ تقني: " + (e.message || e));
        } finally {
            // Restore button state
            if (btn) {
                btn.innerHTML = originalContent;
                btn.disabled = false;
                // re-init icons if they were lost
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }

            const mobileModal = document.getElementById('mobilePreviewModal');
            if (mobileModal && mobileModal.classList.contains('active')) {
                // Keep modal open so user sees it worked, or close it if preferred.
                // We'll just restore the button.
            }
        }
    }, 50);
}


/* --- Date Picker Logic --- */
let dpTargetType = null;
let dpTargetId = null;
let dpTargetKey = null;
let currentCalType = 'gregorian';

const dpMonths = {
    gregorian: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    hijri: ["Muharram", "Safar", "Rabi I", "Rabi II", "Jumada I", "Jumada II", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"]
};

function generateYears(type) {
    let years = [];
    if (type === 'gregorian') {
        const currentYear = new Date().getFullYear();
        for (let i = currentYear + 2; i >= 1990; i--) years.push(i);
    } else {
        for (let i = 1450; i >= 1410; i--) years.push(i);
    }
    return years;
}

function renderDateSelectors() {
    const sMonth = document.getElementById('dp-start-month');
    const sYear = document.getElementById('dp-start-year');
    const eMonth = document.getElementById('dp-end-month');
    const eYear = document.getElementById('dp-end-year');

    const mList = dpMonths[currentCalType];
    const yList = generateYears(currentCalType);

    const mHtml = mList.map(m => `<option value="${m}">${m}</option>`).join('');
    const yHtml = yList.map(y => `<option value="${y}">${y}</option>`).join('');

    sMonth.innerHTML = mHtml; eMonth.innerHTML = mHtml;
    sYear.innerHTML = yHtml; eYear.innerHTML = yHtml;
}

function setCalType(type) {
    currentCalType = type;
    document.querySelectorAll('.dp-tab').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${type}`).classList.add('active');
    renderDateSelectors();
}

function toggleEndPicker() {
    const type = document.querySelector('input[name="dp_end_type"]:checked').value;
    const endGroup = document.getElementById('dp-end-group');
    if (type === 'range') {
        endGroup.style.opacity = '1';
        endGroup.style.pointerEvents = 'auto';
    } else {
        endGroup.style.opacity = '0.3';
        endGroup.style.pointerEvents = 'none';
    }
}

function openDatePicker(type, id, key) {
    dpTargetType = type;
    dpTargetId = id;
    dpTargetKey = key;
    renderDateSelectors();
    document.getElementById('datePickerModal').classList.add('active');
}

function closeDatePicker() {
    document.getElementById('datePickerModal').classList.remove('active');
}

function saveDateSelection() {
    const sM = document.getElementById('dp-start-month').value;
    const sY = document.getElementById('dp-start-year').value;
    let finalVal = (currentCalType === 'gregorian') ? `${sM}. ${sY}` : `${sM} ${sY}`;

    const type = document.querySelector('input[name="dp_end_type"]:checked').value;

    if (type === 'present') {
        finalVal += " -- Present";
    } else if (type === 'range') {
        const eM = document.getElementById('dp-end-month').value;
        const eY = document.getElementById('dp-end-year').value;
        const endStr = (currentCalType === 'gregorian') ? `${eM}. ${eY}` : `${eM} ${eY}`;
        finalVal += ` -- ${endStr}`;
    }

    updateItem(dpTargetType, dpTargetId, dpTargetKey, finalVal, true);
    closeDatePicker();
}
