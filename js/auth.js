/* ======================================================
   FINTRACK AUTH SCRIPT (FINAL VERSION)
   Works locally + on Render (same origin requests)
====================================================== */

// IMPORTANT: No domain here. Same server handles frontend + API
const BASE = "";

/* ================= LOGIN ================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      // If server crashes / returns empty response
      if (!response.headers.get("content-type")?.includes("application/json")) {
        alert("Server did not return data. Check Render logs.");
        return;
      }

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        alert("Login successful 🎉");
        window.location.href = "dashboard.html";
      } else {
        alert(data.message || "Invalid email or password");
      }

    } catch (err) {
      console.error("Login Error:", err);
      alert("Cannot connect to server.");
    }
  });
}


/* ================= REGISTER ================= */
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const college = document.getElementById("college").value.trim();
    const year = document.getElementById("year").value.trim();
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          college,
          year,
          password
        })
      });

      // Check if server actually returned JSON
      if (!response.headers.get("content-type")?.includes("application/json")) {
        alert("Server did not return data. Check Render logs.");
        return;
      }

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        alert("Registration successful 🚀");
        window.location.href = "dashboard.html";
      } else {
        alert(data.message || "Registration failed");
      }

    } catch (err) {
      console.error("Register Error:", err);
      alert("Cannot connect to server.");
    }
  });
}
