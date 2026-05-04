// ROLE TOGGLE
document.addEventListener('DOMContentLoaded', function() {
    const roleToggle = document.getElementById('roleToggle');
    if (!roleToggle) return;
    
    const roleBtns = roleToggle.querySelectorAll('.role-btn');
    const headerRoleText = document.querySelector('.header-role-text');
    let currentObserver = null;

    function initObserver() {
        if (currentObserver) currentObserver.disconnect();
        const isLawyer = document.body.classList.contains('lawyer-mode');
        const visibleSections = Array.from(document.querySelectorAll('.section')).filter(el => {
            if (isLawyer) {
                return el.classList.contains('lawyer-only');
            }
            return !el.classList.contains('lawyer-only');
        });
        
        currentObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    document.querySelectorAll('.sidebar-link').forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                    });
                }
            });
        }, { rootMargin: '-80px 0px -70% 0px' });
        
        visibleSections.forEach(s => currentObserver.observe(s));
    }

    roleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            roleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const role = btn.dataset.role;
            if (role === 'lawyer') {
                document.body.classList.add('lawyer-mode');
                headerRoleText.textContent = 'адвоката';
            } else {
                document.body.classList.remove('lawyer-mode');
                headerRoleText.textContent = 'прокурора';
            }
            clearSearch();
            initObserver();
            setTimeout(() => {
                const firstSection = role === 'lawyer'
                    ? document.getElementById('lawyer-quick')
                    : document.getElementById('quick');
                if (firstSection) {
                    firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 100);
        });
    });

    initObserver();

    // SIDEBAR COLLAPSIBLE GROUPS
    document.querySelectorAll('.sidebar-group-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.closest('.sidebar-group').classList.toggle('collapsed');
        });
    });

    // BACK TO TOP
    const backToTop = document.createElement('div');
    backToTop.className = 'back-to-top';
    backToTop.innerHTML = '&#9650;';
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(backToTop);

    window.addEventListener('scroll', () => {
        backToTop.classList.toggle('visible', window.scrollY > 400);
    });

    // COPY BUTTON
    window.copyText = function(btn) {
        const textBlock = btn.nextElementSibling;
        const text = textBlock.textContent.trim();
        navigator.clipboard.writeText(text).then(() => {
            btn.textContent = 'Скопировано!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = 'Копировать';
                btn.classList.remove('copied');
            }, 2000);
        });
    };

    // Smooth scroll for sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // SEARCH FUNCTIONALITY
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchNav = document.getElementById('searchNav');
    const searchCount = document.getElementById('searchCount');
    const searchPrev = document.getElementById('searchPrev');
    const searchNext = document.getElementById('searchNext');
    const searchClose = document.getElementById('searchClose');
    const headerSearch = document.getElementById('headerSearch');
    const content = document.querySelector('.content');

    let highlights = [];
    let currentIndex = -1;

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
        if (e.key === 'Escape') {
            clearSearch();
            searchInput.blur();
        }
        if (highlights.length > 0 && e.key === 'Enter') {
            e.preventDefault();
            navigateSearch(e.shiftKey ? -1 : 1);
        }
    });

    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => performSearch(searchInput.value), 150);
    });

    if (searchPrev) searchPrev.addEventListener('click', () => navigateSearch(-1));
    if (searchNext) searchNext.addEventListener('click', () => navigateSearch(1));
    if (searchClose) searchClose.addEventListener('click', () => { clearSearch(); searchInput.blur(); });

    function clearSearch() {
        clearHighlights();
        clearDimming();
        highlights = [];
        currentIndex = -1;
        if (searchNav) searchNav.classList.remove('visible');
        if (headerSearch) headerSearch.classList.remove('has-results');
        searchInput.value = '';
        if (searchCount) searchCount.textContent = '0 / 0';
    }

    function clearHighlights() {
        if (!content) return;
        content.querySelectorAll('mark.search-highlight, mark.search-current').forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    }

    function clearDimming() {
        if (!content) return;
        content.querySelectorAll('.search-dim').forEach(el => el.classList.remove('search-dim'));
        content.querySelectorAll('.search-section-match').forEach(el => el.classList.remove('search-section-match'));
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function getVisibleSections() {
        const isLawyer = document.body.classList.contains('lawyer-mode');
        return Array.from(content.querySelectorAll('.section, details, .card, .scenario, .alert, .miranda, .page-title')).filter(el => {
            if (el.classList.contains('lawyer-only') && !isLawyer) return false;
            if (el.classList.contains('prosecutor-only') && isLawyer) return false;
            return true;
        });
    }

    function performSearch(query) {
        clearHighlights();
        clearDimming();
        highlights = [];
        currentIndex = -1;

        if (!query || query.trim().length < 2) {
            if (searchNav) searchNav.classList.remove('visible');
            if (headerSearch) headerSearch.classList.remove('has-results');
            if (searchCount) searchCount.textContent = '0 / 0';
            return;
        }

        const term = query.trim().toLowerCase();
        const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
        const searchables = getVisibleSections();
        let hasAny = false;

        searchables.forEach(el => {
            if (el.textContent.toLowerCase().includes(term)) hasAny = true;
        });

        if (!hasAny) {
            if (searchNav) searchNav.classList.remove('visible');
            if (headerSearch) headerSearch.classList.remove('has-results');
            if (searchCount) searchCount.textContent = '0 / 0';
            searchables.forEach(el => el.classList.add('search-dim'));
            return;
        }

        searchables.forEach(el => {
            if (!el.textContent.toLowerCase().includes(term)) {
                el.classList.add('search-dim');
            } else {
                if (el.classList.contains('section') || el.tagName === 'DETAILS') {
                    el.classList.add('search-section-match');
                }
                highlightText(el, regex);
            }
        });

        highlights = Array.from(content.querySelectorAll('mark.search-highlight'));

        if (highlights.length > 0) {
            currentIndex = 0;
            updateCurrentHighlight();
            updateCount();
            if (searchNav) searchNav.classList.add('visible');
            if (headerSearch) headerSearch.classList.add('has-results');
            highlights[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function highlightText(element, regex) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (node.parentNode.tagName === 'SCRIPT' ||
                    node.parentNode.tagName === 'STYLE' ||
                    node.parentNode.tagName === 'MARK') {
                    return NodeFilter.FILTER_REJECT;
                }
                return regex.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });

        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        textNodes.forEach(node => {
            const span = document.createElement('span');
            span.innerHTML = node.textContent.replace(regex, '<mark class="search-highlight">$1</mark>');
            node.parentNode.replaceChild(span, node);

            span.querySelectorAll('mark.search-highlight').forEach(mark => highlights.push(mark));

            while (span.childNodes.length > 0) {
                span.parentNode.insertBefore(span.childNodes[0], span);
            }
            span.parentNode.removeChild(span);
        });
    }

    function navigateSearch(direction) {
        if (highlights.length === 0) return;
        currentIndex = (currentIndex + direction + highlights.length) % highlights.length;
        updateCurrentHighlight();
        updateCount();
        highlights[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        const parentDetails = highlights[currentIndex].closest('details');
        if (parentDetails && !parentDetails.open) parentDetails.open = true;
    }

    function updateCurrentHighlight() {
        highlights.forEach((h, i) => {
            h.className = i === currentIndex ? 'search-current' : 'search-highlight';
        });
    }

    function updateCount() {
        if (searchCount) searchCount.textContent = `${currentIndex + 1} / ${highlights.length}`;
    }

    // HEADER PROGRESS BAR
    const headerProgress = document.createElement('div');
    headerProgress.className = 'header-progress';
    const header = document.querySelector('.header');
    if (header) header.appendChild(headerProgress);

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        headerProgress.style.width = progress + '%';
    }, { passive: true });

    // SCROLL-TRIGGERED SECTION ANIMATIONS
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                sectionObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.section').forEach(section => {
        sectionObserver.observe(section);
    });

    // RE-OBSERVE SECTIONS ON ROLE TOGGLE
    const originalInitObserver = initObserver;
    initObserver = function() {
        originalInitObserver();
        document.querySelectorAll('.section:not(.animate-in)').forEach(section => {
            sectionObserver.observe(section);
        });
    };
});
