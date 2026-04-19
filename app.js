/**
 * Food Delivery App - Search, filter, and render restaurant list
 */

(function () {
  const searchInput = document.getElementById("search-input");
  const restaurantListEl = document.getElementById("restaurant-list");
  const emptyStateEl = document.getElementById("empty-state");
  const filterBtns = document.querySelectorAll(".filter-btn");

  let currentTagFilter = "all";

  /**
   * Filter restaurants by search query (name or category) and optional tag filter
   */
  function getFilteredRestaurants() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const tagFilter = currentTagFilter === "all" ? null : currentTagFilter;

    return RESTAURANTS.filter(function (r) {
      const matchSearch =
        !query ||
        r.name.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query);
      const matchTag =
        !tagFilter || (r.tags && r.tags.includes(tagFilter));
      return matchSearch && matchTag;
    });
  }

  /**
   * Get tag class for styling
   */
  function getTagClass(tag) {
    if (tag === "coupon available") return "tag coupon";
    if (tag === "popular") return "tag popular";
    return "tag";
  }

  /**
   * Render a single restaurant card
   */
  function renderCard(restaurant) {
    const tagsHtml =
      (restaurant.tags && restaurant.tags.length)
        ? restaurant.tags
            .map(function (t) {
              return '<span class="' + getTagClass(t) + '">' + t + "</span>";
            })
            .join("")
        : "";

    return (
      '<article class="restaurant-card" data-id="' +
      restaurant.id +
      '">' +
      '<h3 class="restaurant-name">' +
      restaurant.name +
      "</h3>" +
      '<div class="restaurant-meta">' +
      '<span class="rating">' +
      restaurant.rating +
      "</span>" +
      "<span>" +
      restaurant.distance +
      "</span>" +
      "<span>" +
      restaurant.delivery_time +
      "</span>" +
      "</div>" +
      (tagsHtml
        ? '<div class="restaurant-tags">' + tagsHtml + "</div>"
        : "") +
      "</article>"
    );
  }

  /**
   * Update the restaurant list and empty state
   */
  function renderList() {
    const list = getFilteredRestaurants();

    if (list.length === 0) {
      restaurantListEl.innerHTML = "";
      restaurantListEl.classList.add("hidden");
      emptyStateEl.classList.remove("hidden");
      return;
    }

    emptyStateEl.classList.add("hidden");
    restaurantListEl.classList.remove("hidden");
    restaurantListEl.innerHTML = list.map(renderCard).join("");
  }

  // Search: update list on input
  searchInput.addEventListener("input", renderList);
  searchInput.addEventListener("keyup", renderList);

  // Quick filters
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      currentTagFilter = btn.getAttribute("data-filter") || "all";
      renderList();
    });
  });

  // Bottom nav (placeholder - no routing yet)
  document.querySelectorAll(".nav-item").forEach(function (item) {
    item.addEventListener("click", function (e) {
      if (item.getAttribute("data-tab") !== "home") {
        e.preventDefault();
        // Could show "Orders" or "Profile" placeholder later
      }
      document.querySelectorAll(".nav-item").forEach(function (n) {
        n.classList.remove("active");
      });
      item.classList.add("active");
    });
  });

  // Initial render: show all Ann Arbor restaurants
  renderList();
})();
