// ============================================
// FinTrack UI Effects - Professional Animations
// Version: 2.0
// ============================================

(function() {
  'use strict';

  // ========== PAGE TRANSITIONS ==========
  function initPageTransitions() {
    // Add page-loaded class after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.add('page-loaded');
      });
    } else {
      document.body.classList.add('page-loaded');
    }
  }

  // ========== RIPPLE EFFECT FOR BUTTONS ==========
  function initRippleEffect() {
    const buttons = document.querySelectorAll(
      'button, .btn, .nav-btn, .cta-btn, .login-btn, .add-btn, .save-budget-btn, .category-add-btn, .category-remove-btn'
    );
    
    buttons.forEach(btn => {
      btn.addEventListener('click', function(e) {
        // Don't add ripple to links that navigate away (prevent flicker)
        if (this.tagName === 'A' && this.getAttribute('href') && !this.getAttribute('href').startsWith('#')) {
          return;
        }
        
        // Remove any existing ripple
        const existingRipple = this.querySelector('.ripple-effect');
        if (existingRipple) existingRipple.remove();
        
        // Create ripple element
        const ripple = document.createElement('span');
        ripple.classList.add('ripple-effect');
        this.appendChild(ripple);
        
        // Calculate position
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        // Remove after animation
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });
  }

  // ========== SCROLL REVEAL ANIMATIONS ==========
  function initScrollReveal() {
    const revealElements = document.querySelectorAll(
      '.feature-card, .how-card, .split-section, .hero-section, .stat-card, .info-section'
    );
    
    if (revealElements.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          
          // Optional: unobserve after revealed
          observer.unobserve(entry.target);
        }
      });
    }, { 
      threshold: 0.1, 
      rootMargin: '0px 0px -50px 0px' 
    });
    
    revealElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      observer.observe(el);
    });
  }

  // ========== STAGGERED ANIMATIONS FOR GRIDS ==========
  function initStaggeredAnimations() {
    // Feature cards staggered animation
    document.querySelectorAll('.features-grid .feature-card').forEach((card, index) => {
      card.style.transitionDelay = `${index * 0.1}s`;
    });
    
    // How cards staggered animation
    document.querySelectorAll('.how-grid .how-card').forEach((card, index) => {
      card.style.transitionDelay = `${index * 0.1}s`;
    });
    
    // Stats cards staggered animation
    document.querySelectorAll('.stats-grid .stat-card').forEach((card, index) => {
      card.style.transitionDelay = `${index * 0.1}s`;
    });
  }

  // ========== HOVER EFFECTS FOR CARDS ==========
  function initHoverEffects() {
    const cards = document.querySelectorAll('.summary-card, .ai-box, .stat-card, .feature-card, .how-card');
    
    cards.forEach(card => {
      card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
        this.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
      });
      
      card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
      });
    });
  }

  // ========== BACK BUTTON FUNCTION (Global) ==========
  window.goBack = function() {
    document.body.classList.add('page-exit');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 250);
  };

  // ========== THEME SYSTEM SYNC ==========
  function initThemeSync() {
    // Apply theme from localStorage on all pages
    const savedTheme = localStorage.getItem('theme') || 'auto';
    document.body.classList.remove('light-mode', 'dark-mode', 'auto-mode');
    document.body.classList.add(savedTheme + '-mode');
  }

  // ========== INITIALIZE ALL EFFECTS ==========
  function init() {
    initPageTransitions();
    initRippleEffect();
    initScrollReveal();
    initStaggeredAnimations();
    initHoverEffects();
    initThemeSync();
    
    console.log('✅ FinTrack UI Effects initialized');
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
