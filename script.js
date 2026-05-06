document.addEventListener('DOMContentLoaded', () => {
    // Blob Cursor Follow
    const blob = document.querySelector('.cursor-blob');
    
    document.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        blob.animate({
            left: `${clientX}px`,
            top: `${clientY}px`
        }, { duration: 3000, fill: "forwards" });
    });

    // Fade-up Animation on Scroll
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-up').forEach(el => {
        observer.observe(el);
    });

    // Auto-activate hero animations
    setTimeout(() => {
        document.querySelectorAll('.hero .fade-up').forEach(el => {
            el.classList.add('active');
        });
    }, 100);

    // Smooth Scrolling for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Header scroll effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.style.padding = '0.8rem 0';
            header.style.backgroundColor = 'rgba(5, 5, 5, 0.8)';
        } else {
            header.style.padding = '1.5rem 0';
            header.style.backgroundColor = 'transparent';
        }
    });

    // --- NEW FUNCTIONALITY ---

    // Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobilePanel = document.getElementById('mobile-nav-panel');
    const mobileLinks = document.querySelectorAll('.mobile-nav-links a');

    if (mobileBtn && mobilePanel) {
        mobileBtn.addEventListener('click', () => {
            mobileBtn.classList.toggle('active');
            mobilePanel.classList.toggle('open');
            document.body.style.overflow = mobilePanel.classList.contains('open') ? 'hidden' : 'auto';
        });

        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileBtn.classList.remove('active');
                mobilePanel.classList.remove('open');
                document.body.style.overflow = 'auto';
            });
        });
    }

    // Modal Logic
    const modal = document.getElementById('project-modal');
    const openModalBtns = document.querySelectorAll('.open-modal-btn');
    const closeModalBtn = document.querySelector('.close-modal');

    // Dummy project data
    const projectData = {
        '1': { title: 'E-commerce XYZ', desc: 'Plataforma completa de vendas com integração de pagamentos e painel administrativo avançado.', tags: ['React', 'Node.js', 'MongoDB'] },
        '2': { title: 'App Financeiro', desc: 'Aplicativo mobile para controle de finanças pessoais com gráficos interativos e dicas de economia.', tags: ['Flutter', 'Firebase', 'Figma'] }
    };

    openModalBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.portfolio-card');
            const projectId = card.getAttribute('data-project');
            const data = projectData[projectId];

            if (data) {
                document.getElementById('modal-title').textContent = data.title;
                document.getElementById('modal-desc').textContent = data.desc;
                
                const tagsContainer = document.querySelector('.modal-tech-tags');
                tagsContainer.innerHTML = '';
                data.tags.forEach(tag => {
                    const span = document.createElement('span');
                    span.className = 'tag';
                    span.textContent = tag;
                    tagsContainer.appendChild(span);
                });

                modal.classList.add('open');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.classList.remove('open');
            document.body.style.overflow = 'auto';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('open');
            document.body.style.overflow = 'auto';
        }
    });

    // Contact Form Logic
    const contactForm = document.getElementById('contact-form');
    const formFeedback = document.getElementById('form-feedback');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevents actual form submission
            
            // Show feedback
            formFeedback.style.display = 'block';
            contactForm.reset();

            // Hide feedback after 5 seconds
            setTimeout(() => {
                formFeedback.style.display = 'none';
            }, 5000);
        });
    }
});
