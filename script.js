// DEVELOPMENT MODE FLAG
const DEV_MODE = true; // set to true if you want to skip login

// front-end "database"
const users = [
  { username: "admin", password: "password123", role: "admin" },
  { username: "ben", password: "securepass", role: "user" },
  { username: "konor", password: "purple2025", role: "user" }
];

// Login Page Logic
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("error-message");

    const foundUser = users.find(
      (user) => user.username === username && user.password === password
    );

    if (foundUser) {
      localStorage.setItem("loggedInUser", JSON.stringify(foundUser));
      window.location.href = "main.html";
    } else {
      errorMsg.textContent = "Invalid username or password.";
      errorMsg.style.color = "#ff4d4d";
    }
  });
}

// Tab Logic
function openTab(evt, tabName) {
  const tabs = document.querySelectorAll(".tabcontent");
  tabs.forEach((tab) => (tab.style.display = "none"));

  const links = document.querySelectorAll(".tablink");
  links.forEach((link) => link.classList.remove("active"));

  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.classList.add("active");
}

// Logout Function
function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html";
}

// Protect main.html + Role-based display
if (window.location.pathname.endsWith("main.html")) {
  const userData = localStorage.getItem("loggedInUser");

  if (!userData && !DEV_MODE) {
    window.location.href = "index.html"; // not logged in
  } else {
    const user = userData ? JSON.parse(userData) : users[0]; // default admin in dev mode

    // Hide Admin Approval tab for non-admins
    const adminTab = document.getElementById("adminTab");
    if (user.role !== "admin" && adminTab) {
      adminTab.parentElement.remove();
    }
  }
}
