// ui-effects.js - Page transitions and UI effects

// Page transition effect
document.addEventListener('DOMContentLoaded', function() {
  document.body.classList.add('page-loaded');
  
  // Add click effect to all buttons
  const buttons = document.querySelectorAll('button, .btn, .nav-btn, .cta-btn, .login-btn, .add-btn, .save-budget-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      // Don't add effect to links that navigate away
      if (this.tagName === 'A' && this.getAttribute('href')) return;
      
      // Create ripple effect
      const ripple = document.createElement('span');
      ripple.classList.add('ripple-effect');
      this.appendChild(ripple);
      
      const x = e.clientX - this.getBoundingClientRect().left;
      const y = e.clientY - this.getBoundingClientRect().top;
      
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
});

// Back button function for login/register pages
function goBack() {
  document.body.classList.add('page-exit');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 300);
}
