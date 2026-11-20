/* ==========================================================================
   Portfolio Main Script
   - EmailJS Contact Form
   - Smooth Scroll-Reveal (Intersection Observer)
   - Active Navigation Spy
   - Parallax Tracking for Selected Work Title
   - Auto Scroll Up Button & Circular Progress Ring
   ========================================================================== */

(function () {
    'use strict';

    /* ── 1. EmailJS Initialization & Contact Form ── */
    const EMAILJS_PUBLIC_KEY = '4KRW-Qz7F5a7vljHU';
    const EMAILJS_SERVICE_ID = 'service_vz1rguo';
    const EMAILJS_TEMPLATE_ID = 'template_v0d1mmh';

    function initEmailJS() {
        if (typeof emailjs !== 'undefined') {
            try {
                emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
            } catch (err) {
                console.error('EmailJS init error:', err);
            }
        }
    }
    initEmailJS();

    let isSubmitting = false;

    function sendMail(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (isSubmitting) return;

        const nameInput = document.getElementById('contact-name');
        const emailInput = document.getElementById('contact-email');
        const msgInput = document.getElementById('contact-message');
        const subjectSelect = document.getElementById('contact-subject');
        const locationInput = document.getElementById('contact-location');
        const contactForm = document.getElementById('contactForm');
        const btn = document.querySelector('.aron-submit-btn');

        const name = nameInput ? nameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const message = msgInput ? msgInput.value.trim() : '';
        const subject = subjectSelect ? subjectSelect.value : 'Project Inquiry';
        const location = locationInput ? locationInput.value.trim() : '';

        if (!name || !email || !message) {
            alert('Please fill in all required fields (Name, Email, and Project Details).');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address.');
            if (emailInput) emailInput.focus();
            return;
        }

        if (typeof emailjs === 'undefined') {
            alert('Email service is currently unavailable. Please check your internet connection or email directly at kianberong87@gmail.com.');
            return;
        }

        isSubmitting = true;
        if (btn) {
            btn.innerText = 'SENDING...';
            btn.disabled = true;
        }

        let fullMsg = `Sender Name: ${name}\n`;
        fullMsg += `Sender Email: ${email}\n`;
        fullMsg += `Project Type: ${subject}\n`;
        if (location) fullMsg += `Location: ${location}\n`;
        fullMsg += `\nProject Details:\n${message}`;

        const templateParams = {
            name: name,
            from_name: name,
            user_name: name,
            sender_name: name,
            email: email,
            reply_to: email,
            from_email: email,
            user_email: email,
            sender_email: email,
            location: location || 'Not specified',
            project_type: subject,
            subject: `New Inquiry from ${name} - ${subject}`,
            message: fullMsg,
            to_email: 'kianberong87@gmail.com'
        };

        try {
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
                .then(() => {
                    alert('Message sent successfully! Thank you for getting in touch.');
                    if (contactForm) contactForm.reset();
                })
                .catch((err) => {
                    console.error('EmailJS Error:', err);
                    const errorMsg = (err && (err.text || err.message)) ? (err.text || err.message) : 'Please try again later.';
                    alert('Failed to send message: ' + errorMsg);
                })
                .finally(() => {
                    isSubmitting = false;
                    if (btn) {
                        btn.innerText = 'SEND ENQUIRY';
                        btn.disabled = false;
                    }
                });
        } catch (err) {
            console.error('Unexpected submission error:', err);
            alert('An unexpected error occurred. Please try again or reach out directly via email.');
            isSubmitting = false;
            if (btn) {
                btn.innerText = 'SEND ENQUIRY';
                btn.disabled = false;
            }
        }
    }

    // Expose sendMail to global scope
    window.sendMail = sendMail;

    // Bind event listener to form directly once loaded
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', sendMail);
    }

    /* ── 2. Smooth Scroll-Reveal via Intersection Observer ── */
    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    el.classList.add('is-visible');
                    // Release GPU compositor layer after reveal animation finishes
                    setTimeout(() => {
                        el.classList.add('reveal-complete');
                    }, 800);
                    revealObserver.unobserve(el);
                }
            });
        },
        { threshold: 0.05, rootMargin: '0px 0px 40px 0px' }
    );

    document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

    // Home section: trigger immediately since it is visible on load
    document.querySelectorAll('.home [data-reveal]').forEach((el) => {
        el.classList.add('is-visible');
        setTimeout(() => {
            el.classList.add('reveal-complete');
        }, 800);
    });

    /* ── 3. Active Nav Link Highlight, Parallax & Progress Ring (Unified rAF Scroll Loop) ── */
    const navLinks = document.querySelectorAll('header nav a');
    const sections = Array.from(document.querySelectorAll('section[id]'));
    const workSec = document.getElementById('work');
    const stickyTitle = document.querySelector('.sticky-work-title');
    const scrollBtn = document.getElementById('scrollToTopBtn');
    const progressCircle = document.getElementById('scrollProgressCircle');
    const circumference = 2 * Math.PI * 20; // ~125.66

    let isClickScrolling = false;
    let clickTimeout = null;
    let activeNavId = 'home';
    let scrollBtnVisible = false;

    // Cached layout metrics to prevent synchronous reflows during scroll
    let winH = window.innerHeight;
    let winW = window.innerWidth;
    let docH = document.documentElement.scrollHeight;
    let sectionBounds = [];
    let workTop = 0;
    let workHeight = 0;

    function cacheLayoutMetrics() {
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        winH = window.innerHeight;
        winW = window.innerWidth;
        docH = document.documentElement.scrollHeight;

        sectionBounds = sections.map((sec) => {
            const rect = sec.getBoundingClientRect();
            return {
                id: sec.id,
                top: rect.top + scrollY,
                bottom: rect.bottom + scrollY
            };
        });

        if (workSec) {
            const rect = workSec.getBoundingClientRect();
            workTop = rect.top + scrollY;
            workHeight = rect.height;
        }
    }

    function setActiveNav(targetId) {
        if (activeNavId === targetId) return;
        activeNavId = targetId;
        navLinks.forEach((link) => {
            const href = link.getAttribute('href');
            if (href === `#${targetId}`) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Click handler for instant active highlight & smooth scroll
    navLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                const targetId = href.substring(1);
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    e.preventDefault();
                    setActiveNav(targetId);

                    isClickScrolling = true;
                    if (clickTimeout) clearTimeout(clickTimeout);

                    targetSection.scrollIntoView({ behavior: 'smooth' });

                    clickTimeout = setTimeout(() => {
                        isClickScrolling = false;
                        onScrollTick();
                    }, 800);
                }
            }
        });
    });

    // Also support logo click to jump to #home
    const logoLink = document.querySelector('header .logo');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            const homeSection = document.getElementById('home');
            if (homeSection) {
                e.preventDefault();
                setActiveNav('home');
                isClickScrolling = true;
                if (clickTimeout) clearTimeout(clickTimeout);
                homeSection.scrollIntoView({ behavior: 'smooth' });
                clickTimeout = setTimeout(() => {
                    isClickScrolling = false;
                    onScrollTick();
                }, 800);
            }
        });
    }

    if (scrollBtn) {
        scrollBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    let scrollTicking = false;

    function onScrollTick() {
        scrollTicking = false;
        const scrollY = window.scrollY || document.documentElement.scrollTop;

        /* A. Pause background canvas when opaque sections (#work, #contact, footer) cover viewport */
        if (typeof window.__setBgCanvasVisible === 'function' && workSec) {
            window.__setBgCanvasVisible(scrollY < workTop);
        }

        /* B. Active Navigation Spy */
        if (!isClickScrolling) {
            if (scrollY < 180) {
                setActiveNav('home');
            } else if (scrollY + winH >= docH - 50) {
                setActiveNav('contact');
            } else {
                const readingLine = scrollY + 120;
                let currentId = 'home';
                for (let i = 0; i < sectionBounds.length; i++) {
                    const b = sectionBounds[i];
                    if (b.top <= readingLine && b.bottom > readingLine) {
                        currentId = b.id;
                    }
                }
                setActiveNav(currentId);
            }
        }

        /* C. Parallax Scroll Tracking for Selected Work Title (desktop only) */
        if (workSec && stickyTitle && winW > 768) {
            const relTop = workTop - scrollY;
            const relBottom = relTop + workHeight;
            const totalDist = workHeight - winH;

            if (totalDist > 0 && relTop <= 0 && relBottom >= winH) {
                const progress = Math.min(Math.max(-relTop / totalDist, 0), 1);
                const ty = (-4 + progress * 8).toFixed(2);
                const sc = (1 - progress * 0.04).toFixed(3);
                const op = (0.95 - progress * 0.15).toFixed(3);
                stickyTitle.style.transform = `translate3d(0, ${ty}vh, 0) scale(${sc})`;
                stickyTitle.style.opacity = op;
            } else if (relTop > 0) {
                stickyTitle.style.transform = 'translate3d(0, -4vh, 0) scale(1)';
                stickyTitle.style.opacity = '0.95';
            }
        }

        /* D. Auto Scroll Up Button & Circular Progress Ring */
        if (scrollBtn) {
            const shouldShow = scrollY > 260;
            if (shouldShow !== scrollBtnVisible) {
                scrollBtnVisible = shouldShow;
                scrollBtn.classList.toggle('visible', shouldShow);
            }

            const maxScroll = docH - winH;
            if (progressCircle && maxScroll > 0 && shouldShow) {
                const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
                const offset = (circumference - progress * circumference).toFixed(2);
                progressCircle.style.strokeDashoffset = offset;
            }
        }
    }

    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            scrollTicking = true;
            requestAnimationFrame(onScrollTick);
        }
    }, { passive: true });

    let layoutResizeTimer = null;
    window.addEventListener('resize', () => {
        if (layoutResizeTimer) clearTimeout(layoutResizeTimer);
        layoutResizeTimer = setTimeout(() => {
            cacheLayoutMetrics();
            onScrollTick();
        }, 120);
    }, { passive: true });

    window.addEventListener('load', () => {
        cacheLayoutMetrics();
        onScrollTick();
    }, { once: true });

    cacheLayoutMetrics();
    onScrollTick();
})();
