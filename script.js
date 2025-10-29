function openTab(evt, tabName) {
  // Hide all tabcontent sections
  const tabs = document.querySelectorAll(".tabcontent");
  tabs.forEach(tab => tab.style.display = "none");

  // Remove 'active' class from all tab links
  const links = document.querySelectorAll(".tablink");
  links.forEach(link => link.classList.remove("active"));

  // Show selected tab and set it as active
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.classList.add("active");
}
