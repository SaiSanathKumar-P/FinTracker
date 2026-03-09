console.log("AUTH.JS LOADED");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

// ======================
// LOGIN
// ======================
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      console.log("LOGIN RESPONSE:", data);

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        
        // ✅ CRITICAL FIX: Always use data from the logged-in user
        if (data.user) {
          // If API returns user data, use it
          localStorage.setItem('finTrack_user', JSON.stringify({
            name: data.user.name || email.split('@')[0],
            email: data.user.email || email,
            college: data.user.college || 'Not specified',
            year: data.user.year || '1'
          }));
        } else {
          // If API doesn't return user data, create NEW data from this login
          // DO NOT use existingUser - that belongs to a different user!
          localStorage.setItem('finTrack_user', JSON.stringify({
            name: email.split('@')[0],
            email: email,
            college: 'Not specified',
            year: '1'
          }));
        }
        
        window.location.href = "dashboard.html";
      } else {
        alert(data.message || "Login failed");
      }

    } catch (err) {
      console.error("Login error:", err);
      alert("Server error");
    }
  });
}

// ======================
// REGISTER - Saves user data
// ======================
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("fullname").value;
    const email = document.getElementById("email").value;
    const college = document.getElementById("college").value;
    const year = document.getElementById("year").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, college, year, password })
      });

      const data = await res.json();

      console.log("REGISTER RESPONSE:", data);

      if (res.ok && data.token) {
        // ✅ SAVE COMPLETE USER DATA FOR PROFILE PAGE
        localStorage.setItem('finTrack_user', JSON.stringify({
          name: name,
          email: email,
          college: college || 'Not specified',
          year: year || '1'
        }));
        
        localStorage.setItem("token", data.token);
        window.location.href = "dashboard.html";
      } else {
        if (data.message) {
          alert(data.message);
        } else {
          alert("Registration failed");
        }
      }
    } catch (err) {
      console.error("Register error:", err);
      alert("Server error");
    }
  });
}

if (loginForm) {
  loginForm.reset();
}
