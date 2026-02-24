console.log("AUTH.JS LOADED");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

// ======================
// LOGIN
// ======================
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
// REGISTER
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
