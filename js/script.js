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
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.05, rootMargin: '0px 0px 40px 0px' }
    );

    document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

    // Home section: trigger immediately since it is visible on load
    document.querySelectorAll('.home [data-reveal]').forEach((el) => {
        el.classList.add('is-visible');
    });

    /* ── 3. Active Nav Link Highlight on Scroll & Click ── */
    const navLinks = document.querySelectorAll('header nav a');
    const sections = document.querySelectorAll('section[id]');
    let isClickScrolling = false;
    let clickTimeout = null;

    function setActiveNav(targetId) {
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
                        updateScrollSpy();
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
                    updateScrollSpy();
                }, 800);
            }
        });
    }

    function updateScrollSpy() {
        if (isClickScrolling) return;

        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // Top of page -> Home
        if (scrollY < 180) {
            setActiveNav('home');
            return;
        }

        // Bottom of page -> Contact
        if (scrollY + windowHeight >= documentHeight - 50) {
            setActiveNav('contact');
            return;
        }

        // Header reading line offset
        const headerOffset = 120;
        let currentId = 'home';

        sections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= headerOffset && rect.bottom > headerOffset) {
                currentId = section.id;
            }
        });

        setActiveNav(currentId);
    }

    window.addEventListener('scroll', updateScrollSpy, { passive: true });
    updateScrollSpy();

    /* ── 4. Parallax Scroll Tracking for Selected Work Title ── */
    const workSec = document.getElementById('work');
    const stickyTitle = document.querySelector('.sticky-work-title');
    if (workSec && stickyTitle) {
        window.addEventListener('scroll', () => {
            const rect = workSec.getBoundingClientRect();
            const totalDist = rect.height - window.innerHeight;
            if (totalDist > 0 && rect.top <= 0 && rect.bottom >= window.innerHeight) {
                const progress = Math.min(Math.max(-rect.top / totalDist, 0), 1);
                stickyTitle.style.transform = `translateY(${-4 + progress * 8}vh) scale(${1 - progress * 0.04})`;
                stickyTitle.style.opacity = `${0.95 - progress * 0.15}`;
            } else if (rect.top > 0) {
                stickyTitle.style.transform = 'translateY(-4vh) scale(1)';
                stickyTitle.style.opacity = '0.95';
            }
        }, { passive: true });
    }

    /* ── 5. Auto Scroll Up Button & Progress Ring ── */
    const scrollBtn = document.getElementById('scrollToTopBtn');
    const progressCircle = document.getElementById('scrollProgressCircle');
    const circumference = 2 * Math.PI * 20; // ~125.66

    if (scrollBtn) {
        const updateScrollState = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;

            if (scrollTop > 260) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }

            if (progressCircle && docHeight > 0) {
                const progress = Math.min(Math.max(scrollTop / docHeight, 0), 1);
                const offset = circumference - (progress * circumference);
                progressCircle.style.strokeDashoffset = offset;
            }
        };

        window.addEventListener('scroll', updateScrollState, { passive: true });
        updateScrollState();

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
})();
