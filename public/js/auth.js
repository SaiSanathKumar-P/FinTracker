const BASE = "";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

// LOGIN
if(loginForm){
loginForm.addEventListener("submit", async(e)=>{
e.preventDefault();

const email = document.getElementById("email").value;
const password = document.getElementById("password").value;

const res = await fetch("/api/auth/login",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({email,password})
});

const data = await res.json();

if(res.ok){
  localStorage.setItem("token",data.token);
  window.location.href="dashboard.html";
}else{
  alert(data.message);
}
});
}

// REGISTER
if(registerForm){
registerForm.addEventListener("submit", async(e)=>{
e.preventDefault();

const name = document.getElementById("name").value;
const email = document.getElementById("email").value;
const college = document.getElementById("college").value;
const year = document.getElementById("year").value;
const password = document.getElementById("password").value;

const res = await fetch("/api/auth/register",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({name,email,college,year,password})
});

const data = await res.json();

if(res.ok){
  localStorage.setItem("token",data.token);
  window.location.href="dashboard.html";
}else{
  alert(data.message);
}
});
}
