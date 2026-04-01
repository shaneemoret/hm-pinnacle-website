(function(){
        'use strict';
        const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const IS_DESKTOP = window.matchMedia('(min-width: 900px)').matches;

        /* ============================================
           1. NAVIGATION — scroll hide/show
           ============================================ */
        const nav = document.getElementById('nav');
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const st = window.pageYOffset;
            if (st > 80) nav.classList.add('scrolled');
            else nav.classList.remove('scrolled');
            lastScroll = st;
        }, { passive: true });

        /* ============================================
           2. HAMBURGER MENU
           ============================================ */
        const hamburger = document.getElementById('hamburger');
        const navLinksEl = document.getElementById('navLinks');
        if (hamburger && navLinksEl) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navLinksEl.classList.toggle('open');
            });
            navLinksEl.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navLinksEl.classList.remove('open');
                });
            });
        }

        const servicesNavToggle = document.getElementById('servicesNavToggle');
        const servicesNavItem = servicesNavToggle ? servicesNavToggle.closest('.nav-item') : null;
        if (servicesNavToggle && servicesNavItem) {
            servicesNavToggle.addEventListener('click', (event) => {
                event.preventDefault();
                const isOpen = servicesNavItem.classList.toggle('is-open');
                servicesNavToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });

            document.addEventListener('click', (event) => {
                if (!servicesNavItem.contains(event.target)) {
                    servicesNavItem.classList.remove('is-open');
                    servicesNavToggle.setAttribute('aria-expanded', 'false');
                }
            });

            servicesNavItem.querySelectorAll('.nav-submenu a').forEach(link => {
                link.addEventListener('click', () => {
                    servicesNavItem.classList.remove('is-open');
                    servicesNavToggle.setAttribute('aria-expanded', 'false');
                });
            });
        }

        /* ============================================
           4. SMOOTH SCROLL — anchor links
           ============================================ */
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const top = target.getBoundingClientRect().top + window.pageYOffset - 80;
                    window.scrollTo({ top, behavior: 'smooth' });
                }
            });
        });

        /* ============================================
           6. MASTER INTERSECTION OBSERVER ENGINE
           Handles: .reveal, .section-divider,
           .pov-cascade, .pov-callout, .serve-stats,
           .serve-tags, .big-stat-stack, .ch-tags,
           .approach-steps, [data-blur-in]
           ============================================ */
        if (!REDUCED) {
            // Standard reveal observer
            const revealObs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) entry.target.classList.add('visible');
                });
            }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

            document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .section-divider').forEach(el => {
                revealObs.observe(el);
            });

            // In-view observer (for staggered group animations)
            const inViewObs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        inViewObs.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '0px 0px -40px 0px', threshold: 0.15 });

            document.querySelectorAll(
                '.pov-cascade, .pov-callout, .serve-stats, .serve-tags, ' +
                '.big-stat-stack, .ch-tags, .approach-steps, [data-blur-in], [data-stagger-list]'
            ).forEach(el => inViewObs.observe(el));
        } else {
            // Reduced motion: make everything visible immediately
            document.querySelectorAll(
                '.reveal, .reveal-left, .reveal-right, .reveal-scale, .section-divider'
            ).forEach(el => el.classList.add('visible'));
            document.querySelectorAll(
                '.pov-cascade, .pov-callout, .serve-stats, .serve-tags, ' +
                '.big-stat-stack, .ch-tags, .approach-steps'
            ).forEach(el => el.classList.add('in-view'));
        }

        /* ============================================
           7. BENEFITS BARS — scroll-triggered grow
           ============================================ */
        const benefitsBars = document.querySelectorAll('.benefits-bar');
        if (benefitsBars.length) {
            const barsObs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        benefitsBars.forEach(bar => {
                            bar.style.animationDelay = bar.style.getPropertyValue('--delay') || '0s';
                            bar.classList.add('animate');
                        });
                        barsObs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 });
            const benefitsEl = document.querySelector('.benefits');
            if (benefitsEl) barsObs.observe(benefitsEl);
        }

        /* ============================================
           8. PARALLAX ENGINE — multi-layer depth
           GPU-accelerated, debounced at 60fps
           ============================================ */
        if (IS_DESKTOP && !REDUCED) {
            // Parallax for background elements
            const parallaxBgs = document.querySelectorAll('.parallax-bg');
            // Parallax for sections: hero bg, dark sections get subtle shift
            const parallaxSections = [
                { el: document.querySelector('.hero-bg'), speed: 0.3 },
                { el: document.querySelector('.pov-section::before'), speed: 0.15 },
            ].filter(p => p.el);

            let pTicking = false;
            window.addEventListener('scroll', () => {
                if (!pTicking) {
                    requestAnimationFrame(() => {
                        const scrollTop = window.pageYOffset;
                        // Legacy parallax backgrounds
                        parallaxBgs.forEach(bg => {
                            const section = bg.parentElement;
                            const rect = section.getBoundingClientRect();
                            const sectionTop = rect.top + scrollTop;
                            const offset = (scrollTop - sectionTop) * 0.4;
                            bg.style.transform = 'translateY(' + offset + 'px)';
                        });
                        // Section-level subtle parallax
                        parallaxSections.forEach(p => {
                            const rect = p.el.getBoundingClientRect();
                            if (rect.bottom > 0 && rect.top < window.innerHeight) {
                                const offset = rect.top * p.speed;
                                p.el.style.transform = 'translateY(' + offset + 'px)';
                            }
                        });
                        pTicking = false;
                    });
                    pTicking = true;
                }
            }, { passive: true });
        }

        /* ============================================
           9. INTERACTIVE CURSOR GLOW — hero + buttons
           ============================================ */
        if (IS_DESKTOP && !REDUCED) {
            const hero = document.getElementById('hero');
            if (hero) {
                hero.addEventListener('mousemove', (e) => {
                    const rect = hero.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    const bg = hero.querySelector('.hero-bg');
                    if (bg) bg.style.background =
                        'radial-gradient(circle at '+x+'% '+y+'%, rgba(168,212,240,0.08) 0%, transparent 40%),' +
                        'radial-gradient(ellipse at 20% 50%, rgba(30,80,144,0.3) 0%, transparent 60%),' +
                        'radial-gradient(ellipse at 80% 20%, rgba(168,212,240,0.1) 0%, transparent 50%),' +
                        'linear-gradient(180deg, var(--navy-darkest) 0%, var(--navy-dark) 50%, var(--navy) 100%)';
                });
            }
            // Button cursor glow tracking
            document.querySelectorAll('.btn-primary').forEach(btn => {
                btn.addEventListener('mousemove', (e) => {
                    const rect = btn.getBoundingClientRect();
                    btn.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
                    btn.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
                });
            });
        }

        /* ============================================
           10. COUNTER ANIMATION — stat numbers
           ============================================ */
        function animateCounters() {
            document.querySelectorAll('.intro-stat-number').forEach(el => {
                const text = el.textContent;
                const match = text.match(/(\d+)/);
                if (!match) return;
                const target = parseInt(match[1]);
                const suffix = text.replace(match[1], '');
                let current = 0;
                const increment = Math.ceil(target / 60);
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) { current = target; clearInterval(timer); }
                    el.textContent = current + suffix;
                }, 20);
            });
        }
        const statsSection = document.querySelector('.intro-stat-row');
        if (statsSection) {
            const statsObs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) { animateCounters(); statsObs.unobserve(entry.target); }
                });
            }, { threshold: 0.3 });
            statsObs.observe(statsSection);
        }

        /* ============================================
           11. AEROSPACE BACKGROUND PLANES — fade in
           ============================================ */
        const aeroSection = document.querySelector('.aero-section');
        if (aeroSection) {
            const aeroPlanes = aeroSection.querySelectorAll('.aero-bg-plane, .aero-bg-contrail');
            const aeroObs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        aeroPlanes.forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 200));
                        aeroObs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.15 });
            aeroObs.observe(aeroSection);
        }

        /* ============================================
           12. WHEN TO ENGAGE — ACTIVE CARD EXPANDS
           ============================================ */
        (function() {
            const cards = Array.from(document.querySelectorAll('.when-engage .engage-card'));
            if (!cards.length) return;

            const isMobile = window.matchMedia('(max-width: 900px)').matches;
            if (REDUCED || isMobile) {
                cards.forEach(card => card.classList.remove('is-active'));
                return;
            }

            function setActive(nextCard) {
                cards.forEach(card => card.classList.toggle('is-active', card === nextCard));
            }

            setActive(cards[0]);

            const cardObs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) setActive(entry.target);
                });
            }, {
                root: null,
                rootMargin: '-35% 0px -35% 0px',
                threshold: 0
            });

            cards.forEach(card => cardObs.observe(card));
        })();

        /* ============================================
           13. INDUSTRY CALCULATOR SELECTOR
           ============================================ */
        (function() {
            const tabs = Array.from(document.querySelectorAll('[data-industry-target]'));
            const panels = Array.from(document.querySelectorAll('.industry-panel'));
            const copyPanels = Array.from(document.querySelectorAll('[data-industry-copy-panel]'));
            if (!tabs.length || !panels.length) return;

            const aeroPanel = document.getElementById('ind-aero');
            const aeroBackground = aeroPanel ? aeroPanel.querySelectorAll('.aero-bg-plane, .aero-bg-contrail') : [];

            function revealAeroBackground() {
                aeroBackground.forEach((el, index) => {
                    setTimeout(() => el.classList.add('visible'), index * 150);
                });
            }

            function setActive(panelId, options = {}) {
                const targetPanel = document.getElementById(panelId);
                if (!targetPanel) return;

                tabs.forEach(tab => {
                    const isActive = tab.dataset.industryTarget === panelId;
                    tab.classList.toggle('is-active', isActive);
                    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
                    tab.setAttribute('tabindex', isActive ? '0' : '-1');
                });

                copyPanels.forEach(copyPanel => {
                    const isActive = copyPanel.dataset.industryCopyPanel === panelId;
                    copyPanel.classList.toggle('is-active', isActive);
                    copyPanel.hidden = !isActive;
                });

                panels.forEach(panel => {
                    const isActive = panel.id === panelId;
                    panel.classList.toggle('is-active', isActive);
                    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
                });

                if (panelId === 'ind-aero') {
                    revealAeroBackground();
                }

                if (options.syncHash) {
                    history.replaceState(null, '', '#' + panelId);
                }
            }

            tabs.forEach((tab, index) => {
                tab.addEventListener('click', () => {
                    setActive(tab.dataset.industryTarget, { syncHash: true });
                });

                tab.addEventListener('keydown', (event) => {
                    let nextIndex = null;
                    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
                    if (event.key === 'Home') nextIndex = 0;
                    if (event.key === 'End') nextIndex = tabs.length - 1;
                    if (nextIndex === null) return;
                    event.preventDefault();
                    tabs[nextIndex].focus();
                    setActive(tabs[nextIndex].dataset.industryTarget, { syncHash: true });
                });
            });

            const startingPanel = window.location.hash === '#ind-aero' ? 'ind-aero' : 'ind-mfg';
            setActive(startingPanel);

            window.addEventListener('hashchange', () => {
                const hash = window.location.hash.replace('#', '');
                if (hash === 'ind-mfg' || hash === 'ind-aero') {
                    setActive(hash);
                }
            });
        })();

        /* ============================================
           14. MANUFACTURING CALCULATOR
           ============================================ */
        (function() {
            const slider = document.getElementById('calcSlider');
            const employeeInput = document.getElementById('employeeInput');
            const trackFill = document.getElementById('trackFill');
            const sliderDisplay = document.getElementById('sliderDisplay');
            const heroSavings = document.getElementById('heroSavings');
            const breakPeople = document.getElementById('breakPeople');
            const breakCost = document.getElementById('breakCost');
            const breakNewRate = document.getElementById('breakNewRate');
            if (!slider || !employeeInput) return;
            const BASE = 0.38, COST = 45236;
            function fmt(n) {
                if (n >= 1e6) { const m = (n/1e6).toFixed(1); return m.endsWith('.0') ? m.slice(0,-2)+'M' : m+'M'; }
                return Math.round(n/1000)+'K';
            }
            function update() {
                const pts = parseInt(slider.value);
                let sz = parseInt(employeeInput.value) || 200;
                sz = Math.max(10, Math.min(5000, sz));
                const saved = Math.round(sz * pts / 100);
                const money = saved * COST;
                const nr = Math.max(0, Math.round((BASE - pts/100) * 100));
                sliderDisplay.innerHTML = pts + '<span>pts</span>';
                trackFill.style.width = ((pts-1)/24*100) + '%';
                heroSavings.innerHTML = '<span class="ice">$</span>' + fmt(money);
                breakPeople.textContent = saved;
                breakCost.textContent = '$' + Math.round(COST/1000) + 'K';
                breakNewRate.textContent = nr + '%';
                // Glow pulse on hero result
                const hero = heroSavings.closest('.calc-result-hero');
                if (hero) { hero.classList.add('glow'); setTimeout(() => hero.classList.remove('glow'), 400); }
                // Dynamic description
                const mfgFull = document.querySelector('.mfg-section .calc-break-full');
                if (mfgFull) {
                    const t = mfgFull.querySelector('.calc-break-title');
                    const d = mfgFull.querySelector('.calc-break-desc');
                    if (t) t.textContent = 'Your new turnover rate \u2014 down from 38%';
                    if (d) {
                        if (nr <= 15) d.textContent = 'Elite retention levels. Workforce stability is now a competitive advantage \u2014 your competitors are still churning.';
                        else if (nr <= 20) d.textContent = 'Below 20%. Production scheduling, quality output, and safety metrics all measurably improve at this level.';
                        else if (nr <= 25) d.textContent = 'Approaching the inflection point. Every additional point you drop accelerates gains in production consistency and team cohesion.';
                        else d.textContent = 'Every point you drop moves you closer to workforce stability. Below 20%, production scheduling, quality, and safety all measurably improve.';
                    }
                }
                const sp = document.getElementById('statPeopleLost');
                const sc = document.getElementById('statAnnualCost');
                const loss = Math.round(sz * BASE);
                if (sp) sp.innerHTML = '<span class="ice">' + loss + '</span>';
                if (sc) sc.innerHTML = '<span class="ice">$' + fmt(loss * COST) + '</span>';
                const echo = document.getElementById('headcountEcho');
                if (echo) echo.textContent = sz;
            }
            slider.addEventListener('input', update);
            employeeInput.addEventListener('input', update);
            employeeInput.addEventListener('focus', function() { this.select(); });
            update();
        })();

        /* ============================================
           15. AEROSPACE CALCULATOR
           ============================================ */
        (function() {
            const slider = document.getElementById('aeroCalcSlider');
            const employeeInput = document.getElementById('aeroEmployeeInput');
            const trackFill = document.getElementById('aeroTrackFill');
            const sliderDisplay = document.getElementById('aeroSliderDisplay');
            const heroSavings = document.getElementById('aeroHeroSavings');
            const breakPeople = document.getElementById('aeroBreakPeople');
            const breakCost = document.getElementById('aeroBreakCost');
            const breakNewRate = document.getElementById('aeroBreakNewRate');
            const rateTitle = document.getElementById('aeroRateTitle');
            const rateDescEl = document.getElementById('aeroRateDesc');
            if (!slider || !employeeInput) return;
            const BASE = 0.35, COST = 80000;
            function fmt(n) {
                if (n >= 1e6) { const m = (n/1e6).toFixed(1); return m.endsWith('.0') ? m.slice(0,-2)+'M' : m+'M'; }
                return Math.round(n/1000)+'K';
            }
            function update() {
                const pts = parseInt(slider.value);
                let sz = parseInt(employeeInput.value) || 180;
                sz = Math.max(10, Math.min(5000, sz));
                const saved = Math.round(sz * pts / 100);
                const money = saved * COST;
                const nr = Math.max(0, Math.round((BASE - pts/100) * 100));
                sliderDisplay.innerHTML = pts + '<span>pts</span>';
                trackFill.style.width = ((pts-1)/24*100) + '%';
                heroSavings.innerHTML = '<span class="ice">$</span>' + fmt(money);
                breakPeople.textContent = saved;
                breakCost.textContent = '$' + Math.round(COST/1000) + 'K';
                breakNewRate.textContent = nr + '%';
                // Glow pulse
                const hero = heroSavings.closest('.calc-result-hero');
                if (hero) { hero.classList.add('glow'); setTimeout(() => hero.classList.remove('glow'), 400); }
                if (rateTitle) rateTitle.textContent = 'Your new turnover rate \u2014 down from 35%';
                if (rateDescEl) {
                    if (nr <= 10) rateDescEl.textContent = 'Elite retention. Your cleared workforce is now a strategic moat \u2014 competitors cannot replicate what stays on your floor.';
                    else if (nr <= 15) rateDescEl.textContent = 'At industry average for overall aerospace. Critical roles are now stable \u2014 program timelines hold, compliance is maintained.';
                    else if (nr <= 20) rateDescEl.textContent = 'Approaching stability. Every additional point protects program margins, reduces certification ramp-up costs, and strengthens AS9100 audit readiness.';
                    else rateDescEl.textContent = 'Every point you drop protects program timelines, maintains AS9100 compliance, and reduces the cascading cost of capability gaps.';
                }
                const sp = document.getElementById('aeroStatPeopleLost');
                const sc = document.getElementById('aeroStatAnnualCost');
                const loss = Math.round(sz * BASE);
                if (sp) sp.innerHTML = '<span class="ice">' + loss + '</span>';
                if (sc) sc.innerHTML = '<span class="ice">$' + fmt(loss * COST) + '</span>';
                const echo = document.getElementById('aeroHeadcountEcho');
                if (echo) echo.textContent = sz;
            }
            slider.addEventListener('input', update);
            employeeInput.addEventListener('input', update);
            employeeInput.addEventListener('focus', function() { this.select(); });
            update();
        })();

        /* ============================================
           16. CASE STUDIES TABS + STAT PROPAGATION
           ============================================ */
        (function() {
            const tabs = Array.from(document.querySelectorAll('[data-case-tab]'));
            const entries = Array.from(document.querySelectorAll('.cs-entry[data-case-category]'));
            const panelHeading = document.getElementById('csPanelHeading');
            const mainStats = document.getElementById('csMainStats');
            const testimonialsPanel = document.getElementById('csTestimonialsPanel');
            const splitImage = document.getElementById('csSplitImage');
            const splitImageCaption = document.getElementById('csSplitImageCaption');
            const stat1Value = document.getElementById('csStat1Value');
            const stat2Value = document.getElementById('csStat2Value');
            const stat3Value = document.getElementById('csStat3Value');
            const stat1Label = document.getElementById('csStat1Label');
            const stat2Label = document.getElementById('csStat2Label');
            const stat3Label = document.getElementById('csStat3Label');

            if (!tabs.length || !entries.length || !panelHeading || !mainStats || !testimonialsPanel || !splitImage || !splitImageCaption || !stat1Value || !stat2Value || !stat3Value || !stat1Label || !stat2Label || !stat3Label) return;

            const CASE_DATA = {
                all: {
                    heading: 'Case Studies',
                    stats: [
                        { value: '3', label: 'Verified Case Studies' },
                        { value: '1,610+', label: 'Employees Across Cases' },
                        { value: '$6.15M+', label: 'Documented Financial Impact' }
                    ],
                    image: 'images/heather.jpg',
                    caption: 'Verified Results • CEO References Available',
                    imageMode: 'portrait'
                },
                aerospace: {
                    heading: 'Aerospace Case Study',
                    stats: [
                        { value: '24%', label: 'Turnover Reduction' },
                        { value: '$4.8M', label: 'Annual Savings Recovered' },
                        { value: '16 Mo.', label: 'To Growth Readiness' }
                    ],
                    image: 'images/aerospace-case-study.jpg',
                    caption: '',
                    imageMode: 'tech'
                },
                manufacturing: {
                    heading: 'Manufacturing Case Study',
                    stats: [
                        { value: '65% -> 10%', label: 'Turnover Shift' },
                        { value: '$1.35M', label: 'Bottom-Line Swing' },
                        { value: '5 Years', label: 'Sustained Retention Impact' }
                    ],
                    image: 'images/manufacturing-case-study.jpg',
                    caption: '',
                    imageMode: 'tech'
                },
                healthcare: {
                    heading: 'Healthcare Case Study',
                    stats: [
                        { value: '0', label: 'Early Departures' },
                        { value: '102', label: 'Residents Rehomed' },
                        { value: '$0', label: 'Compliance Penalties' }
                    ],
                    image: 'images/healthcare-case-study.jpg',
                    caption: '',
                    imageMode: 'tech'
                },
                testimonials: {
                    heading: 'Testimonials',
                    stats: [
                        { value: '', label: '' },
                        { value: '', label: '' },
                        { value: '', label: '' }
                    ],
                    image: 'images/heather.jpg',
                    caption: 'Verified Results • CEO References Available',
                    imageMode: 'portrait'
                }
            };

            function setActiveTab(caseKey) {
                tabs.forEach(tab => {
                    const isActive = tab.dataset.caseTab === caseKey;
                    tab.classList.toggle('is-active', isActive);
                    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
                });
            }

            function applyCase(caseKey) {
                const key = CASE_DATA[caseKey] ? caseKey : 'all';
                const data = CASE_DATA[key];
                const showTestimonials = key === 'testimonials';
                panelHeading.textContent = data.heading;
                splitImage.style.backgroundImage = `url('${data.image}')`;
                splitImageCaption.textContent = data.caption;
                splitImage.classList.toggle('is-tech', data.imageMode === 'tech');

                if (!showTestimonials) {
                    stat1Value.textContent = data.stats[0].value;
                    stat2Value.textContent = data.stats[1].value;
                    stat3Value.textContent = data.stats[2].value;
                    stat1Label.textContent = data.stats[0].label;
                    stat2Label.textContent = data.stats[1].label;
                    stat3Label.textContent = data.stats[2].label;
                }

                mainStats.classList.toggle('is-hidden', showTestimonials);
                testimonialsPanel.classList.toggle('is-active', showTestimonials);

                entries.forEach(entry => {
                    const match = entry.dataset.caseCategory === key;
                    const shouldShow = !showTestimonials && (key === 'all' || match);
                    entry.classList.toggle('is-hidden', !shouldShow);
                });
            }

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const caseKey = tab.dataset.caseTab || 'all';
                    setActiveTab(caseKey);
                    applyCase(caseKey);
                });
            });

            setActiveTab('all');
            applyCase('all');
        })();

        /* ============================================
           16. SCROLL PROGRESS INDICATOR
           Thin line at top of viewport
           ============================================ */
        (function() {
            const bar = document.createElement('div');
            bar.style.cssText = 'position:fixed;top:0;left:0;height:2px;background:var(--accent-ice);z-index:10000;width:0;transition:none;pointer-events:none;opacity:0.7;';
            document.body.appendChild(bar);
            window.addEventListener('scroll', () => {
                const h = document.documentElement.scrollHeight - window.innerHeight;
                bar.style.width = (window.pageYOffset / h * 100) + '%';
            }, { passive: true });
        })();


    })();
