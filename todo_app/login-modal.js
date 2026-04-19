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
      '  <form id="flmEmailForm" novalidate>',
      '    <label>Email</label>',
      '    <input id="flmEmail" type="email" placeholder="chef@foodvision.ai" required />',
      '    <label>Password</label>',
      '    <input id="flmPassword" type="password" placeholder="At least 6 characters" required />',
      '    <button id="flmEmailSubmit" class="flm-primary" type="submit">Login with Email</button>',
      '  </form>',
      '  <div class="flm-divider"><span>or</span></div>',
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
      '.flm-card label{display:block;font-weight:600;color:#3d291e;font-size:.87rem;margin:7px 0 4px;}',
      '.flm-card input{width:100%;padding:11px 12px;border-radius:11px;border:1px solid rgba(167,118,89,.35);background:#fff;font-size:.95rem;outline:none;}',
      '.flm-card input:focus{border-color:#ff6633;box-shadow:0 0 0 4px rgba(255,102,51,.2);}',
      '.flm-primary,.flm-ghost{width:100%;margin-top:9px;border:none;border-radius:11px;padding:11px 12px;font-weight:700;cursor:pointer;font-family:inherit;}',
      '.flm-primary{background:linear-gradient(135deg,#ff6633,#ff9f43);color:#fff;box-shadow:0 10px 20px rgba(255,102,51,.22);}',
      '.flm-primary:disabled,.flm-ghost:disabled{opacity:.7;cursor:wait;}',
      '.flm-ghost{background:rgba(255,255,255,.92);color:#7a3d1f;border:1px solid rgba(255,255,255,.9);}',
      '.flm-divider{display:flex;align-items:center;gap:10px;margin:12px 0 2px;color:#a77659;font-size:.78rem;}',
      '.flm-divider::before,.flm-divider::after{content:"";flex:1;height:1px;background:rgba(167,118,89,.25);}',
      '.flm-status{min-height:22px;font-size:.88rem;font-weight:600;margin-top:6px;}',
      '.flm-status.success{color:#1f9d55;}',
      '.flm-status.error{color:#d64545;}',
      '.flm-status.pending{color:#a76a2a;}',
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

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function closeModal() {
    if (!modalRoot) return;
    modalRoot.classList.add("hidden");
  }

  function completeLogin(onSuccess) {
    closeModal();
    if (typeof onSuccess === "function") onSuccess();
  }

  function setButtonsBusy(busy) {
    var btns = modalRoot.querySelectorAll("button");
    btns.forEach(function (b) { b.disabled = !!busy; });
  }

  // Await the login promise. On success, close the modal. On failure, keep it
  // open and show the real backend error so the user knows their credentials
  // didn't work. We cap the wait only for successful slow backends.
  function finalizeAuth(promise) {
    setButtonsBusy(true);
    setStatus("Signing in...", "pending");
    var settled = false;
    var safetyTimer = setTimeout(function () {
      if (settled) return;
      setButtonsBusy(false);
      setStatus("Still signing in… you can wait or retry.", "pending");
    }, 3500);

    Promise.resolve(promise).then(function () {
      settled = true;
      clearTimeout(safetyTimer);
      setButtonsBusy(false);
      setStatus("Login successful.", "success");
      completeLogin(currentOptions && currentOptions.onSuccess);
    }).catch(function (err) {
      settled = true;
      clearTimeout(safetyTimer);
      setButtonsBusy(false);
      var msg = (err && err.message) ? err.message : "Login failed. Please try again.";
      setStatus(msg, "error");
    });
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

    document.getElementById("flmEmailForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("flmEmail").value.trim();
      var password = document.getElementById("flmPassword").value;

      if (!email) email = "guest@foodvision.local";
      if (!password) password = "temporary";

      finalizeAuth(FoodAuth.loginEmail(email, password));
    });

    document.getElementById("flmGuest").addEventListener("click", function () {
      finalizeAuth(FoodAuth.loginGuest());
    });
  }

  function open(options) {
    ensureModal();
    currentOptions = options || {};

    modalRoot.classList.remove("hidden");
    setStatus("", "");

    var reason = document.getElementById("flmReason");
    if (currentOptions.reason === "payment-required") {
      reason.textContent = "Please log in to continue payment.";
    } else if (currentOptions.reason === "profile-required") {
      reason.textContent = "Please log in to create/view personal records.";
    } else {
      reason.textContent = "Sign in to continue.";
    }

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
