(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  var storageKey = "dispatchcove-affiliate-subs";
  var pageParams = new URLSearchParams(window.location.search);
  var incoming = {
    sub1: pageParams.get("sub1") || pageParams.get("gclid") || "",
    sub2: pageParams.get("sub2") || pageParams.get("keyword") || "",
    sub3: pageParams.get("sub3") || pageParams.get("campaignid") || pageParams.get("utm_campaign") || "",
    sub4: pageParams.get("sub4") || pageParams.get("adgroupid") || "",
    sub5: pageParams.get("sub5") || pageParams.get("creative") || pageParams.get("utm_content") || ""
  };
  var saved = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
  } catch (error) {
    saved = {};
  }
  var tracking = {
    sub1: incoming.sub1 || saved.sub1 || "",
    sub2: incoming.sub2 || saved.sub2 || "",
    sub3: incoming.sub3 || saved.sub3 || "",
    sub4: incoming.sub4 || saved.sub4 || "",
    sub5: incoming.sub5 || saved.sub5 || ""
  };
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(tracking));
  } catch (error) {
    /* The current page can still append what it already has. */
  }

  document.querySelectorAll("a.affiliate-link[href]").forEach(function (link) {
    var href = link.getAttribute("href") || "";
    if (!/^https?:\/\//i.test(href)) return;
    var extra = [];
    Object.keys(tracking).forEach(function (key) {
      if (tracking[key] && href.indexOf(key + "=") === -1) {
        extra.push(encodeURIComponent(key) + "=" + encodeURIComponent(tracking[key]));
      }
    });
    if (extra.length) {
      link.setAttribute("href", href + (href.indexOf("?") === -1 ? "?" : "&") + extra.join("&"));
    }
    link.addEventListener("click", function () {
      if (typeof window.gtag === "function") {
        window.gtag("event", "affiliate_outbound_click", {
          link_url: link.href,
          product_name: link.getAttribute("data-product") || "",
          transport_type: "beacon"
        });
      }
    });
  });
})();
