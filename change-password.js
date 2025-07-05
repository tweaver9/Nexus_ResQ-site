window.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('changePasswordForm');
  const msgDiv = document.getElementById('changePasswordMsg');

  const username = sessionStorage.getItem('username');
  const tenantId = sessionStorage.getItem('tenant_id');

  if (!tenantId || !username) {
    msgDiv.textContent = "Session expired. Please log in again.";
    form.style.display = "none";
    return;
  }

  form.onsubmit = async function(e) {
    e.preventDefault();
    msgDiv.textContent = "";

    const newPass = document.getElementById('newPassword').value.trim();
    const confirm = document.getElementById('confirmPassword').value.trim();

    if (newPass.length < 6) {
      msgDiv.textContent = "Password must be at least 6 characters.";
      return;
    }

    if (newPass !== confirm) {
      msgDiv.textContent = "Passwords do not match.";
      return;
    }

    try {
      const res = await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          newPassword: newPass,
          tenantId
        })
      });

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg);
      }

      msgDiv.style.color = "#28e640";
      msgDiv.textContent = "Password changed! Redirecting...";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1200);
    } catch (err) {
      msgDiv.style.color = "#ff5050";
      msgDiv.textContent = "Update failed: " + err.message;
    }
  };
});
