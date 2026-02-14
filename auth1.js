// ================= LOGIN =================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("https://fintrackerr.onrender.com/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      // ⚠️ SAFE JSON PARSE
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (response.ok && data.token) {
        localStorage.setItem("token", data.token);
        window.location.href = "dashboard.html";
      } else {
        alert(data.message || "Login failed");
      }

    } catch (error) {
      console.error("Login error:", error);
      alert("Server error. Please try again.");
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
      const response = await fetch("https://fintrackerr.onrender.com/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, college, year, password })
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (response.ok && data.token) {
        localStorage.setItem("token", data.token);
        window.location.href = "dashboard.html";
      } else {
        alert(data.message || "Registration failed");
      }

    } catch (error) {
      console.error("Register error:", error);
      alert("Server error");
    }
  });
}
