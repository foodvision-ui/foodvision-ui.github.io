(function () {
  var AUTH_KEY = "foodvision.auth.user";
  var JWT_KEY = "foodvision.jwt";
  var OTP_KEY = "foodvision.auth.otp";
  var START_PAGE = "food-login.html";
  var HISTORY_NOTICE_KEY = "foodvision.notice.nohistory.seen";
  var API_BASE = window.FOODVISION_API || "http://localhost:8000";

  function readJSON(key) {
    try {
      var raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeJSON(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  function getUser() {
    return readJSON(AUTH_KEY);
  }

  function isAuthenticated() {
    var user = getUser();
    return !!(user && user.mode);
  }

  function isGuest() {
    var user = getUser();
    return !!(user && user.mode === "guest");
  }

  function getJwt() {
    return sessionStorage.getItem(JWT_KEY) || "";
  }

  // Call backend API (Jac server)
  function apiCall(endpoint, body, needsAuth) {
    var headers = { "Content-Type": "application/json" };
    if (needsAuth) {
      var jwt = getJwt();
      if (jwt) headers["Authorization"] = "Bearer " + jwt;
    }
    return fetch(API_BASE + endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body || {})
    }).then(function (r) { return r.json(); });
  }

  // Try to register; if user exists, login instead
  function backendAuth(username, password) {
    return apiCall("/user/register", { username: username, password: password })
      .then(function (res) {
        if (res.ok && res.data && res.data.token) {
          sessionStorage.setItem(JWT_KEY, res.data.token);
          return res.data;
        }
        // Registration failed (user exists?), try login
        return apiCall("/user/login", { username: username, password: password })
          .then(function (loginRes) {
            if (loginRes.ok && loginRes.data && loginRes.data.token) {
              sessionStorage.setItem(JWT_KEY, loginRes.data.token);
              return loginRes.data;
            }
            return null;
          });
      })
      .catch(function () { return null; });
  }

  function loginEmail(email, password) {
    writeJSON(AUTH_KEY, {
      mode: "email",
      email: email,
      at: new Date().toISOString()
    });
    // Async backend auth (fire-and-forget, won't block UI)
    backendAuth(email, password || "default_pass");
  }

  function loginPhone(phone) {
    writeJSON(AUTH_KEY, {
      mode: "phone",
      phone: phone,
      at: new Date().toISOString()
    });
    backendAuth(phone, "phone_default_pass");
  }

  function loginGuest() {
    writeJSON(AUTH_KEY, {
      mode: "guest",
      name: "Guest",
      at: new Date().toISOString()
    });
    var guestId = "guest_" + Date.now();
    backendAuth(guestId, "guest_pass");
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(JWT_KEY);
    sessionStorage.removeItem(OTP_KEY);
  }

  function startPage() {
    return START_PAGE;
  }

  function logoutAndGoStart() {
    logout();
    window.location.href = START_PAGE + "?loggedout=1";
  }

  function wireTopbarAuth(buttonId, onChange) {
    var btn = document.getElementById(buttonId);
    if (!btn) return null;

    function refresh() {
      if (isAuthenticated()) {
        btn.textContent = "Logout";
        btn.dataset.authState = "logout";
      } else {
        btn.textContent = "Sign Up / Login";
        btn.dataset.authState = "login";
      }

      if (typeof onChange === "function") {
        onChange(getUser());
      }
    }

    btn.onclick = function () {
      if (isAuthenticated()) {
        logout();
        refresh();
        return;
      }
      window.location.href = START_PAGE;
    };

    refresh();
    return { refresh: refresh };
  }

  function showNoHistoryPopup() {
    if (sessionStorage.getItem(HISTORY_NOTICE_KEY)) {
      return;
    }

    // Don't show the popup if the user just logged in
    if (isAuthenticated()) {
      return;
    }

    sessionStorage.setItem(HISTORY_NOTICE_KEY, "1");

    var root = document.createElement("div");
    root.id = "foodvision-history-popup";
    root.innerHTML = [
      '<div class="fvh-backdrop"></div>',
      '<div class="fvh-modal" role="dialog" aria-modal="true" aria-label="History notice">',
      '  <h3>Heads-up</h3>',
      '  <p>This demo does not record conversation history. Outputs are temporary in this session.</p>',
      '  <button id="fvhOk" type="button">Got it</button>',
      '</div>'
    ].join("");

    var style = document.createElement("style");
    style.textContent = [
      '#foodvision-history-popup{position:fixed;inset:0;z-index:9998;font-family:"Outfit",sans-serif;}',
      '#foodvision-history-popup .fvh-backdrop{position:absolute;inset:0;background:rgba(60,32,20,.35);backdrop-filter:blur(2px);}',
      '#foodvision-history-popup .fvh-modal{position:relative;max-width:420px;margin:14vh auto 0;background:rgba(255,255,255,.95);border:1px solid rgba(255,255,255,.85);border-radius:16px;padding:18px;box-shadow:0 20px 40px rgba(80,40,20,.25);animation:fvhIn .28s ease;}',
      '#foodvision-history-popup h3{margin:0 0 8px;color:#3d291e;}',
      '#foodvision-history-popup p{margin:0 0 12px;color:#6f4a36;line-height:1.5;}',
      '#foodvision-history-popup button{border:none;border-radius:10px;padding:10px 14px;cursor:pointer;font-weight:700;color:#fff;background:linear-gradient(135deg,#ff6633,#ff9f43);}',
      '@keyframes fvhIn{from{opacity:.4;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}'
    ].join("");

    function close() {
      if (root.parentNode) root.parentNode.removeChild(root);
      if (style.parentNode) style.parentNode.removeChild(style);
    }

    document.head.appendChild(style);
    document.body.appendChild(root);

    root.querySelector(".fvh-backdrop").addEventListener("click", close);
    document.getElementById("fvhOk").addEventListener("click", close);
    setTimeout(close, 5200);
  }

  function sendOtp(phone) {
    var code = String(Math.floor(100000 + Math.random() * 900000));
    writeJSON(OTP_KEY, {
      phone: phone,
      code: code,
      expiresAt: Date.now() + 3 * 60 * 1000
    });
    return code;
  }

  function verifyOtp(phone, code) {
    var info = readJSON(OTP_KEY);
    if (!info) return false;
    if (info.phone !== phone) return false;
    if (Date.now() > info.expiresAt) return false;
    return info.code === code;
  }

  function clearOtp() {
    sessionStorage.removeItem(OTP_KEY);
  }

  function getReturnUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get("return") || "index.html";
  }

  function openLoginModal(options) {
    if (window.FoodLoginModal && typeof window.FoodLoginModal.open === "function") {
      window.FoodLoginModal.open(options || {});
      return;
    }

    // Keep auth local: do not redirect the whole page.
    console.warn("FoodLoginModal is not loaded; include login-modal.js to enable popup login.");
  }

  function goLogin(returnUrl, reason) {
    // Backward-compatible API now maps to popup login without redirect.
    openLoginModal({
      returnUrl: returnUrl,
      reason: reason || "login-required"
    });
  }

  function requireAuth(options) {
    if (isAuthenticated()) {
      if (options && typeof options.onSuccess === "function") {
        options.onSuccess(getUser());
      }
      return true;
    }

    openLoginModal({
      reason: (options && options.reason) || "login-required",
      requireFullAuth: false,
      locked: !!(options && options.locked),
      onSuccess: options && options.onSuccess
    });
    return false;
  }

  function requireFullAuth(returnUrl, reason) {
    if (isAuthenticated()) {
      return true;
    }

    openLoginModal({
      reason: reason || "login-required",
      requireFullAuth: true,
      locked: false,
      onSuccess: null
    });

    // `returnUrl` is kept for backward compatibility; no redirect is used now.
    if (returnUrl) {
      // eslint-disable-next-line no-unused-expressions
      returnUrl;
    }

    return false;
  }

  window.FoodAuth = {
    getUser: getUser,
    getJwt: getJwt,
    apiCall: apiCall,
    API_BASE: API_BASE,
    isAuthenticated: isAuthenticated,
    isGuest: isGuest,
    loginEmail: loginEmail,
    loginPhone: loginPhone,
    loginGuest: loginGuest,
    logout: logout,
    startPage: startPage,
    logoutAndGoStart: logoutAndGoStart,
    wireTopbarAuth: wireTopbarAuth,
    showNoHistoryPopup: showNoHistoryPopup,
    sendOtp: sendOtp,
    verifyOtp: verifyOtp,
    clearOtp: clearOtp,
    openLoginModal: openLoginModal,
    requireAuth: requireAuth,
    getReturnUrl: getReturnUrl,
    goLogin: goLogin,
    requireFullAuth: requireFullAuth
  };
})();
