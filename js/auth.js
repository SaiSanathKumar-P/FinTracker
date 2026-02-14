const BASE = "https://fintrackerr.onrender.com";
// ================= LOGIN =================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
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

      let data = {};
      try {
        data = await response.json();
      } catch {
        alert("Server did not return data");
        return;
      }

      if (response.ok) {
        localStorage.setItem("token", data.token);
        window.location.href = "dashboard.html";
      } else {
        alert(data.message || "Invalid credentials");
      }

    } catch (error) {
      console.error("Login error:", error);
      alert("Server error");
    }
  });
}



// ================= REGISTER =================
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value.trim().toLowerCase();
    const college = document.getElementById("college").value;
    const year = document.getElementById("year").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, college, year, password })
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        alert("Server did not return data");
        return;
      }

      if (res.ok) {
        localStorage.setItem("token", data.token);
        window.location.href = "dashboard.html";
      } else {
        alert(data.message || "Registration failed");
      }

    } catch (error) {
      console.error(error);
      alert("Server error. Please try again.");
    }
  });
}


