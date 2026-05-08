/* ============================================
   BURGHI.DESIGN — Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initOverlays();
    initSlideshows(document);
    initAutoplayVideos(document);
    initFooterCarousels();
    initFlatplanLightbox();
});

/* --- Overlay System --- */
function initOverlays() {
    // Project overlay links — event delegation on document
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-overlay]');
        if (trigger) {
            e.preventDefault();
            const targetId = trigger.getAttribute('data-overlay');
            // Close index overlay if open
            const indexOverlay = document.getElementById('index-overlay');
            if (indexOverlay) indexOverlay.classList.remove('active');
            openOverlay(targetId);
        }
    });

    // Close overlay buttons — event delegation (works with dynamically loaded content)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-close-overlay]');
        if (btn) {
            e.preventDefault();
            const activeOverlays = document.querySelectorAll('.overlay-backdrop.active, .footer-overlay.active, .index-overlay.active');
            if (activeOverlays.length === 0) {
                window.location.href = '/';
            } else {
                closeAllOverlays();
            }
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllOverlays();
    });


    // Footer overlay (Contacts) — toggle
    document.querySelectorAll('[data-footer-overlay]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const overlay = document.getElementById('footer-overlay');
            if (overlay) {
                overlay.classList.toggle('active');
                document.body.classList.toggle('no-scroll');
            }
        });
    });

    // Projects index overlay — toggle
    document.querySelectorAll('[data-index-overlay]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const overlay = document.getElementById('index-overlay');
            if (overlay) overlay.classList.toggle('active');
        });
    });
}

/* --- Project overlay lazy loading --- */
const overlayCache = new Set();

async function openOverlay(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;

    // If it's a project overlay and content not yet loaded, fetch it first
    if (overlay.classList.contains('project-overlay') && !overlayCache.has(id)) {
        await loadProjectContent(id, overlay);
    }

    closeAllOverlays();
    overlay.classList.add('active');
    document.body.classList.add('no-scroll');
    overlay.scrollTop = 0;

    // Start autoplay videos inside
    overlay.querySelectorAll('video[data-autoplay]').forEach(v => v.play().catch(() => {}));
}

async function loadProjectContent(id, overlay) {
    const projectName = id.replace('overlay-', '');
    const url = `projects/${projectName}.html`;

    try {
        const res = await fetch(url);
        if (!res.ok) return;

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const source = doc.querySelector('.project-standalone-inner');
        if (!source) return;

        // Fix paths: projects/<name>.html uses ../assets/ → assets/
        const stripParent = (val) => val && val.startsWith('../') ? val.slice(3) : val;
        source.querySelectorAll('[src]').forEach(el => el.setAttribute('src', stripParent(el.getAttribute('src'))));
        source.querySelectorAll('source[src]').forEach(el => el.setAttribute('src', stripParent(el.getAttribute('src'))));
        source.querySelectorAll('[href]').forEach(el => el.setAttribute('href', stripParent(el.getAttribute('href'))));

        // Inject into overlay
        const container = overlay.querySelector('.overlay-content-inner');
        if (container) {
            container.innerHTML = source.innerHTML;
        } else {
            // Fallback: inject directly into overlay-page > page-layout
            const page = overlay.querySelector('.page-layout');
            if (page) page.innerHTML = `<div class="overlay-content-inner">${source.innerHTML}</div>`;
        }

        overlayCache.add(id);

        // Init JS for newly loaded content
        initSlideshows(overlay);
        initAutoplayVideos(overlay);

    } catch (err) {
        console.warn(`Could not load project: ${url}`, err);
    }
}

function closeAllOverlays() {
    document.querySelectorAll('.overlay-backdrop.active, .footer-overlay.active, .index-overlay.active').forEach(o => {
        o.classList.remove('active');
    });
    document.body.classList.remove('no-scroll');
    document.querySelectorAll('.overlay-backdrop video').forEach(v => v.pause());
}

/* --- Flatplan Lightbox --- */
function initFlatplanLightbox() {
    // Create lightbox element once
    const lb = document.createElement('div');
    lb.id = 'flatplan-lightbox';
    lb.className = 'flatplan-lb';
    lb.innerHTML = '<button class="flatplan-lb-close" aria-label="Chiudi">( Chiudi )</button><img class="flatplan-lb-img" src="" alt="">';
    document.body.appendChild(lb);

    const lbImg = lb.querySelector('.flatplan-lb-img');
    const lbClose = lb.querySelector('.flatplan-lb-close');

    // Event delegation — works with dynamically loaded flatplan grids
    document.addEventListener('click', (e) => {
        const img = e.target.closest('.flatplan-grid img');
        if (img) {
            lbImg.src = img.src;
            lbImg.alt = img.alt;
            lb.classList.add('active');
        }
    });

    lbClose.addEventListener('click', () => lb.classList.remove('active'));
    lb.addEventListener('click', e => { if (e.target === lb) lb.classList.remove('active'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') lb.classList.remove('active'); });
}

/* --- Slideshow --- */
function initSlideshows(root) {
    root.querySelectorAll('.slideshow').forEach(slideshow => {
        const slides = slideshow.querySelectorAll('.slideshow-slides > *');
        if (slides.length <= 1) return;

        // Wrap each direct child in a slide div if not already
        const track = slideshow.querySelector('.slideshow-slides');
        const items = Array.from(track.children);

        // Wrap items that aren't already .slideshow-slide
        items.forEach(item => {
            if (!item.classList.contains('slideshow-slide')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'slideshow-slide';
                item.parentNode.insertBefore(wrapper, item);
                wrapper.appendChild(item);
            }
        });

        const wrappedSlides = track.querySelectorAll('.slideshow-slide');
        if (wrappedSlides.length <= 1) return;

        let current = 0;
        const autoplayDelay = parseFloat(slideshow.dataset.autoplay) || 0;
        const isFlipbook = slideshow.classList.contains('slideshow-flipbook');
        let interval = null;

        function goTo(index) {
            current = ((index % wrappedSlides.length) + wrappedSlides.length) % wrappedSlides.length;
            if (isFlipbook) {
                wrappedSlides.forEach((s, i) => s.classList.toggle('active', i === current));
            } else {
                track.style.transform = `translateX(-${current * 100}%)`;
            }
        }

        function next() { goTo(current + 1); }
        function prev() { goTo(current - 1); }

        if (isFlipbook) goTo(0);

        if (autoplayDelay > 0) {
            interval = setInterval(next, autoplayDelay * 1000);
        }

        if (isFlipbook) return;

        // Navigation arrows
        const prevBtn = document.createElement('button');
        const nextBtn = document.createElement('button');
        prevBtn.className = 'slideshow-arrow slideshow-arrow-prev';
        nextBtn.className = 'slideshow-arrow slideshow-arrow-next';
        prevBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        nextBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8.5 6L4.5 10" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        slideshow.appendChild(prevBtn);
        slideshow.appendChild(nextBtn);

        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            prev();
        });
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            next();
        });

        // Hover: pause autoplay, show arrows
        slideshow.addEventListener('mouseenter', () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        });
        slideshow.addEventListener('mouseleave', () => {
            if (autoplayDelay > 0) {
                interval = setInterval(next, autoplayDelay * 1000);
            }
        });

    });
}

/* --- Autoplay Videos --- */
function initAutoplayVideos(root) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.25 });

    root.querySelectorAll('video[data-autoplay]').forEach(video => {
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        observer.observe(video);
    });
}

/* --- Smooth scroll for anchor links --- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});


/* --- Footer Carousels (crossfade) --- */
function initFooterCarousels() {
    const footerImages = ["1 - dimensioni medie.jpeg", "7696f5d1-48d1-441f-96a0-fedff5be9982.jpg", "9477dd4c-928f-49c6-9fd8-772d077d0a34 - dimensioni medie.jpeg", "IMG_0026 - dimensioni medie.jpeg", "IMG_0085.jpg", "IMG_0148 - dimensioni medie.jpeg", "IMG_0389 - dimensioni medie.jpeg", "IMG_0437 - dimensioni medie.jpeg", "IMG_0465 - dimensioni medie.jpeg", "IMG_0545 - dimensioni medie.jpeg", "IMG_0569 - dimensioni medie.jpeg", "IMG_0582 - dimensioni medie.jpeg", "IMG_0586 - dimensioni medie.jpeg", "IMG_0659 - dimensioni medie.jpeg", "IMG_0746 - dimensioni medie.jpeg", "IMG_0752 - dimensioni medie.jpeg", "IMG_0834 - dimensioni medie.jpeg", "IMG_0988 - dimensioni medie.jpeg", "IMG_1007 - dimensioni medie.jpeg", "IMG_1021 - dimensioni medie.jpeg", "IMG_1182 - dimensioni medie.jpeg", "IMG_1191 - dimensioni medie.jpeg", "IMG_1232 - dimensioni medie.jpeg", "IMG_1247 - dimensioni medie.jpeg", "IMG_1279 - dimensioni medie.jpeg", "IMG_1282 - dimensioni medie.jpeg", "IMG_1379 - dimensioni medie.jpeg", "IMG_1407 - dimensioni medie.jpeg", "IMG_1568 - dimensioni medie.jpeg", "IMG_1576 - dimensioni medie.jpeg", "IMG_1578 - dimensioni medie.jpeg", "IMG_1681 - dimensioni medie.jpeg", "IMG_1728 - dimensioni medie.jpeg", "IMG_1739 - dimensioni medie.jpeg", "IMG_1745 - dimensioni medie.jpeg", "IMG_1768 - dimensioni medie.jpeg", "IMG_1818 - dimensioni medie.jpeg", "IMG_1830 - dimensioni medie.jpeg", "IMG_1836 - dimensioni medie.jpeg", "IMG_1963 - dimensioni medie.jpeg", "IMG_2061 - dimensioni medie.jpeg", "IMG_2106 - dimensioni medie.jpeg", "IMG_2200 - dimensioni medie.jpeg", "IMG_2236 - dimensioni medie.jpeg", "IMG_2298 - dimensioni medie.jpeg", "IMG_2387 - dimensioni medie.jpeg", "IMG_2554 - dimensioni medie.jpeg", "IMG_2629 - dimensioni medie.jpeg", "IMG_2635 - dimensioni medie.jpeg", "IMG_2689 - dimensioni medie.jpeg", "IMG_2847 - dimensioni medie.jpeg", "IMG_2958 - dimensioni medie.jpeg", "IMG_2984 - dimensioni medie.jpeg", "IMG_3017 - dimensioni medie.jpeg", "IMG_3086 - dimensioni medie.jpeg", "IMG_3088 - dimensioni medie.jpeg", "IMG_3235 - dimensioni medie.jpeg", "IMG_3306 - dimensioni medie.jpeg", "IMG_3337 - dimensioni medie.jpeg", "IMG_3367 - dimensioni medie.jpeg", "IMG_3462 - dimensioni medie.jpeg", "IMG_3466 - dimensioni medie.jpeg", "IMG_3498 - dimensioni medie.jpeg", "IMG_3521 - dimensioni medie.jpeg", "IMG_3528 - dimensioni medie.jpeg", "IMG_3646 - dimensioni medie.jpeg", "IMG_3692 - dimensioni medie.jpeg", "IMG_3810 - dimensioni medie.jpeg", "IMG_4385 - dimensioni medie.jpeg", "IMG_4407 - dimensioni medie.jpeg", "IMG_4445 - dimensioni medie.jpeg", "IMG_4536 - dimensioni medie.jpeg", "IMG_4614 - dimensioni medie.jpeg", "IMG_4805 - dimensioni medie.jpeg", "IMG_4824 - dimensioni medie.jpeg", "IMG_4850 - dimensioni medie.jpeg", "IMG_4863 - dimensioni medie.jpeg", "IMG_4869 - dimensioni medie.jpeg", "IMG_4901 - dimensioni medie.jpeg", "IMG_4972 - dimensioni medie.jpeg", "IMG_5075 - dimensioni medie.jpeg", "IMG_5077 - dimensioni medie.jpeg", "IMG_5088 - dimensioni medie.jpeg", "IMG_5097 - dimensioni medie.jpeg", "IMG_5102 - dimensioni medie.jpeg", "IMG_5135 - dimensioni medie.jpeg", "IMG_5141 - dimensioni medie.jpeg", "IMG_5148 - dimensioni medie.jpeg", "IMG_5154 - dimensioni medie.jpeg", "IMG_5245 - dimensioni medie.jpeg", "IMG_5269 - dimensioni medie.jpeg", "IMG_5282 - dimensioni medie.jpeg", "IMG_5285 - dimensioni medie.jpeg", "IMG_5291 - dimensioni medie.jpeg", "IMG_5502 - dimensioni medie.jpeg", "IMG_5535 - dimensioni medie.jpeg", "IMG_5614 - dimensioni medie.jpeg", "IMG_5615 - dimensioni medie.jpeg", "IMG_5772 - dimensioni medie.jpeg", "IMG_5816 - dimensioni medie.jpeg", "IMG_5872 - dimensioni medie.jpeg", "IMG_5950 - dimensioni medie.jpeg", "IMG_5951 - dimensioni medie.jpeg", "IMG_5975 - dimensioni medie.jpeg", "IMG_5983 - dimensioni medie.jpeg", "IMG_5986 - dimensioni medie.jpeg", "IMG_5998 - dimensioni medie.jpeg", "IMG_6067 - dimensioni medie.jpeg", "IMG_6152 - dimensioni medie.jpeg", "IMG_6155 - dimensioni medie.jpeg", "IMG_6158 - dimensioni medie.jpeg", "IMG_6158 copia - dimensioni medie.jpeg", "IMG_6204 - dimensioni medie.jpeg", "IMG_6208 - dimensioni medie.jpeg", "IMG_6225 - dimensioni medie.jpeg", "IMG_6280 - dimensioni medie.jpeg", "IMG_6306 - dimensioni medie.jpeg", "IMG_6321 - dimensioni medie.jpeg", "IMG_6360 - dimensioni medie.jpeg", "IMG_6384 - dimensioni medie.jpeg", "IMG_6400 - dimensioni medie.jpeg", "IMG_6409 - dimensioni medie.jpeg", "IMG_6456 - dimensioni medie.jpeg", "IMG_6499 - dimensioni medie.jpeg", "IMG_6500 - dimensioni medie.jpeg", "IMG_6505 - dimensioni medie.jpeg", "IMG_6507 - dimensioni medie.jpeg", "IMG_6542 - dimensioni medie.jpeg", "IMG_6544 - dimensioni medie.jpeg", "IMG_6555 - dimensioni medie.jpeg", "IMG_6561 - dimensioni medie.jpeg", "IMG_6569 - dimensioni medie.jpeg", "IMG_6586 - dimensioni medie.jpeg", "IMG_6593 - dimensioni medie.jpeg", "IMG_6600 - dimensioni medie.jpeg", "IMG_6602 - dimensioni medie.jpeg", "IMG_6609 - dimensioni medie.jpeg", "IMG_6629 - dimensioni medie.jpeg", "IMG_6647 - dimensioni medie.jpeg", "IMG_6653 - dimensioni medie.jpeg", "IMG_6653 copia - dimensioni medie.jpeg", "IMG_6661 - dimensioni medie.jpeg", "IMG_6695 - dimensioni medie.jpeg", "IMG_6719 - dimensioni medie.jpeg", "IMG_6723 - dimensioni medie.jpeg", "IMG_6725 - dimensioni medie.jpeg", "IMG_6748 - dimensioni medie.jpeg", "IMG_6750 - dimensioni medie.jpeg", "IMG_6754.jpg", "IMG_6759 - dimensioni medie.jpeg", "IMG_6765 - dimensioni medie.jpeg", "IMG_6766 - dimensioni medie.jpeg", "IMG_6767.jpg", "IMG_6770.jpg", "IMG_6776 - dimensioni medie.jpeg", "IMG_6803 - dimensioni medie.jpeg", "IMG_6807 - dimensioni medie.jpeg", "IMG_6810 - dimensioni medie.jpeg", "IMG_6822 - dimensioni medie.jpeg", "IMG_6824 - dimensioni medie.jpeg", "IMG_6831 - dimensioni medie.jpeg", "IMG_6858 - dimensioni medie.jpeg", "IMG_6862 - dimensioni medie.jpeg", "IMG_6870 - dimensioni medie.jpeg", "IMG_6878 - dimensioni medie.jpeg", "IMG_6908 - dimensioni medie.jpeg", "IMG_6910 - dimensioni medie.jpeg", "IMG_6917 - dimensioni medie.jpeg", "IMG_6919 - dimensioni medie.jpeg", "IMG_6931.jpg", "IMG_6936 - dimensioni medie.jpeg", "IMG_6951 - dimensioni medie.jpeg", "IMG_6958.jpg", "IMG_6964.jpg", "IMG_6968 - dimensioni medie.jpeg", "IMG_6969.jpg", "IMG_6972 - dimensioni medie.jpeg", "IMG_6999 - dimensioni medie.jpeg", "IMG_7008 - dimensioni medie.jpeg", "IMG_7031 - dimensioni medie.jpeg", "IMG_7032.jpg", "IMG_7047.jpg", "IMG_7088 - dimensioni medie.jpeg", "IMG_7093.jpg", "IMG_7097 - dimensioni medie.jpeg", "IMG_7099 - dimensioni medie.jpeg", "IMG_7113 - dimensioni medie.jpeg", "IMG_7126 - dimensioni medie.jpeg", "IMG_7129.jpg", "IMG_7137 - dimensioni medie.jpeg", "IMG_7176 - dimensioni medie.jpeg", "IMG_7193 - dimensioni medie.jpeg", "IMG_7195 - dimensioni medie.jpeg", "IMG_7201.jpg", "IMG_7221 - dimensioni medie.jpeg", "IMG_7239.jpg", "IMG_7240 - dimensioni medie.jpeg", "IMG_7245 - dimensioni medie.jpeg", "IMG_7251 - dimensioni medie.jpeg", "IMG_7263 - dimensioni medie.jpeg", "IMG_7287.jpg", "IMG_7369.jpg", "IMG_7387 - dimensioni medie.jpeg", "IMG_7395.jpg", "IMG_7402 - dimensioni medie.jpeg", "IMG_7416 - dimensioni medie.jpeg", "IMG_7425.jpg", "IMG_7457 - dimensioni medie.jpeg", "IMG_7461 - dimensioni medie.jpeg", "IMG_7473 - dimensioni medie.jpeg", "IMG_7481 - dimensioni medie.jpeg", "IMG_7490 - dimensioni medie.jpeg", "IMG_7495 - dimensioni medie.jpeg", "IMG_7512 - dimensioni medie.jpeg", "IMG_7514 - dimensioni medie.jpeg", "IMG_7522.jpg", "IMG_7529 - dimensioni medie.jpeg", "IMG_7540.jpg", "IMG_7552.jpg", "IMG_7601 - dimensioni medie.jpeg", "IMG_7623.jpg", "IMG_7635 - dimensioni medie.jpeg", "IMG_7640 - dimensioni medie.jpeg", "IMG_7679 - dimensioni medie.jpeg", "IMG_7685 - dimensioni medie.jpeg", "IMG_7692.jpg", "IMG_7707 - dimensioni medie.jpeg", "IMG_7721.jpg", "IMG_7727 - dimensioni medie.jpeg", "IMG_7734.jpg", "IMG_7766 - dimensioni medie.jpeg", "IMG_7776 - dimensioni medie.jpeg", "IMG_7782 - dimensioni medie.jpeg", "IMG_7783.jpg", "IMG_7785 - dimensioni medie.jpeg", "IMG_7798.jpg", "IMG_7834.jpg", "IMG_7844.jpg", "IMG_7859 - dimensioni medie.jpeg", "IMG_7862.jpg", "IMG_7865 - dimensioni medie.jpeg", "IMG_7868.jpg", "IMG_7897 - dimensioni medie.jpeg", "IMG_7918 - dimensioni medie.jpeg", "IMG_7924 - dimensioni medie.jpeg", "IMG_7932 - dimensioni medie.jpeg", "IMG_7938 - dimensioni medie.jpeg", "IMG_7956.jpg", "IMG_7957.jpg", "IMG_7965 - dimensioni medie.jpeg", "IMG_7978.jpg", "IMG_7987 - dimensioni medie.jpeg", "IMG_8007.jpg", "IMG_8010.jpg", "IMG_8011.jpg", "IMG_8093.jpg", "IMG_8146.jpg", "IMG_8147.jpg", "IMG_8167.jpg", "IMG_8301 - dimensioni medie.jpeg", "IMG_8326 - dimensioni medie.jpeg", "IMG_8370.jpg", "IMG_8388.jpg", "IMG_8390 - dimensioni medie.jpeg", "IMG_8419.jpg", "IMG_8424.jpg", "IMG_8431 - dimensioni medie.jpeg", "IMG_8447 - dimensioni medie.jpeg", "IMG_8452.jpg", "IMG_8474 - dimensioni medie.jpeg", "IMG_8488 - dimensioni medie.jpeg", "IMG_8493.jpg", "IMG_8516.jpg", "IMG_8562 - dimensioni medie.jpeg", "IMG_8585 - dimensioni medie.jpeg", "IMG_8591.jpg", "IMG_8592 - dimensioni medie.jpeg", "IMG_8615.jpg", "IMG_8713.jpg", "IMG_8722 - dimensioni medie.jpeg", "IMG_8728 - dimensioni medie.jpeg", "IMG_8787 - dimensioni medie.jpeg", "IMG_8801 - dimensioni medie.jpeg", "IMG_8810 - dimensioni medie.jpeg", "IMG_8833.jpg", "IMG_8846.jpg", "IMG_8878.jpg", "IMG_8881.jpg", "IMG_8902 - dimensioni medie.jpeg", "IMG_8923.jpg", "IMG_8964 - dimensioni medie.jpeg", "IMG_8967 - dimensioni medie.jpeg", "IMG_8990 - dimensioni medie.jpeg", "IMG_9003.jpg", "IMG_9006.jpg", "IMG_9008.jpg", "IMG_9052.jpg", "IMG_9073.jpg", "IMG_9187.jpg", "IMG_9331 - dimensioni medie.jpeg", "IMG_9358 - dimensioni medie.jpeg", "IMG_9542 - dimensioni medie.jpeg", "IMG_9600 - dimensioni medie.jpeg", "IMG_9647 - dimensioni medie.jpeg", "IMG_9674 - dimensioni medie.jpeg", "IMG_9748 - dimensioni medie.jpeg", "IMG_9856 - dimensioni medie.jpeg"];

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function setupCarousel(containerId, delay) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const shuffled = shuffle(footerImages);
        let current = 0;

        // Preload first two images
        const imgA = document.createElement("img");
        const imgB = document.createElement("img");
        imgA.src = "assets/media/footer/" + encodeURIComponent(shuffled[0]);
        imgA.alt = "";
        imgA.classList.add("active");
        imgB.src = "assets/media/footer/" + encodeURIComponent(shuffled[1]);
        imgB.alt = "";
        container.appendChild(imgA);
        container.appendChild(imgB);

        let activeImg = imgA;
        let nextImg = imgB;
        current = 1;

        setInterval(() => {
            current = (current + 1) % shuffled.length;
            nextImg.src = "assets/media/footer/" + encodeURIComponent(shuffled[current]);
            nextImg.onload = () => {
                activeImg.classList.remove("active");
                nextImg.classList.add("active");
                [activeImg, nextImg] = [nextImg, activeImg];
            };
        }, delay);
    }

    setupCarousel("footer-carousel-1", 4000);
}
