(function () {
  var modalRoot = null;
  var currentOptions = null;

  function ensureModal() {
    if (modalRoot) return;

    modalRoot = document.createElement("div");
    modalRoot.id = "food-login-modal-root";
    modalRoot.className = "flm-root hidden";
    modalRoot.innerHTML = [
      '<div class="flm-backdrop" data-close="1"></div>',
      '<div class="flm-card" role="dialog" aria-modal="true" aria-label="Login required">',
      '  <button class="flm-close" id="flmClose" type="button" aria-label="Close">✕</button>',
      '  <h3>Continue to FoodVision AI</h3>',
      '  <p class="flm-sub" id="flmReason">Sign in to continue.</p>',
      '  <div class="flm-switcher">',
      '    <button id="flmTabEmail" class="active" type="button">Email</button>',
      '    <button id="flmTabPhone" type="button">Phone OTP</button>',
      '  </div>',
      '  <form id="flmEmailForm" novalidate>',
      '    <label>Email</label>',
      '    <input id="flmEmail" type="email" placeholder="chef@foodvision.ai" required />',
      '    <label>Password</label>',
      '    <input id="flmPassword" type="password" placeholder="At least 6 characters" required />',
      '    <button class="flm-primary" type="submit">Login with Email</button>',
      '  </form>',
      '  <form id="flmPhoneForm" class="hidden" novalidate>',
      '    <label>Phone Number</label>',
      '    <div class="flm-row">',
      '      <input id="flmPhone" type="tel" placeholder="+1 734 555 8899" required />',
      '      <button id="flmSendOtp" class="flm-secondary" type="button">Send</button>',
      '    </div>',
      '    <label>Verification Code</label>',
      '    <input id="flmOtp" type="text" maxlength="6" placeholder="6-digit code" required />',
      '    <button class="flm-primary" type="submit">Verify and Login</button>',
      '  </form>',
      '  <button id="flmGuest" class="flm-ghost" type="button">Continue as Guest</button>',
      '  <div id="flmStatus" class="flm-status" role="status" aria-live="polite"></div>',
      '</div>'
    ].join("");

    var style = document.createElement("style");
    style.textContent = [
      '.flm-root{position:fixed;inset:0;z-index:9999;font-family:"Outfit",sans-serif;}',
      '.flm-root.hidden{display:none;}',
      '.flm-backdrop{position:absolute;inset:0;background:rgba(40,20,12,.42);backdrop-filter:blur(2px);}',
      '.flm-card{position:relative;max-width:430px;margin:8vh auto 0;background:rgba(255,255,255,.95);border:1px solid rgba(255,255,255,.8);box-shadow:0 20px 45px rgba(80,40,20,.28);border-radius:18px;padding:18px;z-index:1;}',
      '.flm-card h3{margin:0;color:#3d291e;font-size:1.35rem;}',
      '.flm-sub{margin:6px 0 12px;color:#805941;font-size:.93rem;}',
      '.flm-close{position:absolute;right:10px;top:10px;border:none;background:transparent;cursor:pointer;font-size:1rem;color:#805941;}',
      '.flm-switcher{display:flex;gap:6px;background:rgba(255,255,255,.9);padding:4px;border-radius:999px;margin-bottom:10px;border:1px solid rgba(255,255,255,.8);}',
      '.flm-switcher button{flex:1;border:none;border-radius:999px;padding:8px 6px;background:transparent;cursor:pointer;font-weight:700;color:#7a3d1f;font-family:inherit;}',
      '.flm-switcher button.active{background:linear-gradient(135deg,#ff6633,#ff9f43);color:#fff;}',
      '.flm-card label{display:block;font-weight:600;color:#3d291e;font-size:.87rem;margin:7px 0 4px;}',
      '.flm-card input{width:100%;padding:11px 12px;border-radius:11px;border:1px solid rgba(167,118,89,.35);background:#fff;font-size:.95rem;outline:none;}',
      '.flm-card input:focus{border-color:#ff6633;box-shadow:0 0 0 4px rgba(255,102,51,.2);}',
      '.flm-row{display:grid;grid-template-columns:1fr auto;gap:8px;}',
      '.flm-primary,.flm-secondary,.flm-ghost{width:100%;margin-top:9px;border:none;border-radius:11px;padding:11px 12px;font-weight:700;cursor:pointer;font-family:inherit;}',
      '.flm-primary{background:linear-gradient(135deg,#ff6633,#ff9f43);color:#fff;box-shadow:0 10px 20px rgba(255,102,51,.22);}',
      '.flm-secondary{width:auto;background:rgba(255,255,255,.92);color:#7a3d1f;border:1px solid rgba(255,255,255,.9);}',
      '.flm-ghost{background:rgba(255,255,255,.92);color:#7a3d1f;border:1px solid rgba(255,255,255,.9);}',
      '.flm-status{min-height:22px;font-size:.88rem;font-weight:600;margin-top:6px;}',
      '.flm-status.success{color:#1f9d55;}',
      '.flm-status.error{color:#d64545;}',
      '.hidden{display:none !important;}'
    ].join("");

    document.head.appendChild(style);
    document.body.appendChild(modalRoot);

    bindModalEvents();
  }

  function setStatus(message, type) {
    var status = document.getElementById("flmStatus");
    status.textContent = message || "";
    status.className = "flm-status" + (type ? " " + type : "");
  }

  function switchMode(mode) {
    var emailMode = mode === "email";
    document.getElementById("flmTabEmail").classList.toggle("active", emailMode);
    document.getElementById("flmTabPhone").classList.toggle("active", !emailMode);
    document.getElementById("flmEmailForm").classList.toggle("hidden", !emailMode);
    document.getElementById("flmPhoneForm").classList.toggle("hidden", emailMode);
    setStatus("", "");
  }

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function validPhone(v) {
    return /^\+?[\d\s\-()]{8,20}$/.test(v);
  }

  function closeModal() {
    if (!modalRoot) return;
    modalRoot.classList.add("hidden");
  }

  function completeLogin(onSuccess) {
    closeModal();
    if (typeof onSuccess === "function") onSuccess();
  }

  function bindModalEvents() {
    modalRoot.querySelector(".flm-backdrop").addEventListener("click", function () {
      if (currentOptions && currentOptions.locked) return;
      closeModal();
    });

    document.getElementById("flmClose").addEventListener("click", function () {
      if (currentOptions && currentOptions.locked) return;
      closeModal();
    });

    document.getElementById("flmTabEmail").addEventListener("click", function () { switchMode("email"); });
    document.getElementById("flmTabPhone").addEventListener("click", function () { switchMode("phone"); });

    document.getElementById("flmSendOtp").addEventListener("click", function () {
      var phone = document.getElementById("flmPhone").value.trim();
      if (!validPhone(phone)) {
        setStatus("Enter a valid phone number first.", "error");
        return;
      }
      var code = FoodAuth.sendOtp(phone);
      setStatus("Verification message sent. Demo code: " + code, "success");
    });

    document.getElementById("flmEmailForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("flmEmail").value.trim();
      var password = document.getElementById("flmPassword").value;

      // Fake login: accept any input and create a temporary session.
      if (!email) {
        email = "guest@foodvision.local";
      }
      if (!password) {
        password = "temporary";
      }

      FoodAuth.loginEmail(email);
      setStatus("Login successful (temporary session).", "success");
      completeLogin(currentOptions && currentOptions.onSuccess);
    });

    document.getElementById("flmPhoneForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var phone = document.getElementById("flmPhone").value.trim();

      // Fake OTP flow: accept any phone and code, create a temporary session.
      if (!phone) {
        phone = "+1 000 000 0000";
      }

      FoodAuth.loginPhone(phone);
      setStatus("Phone login successful (temporary session).", "success");
      completeLogin(currentOptions && currentOptions.onSuccess);
    });

    document.getElementById("flmGuest").addEventListener("click", function () {
      FoodAuth.loginGuest();
      setStatus("Guest mode enabled (temporary session).", "success");
      completeLogin(currentOptions && currentOptions.onSuccess);
    });
  }

  function open(options) {
    ensureModal();
    currentOptions = options || {};

    modalRoot.classList.remove("hidden");
    setStatus("", "");
    switchMode("email");

    var reason = document.getElementById("flmReason");
    if (currentOptions.reason === "payment-required") {
      reason.textContent = "Please log in to continue payment.";
    } else if (currentOptions.reason === "profile-required") {
      reason.textContent = "Please log in to create/view personal records.";
    } else {
      reason.textContent = "Sign in to continue.";
    }

    // Guest option is always available; it creates a temporary session quickly.
    var guestBtn = document.getElementById("flmGuest");
    guestBtn.classList.remove("hidden");

    var closeBtn = document.getElementById("flmClose");
    closeBtn.classList.toggle("hidden", !!currentOptions.locked);
  }

  window.FoodLoginModal = {
    open: open,
    close: closeModal
  };
})();
