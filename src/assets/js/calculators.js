(function () {
  function num(input) {
    if (!input) return NaN;
    var value = String(input.value || "").trim().replace(/,/g, "");
    if (value === "") return NaN;
    var n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function money(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  }

  function miles(value) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(value);
  }

  function pct(value) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 1,
    }).format(value) + "%";
  }

  function rpm(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    }).format(value);
  }

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  function show(result, ok) {
    if (!result) return;
    result.hidden = false;
    result.setAttribute("data-state", ok ? "ok" : "error");
  }

  function checked(root, name) {
    var input = root.querySelector('input[name="' + name + '"]:checked');
    return input ? input.value : "";
  }

  function bindLive(root, run) {
    root.querySelectorAll("input").forEach(function (input) {
      input.addEventListener("input", run);
      input.addEventListener("change", run);
    });
    var button = root.querySelector("[data-calculate]");
    if (button) button.addEventListener("click", run);
    run();
  }

  function ratePerMile(root) {
    var payEl = root.querySelector("#rpm-pay");
    var loadedEl = root.querySelector("#rpm-loaded");
    var deadheadEl = root.querySelector("#rpm-deadhead");
    var result = root.querySelector("[data-result]");
    var error = root.querySelector("[data-error]");
    var run = function () {
      var pay = num(payEl);
      var loaded = num(loadedEl);
      var deadhead = num(deadheadEl);
      if ([pay, loaded, deadhead].some(function (n) { return !Number.isFinite(n); })) {
        setText(error, "Enter a number in every field. Use 0 if there is no deadhead.");
        show(result, false);
        return;
      }
      if (pay < 0 || loaded < 0 || deadhead < 0) {
        setText(error, "Pay and miles cannot be negative.");
        show(result, false);
        return;
      }
      if (loaded === 0) {
        setText(error, "Loaded miles have to be greater than zero.");
        show(result, false);
        return;
      }
      var total = loaded + deadhead;
      setText(error, "");
      setText(root.querySelector("[data-loaded-rpm]"), rpm(pay / loaded) + " per loaded mile");
      setText(root.querySelector("[data-true-rpm]"), rpm(pay / total) + " per mile, including deadhead");
      setText(root.querySelector("[data-total-miles]"), miles(total) + " total miles");
      setText(root.querySelector("[data-deadhead-share]"), total ? pct((deadhead / total) * 100) + " of the trip is empty" : "—");
      show(result, true);
    };
    bindLive(root, run);
  }

  function dispatchFee(root) {
    var linehaulEl = root.querySelector("#fee-linehaul");
    var fscEl = root.querySelector("#fee-fsc");
    var percentEl = root.querySelector("#fee-percent");
    var weeklyFeeEl = root.querySelector("#fee-weekly");
    var weeklyGrossEl = root.querySelector("#fee-weekly-gross");
    var result = root.querySelector("[data-result]");
    var error = root.querySelector("[data-error]");
    var percentFields = root.querySelector("[data-mode-percent]");
    var weeklyFields = root.querySelector("[data-mode-weekly]");
    var run = function () {
      var mode = checked(root, "fee-mode") || "percent";
      if (percentFields) percentFields.hidden = mode !== "percent";
      if (weeklyFields) weeklyFields.hidden = mode !== "weekly";

      if (mode === "weekly") {
        var weeklyFee = num(weeklyFeeEl);
        var weeklyGross = num(weeklyGrossEl);
        if (![weeklyFee, weeklyGross].every(Number.isFinite)) {
          setText(error, "Enter the weekly fee and the weekly gross.");
          show(result, false);
          return;
        }
        if (weeklyFee < 0 || weeklyGross < 0) {
          setText(error, "Amounts cannot be negative.");
          show(result, false);
          return;
        }
        if (weeklyGross === 0) {
          setText(error, "Weekly gross has to be greater than zero to compare a flat fee.");
          show(result, false);
          return;
        }
        var keep = weeklyGross - weeklyFee;
        var effective = (weeklyFee / weeklyGross) * 100;
        setText(error, "");
        setText(root.querySelector("[data-basis]"), "Flat weekly fee on " + money(weeklyGross) + " of weekly gross");
        setText(root.querySelector("[data-fee]"), money(weeklyFee) + " (" + pct(effective) + " of that weekly gross)");
        setText(root.querySelector("[data-keep]"), money(keep));
        setText(root.querySelector("[data-breakeven]"), "A flat fee does not move with a single load. If weekly gross stays at " + money(weeklyGross) + ", this fee is already built into what you keep.");
        show(result, true);
        return;
      }

      var linehaul = num(linehaulEl);
      var fsc = num(fscEl);
      var percent = num(percentEl);
      var basis = checked(root, "fee-basis") || "gross";
      if (![linehaul, fsc, percent].every(Number.isFinite)) {
        setText(error, "Enter linehaul, fuel surcharge, and the fee percentage. Use 0 if there is no fuel surcharge.");
        show(result, false);
        return;
      }
      if (linehaul < 0 || fsc < 0 || percent < 0) {
        setText(error, "Amounts and percentages cannot be negative.");
        show(result, false);
        return;
      }
      if (percent >= 100) {
        setText(error, "A percentage fee has to be less than 100.");
        show(result, false);
        return;
      }
      var gross = linehaul + fsc;
      var base = basis === "linehaul" ? linehaul : gross;
      if (base === 0) {
        setText(error, "The amount the percentage is charged on has to be greater than zero.");
        show(result, false);
        return;
      }
      var fee = base * (percent / 100);
      var keep = gross - fee;
      var raise = percent / (100 - percent) * 100;
      var basisLabel = basis === "linehaul" ? "linehaul only" : "gross, including fuel surcharge";
      setText(error, "");
      setText(root.querySelector("[data-basis]"), money(base) + " (" + basisLabel + ")");
      setText(root.querySelector("[data-fee]"), money(fee));
      setText(root.querySelector("[data-keep]"), money(keep) + " from a " + money(gross) + " gross");
      setText(root.querySelector("[data-breakeven]"), "To keep the same money after a " + pct(percent) + " fee on " + basisLabel + ", the figures the fee is charged on would need to rise by " + pct(raise) + ".");
      show(result, true);
    };
    bindLive(root, run);
  }

  function factoringCost(root) {
    var invoiceEl = root.querySelector("#fac-invoice");
    var advanceEl = root.querySelector("#fac-advance");
    var feeEl = root.querySelector("#fac-fee");
    var reserveEl = root.querySelector("#fac-reserve");
    var result = root.querySelector("[data-result]");
    var error = root.querySelector("[data-error]");
    var note = root.querySelector("[data-note]");
    var run = function () {
      var invoice = num(invoiceEl);
      var advancePct = num(advanceEl);
      var feePct = num(feeEl);
      var reservePct = num(reserveEl);
      var timing = checked(root, "fac-timing") || "reserve";
      if (![invoice, advancePct, feePct, reservePct].every(Number.isFinite)) {
        setText(error, "Enter the invoice amount and all three percentages. Use 0 if a line does not apply.");
        show(result, false);
        return;
      }
      if (invoice < 0 || advancePct < 0 || feePct < 0 || reservePct < 0) {
        setText(error, "Amounts and percentages cannot be negative.");
        show(result, false);
        return;
      }
      if (advancePct > 100 || feePct > 100 || reservePct > 100) {
        setText(error, "Percentages cannot be over 100.");
        show(result, false);
        return;
      }
      var advance = invoice * (advancePct / 100);
      var fee = invoice * (feePct / 100);
      var reserve = invoice * (reservePct / 100);
      var today;
      var later;
      if (timing === "advance") {
        today = advance - fee;
        later = reserve;
      } else {
        today = advance;
        later = reserve - fee;
      }
      var total = today + later;
      var notes = [];
      var split = advancePct + reservePct;
      if (Math.abs(split - 100) > 0.05) {
        notes.push("The advance and reserve add up to " + pct(split) + ", not 100%. Check your agreement; this estimate may not match how your factor funds a load.");
      }
      if (today < 0 || later < 0) {
        notes.push("One of the payment moments came out negative with these percentages. That usually means the fee is larger than the advance or the reserve in the structure you selected. Read the contract, and do not treat this figure as a quote.");
      }
      setText(error, "");
      setText(root.querySelector("[data-today]"), money(today));
      setText(root.querySelector("[data-later]"), money(later));
      setText(root.querySelector("[data-total]"), money(total));
      setText(root.querySelector("[data-fee]"), money(fee));
      setText(note, notes.join(" "));
      if (note) note.hidden = notes.length === 0;
      show(result, true);
    };
    bindLive(root, run);
  }

  var runners = {
    "true-rate-per-mile": ratePerMile,
    "dispatch-fee": dispatchFee,
    "factoring-cost": factoringCost,
  };

  document.querySelectorAll("[data-calculator]").forEach(function (root) {
    var type = root.getAttribute("data-calculator");
    if (runners[type]) runners[type](root);
  });
})();
