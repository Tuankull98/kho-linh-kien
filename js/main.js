/* main.js — khởi động ứng dụng */
(function (A) {

  const $ = A.$;

  A.veTatCa = function () {
    Object.values(A.views).forEach(v => { if (v.ve) try { v.ve(); } catch (e) { console.warn(e); } });
    A.veThanhDay();
  };

  function dienThongSo() {
    const s = A.state.settings;
    ["t1","t2","t3","t4","t5"].forEach((id, i) => $(id).value = s.tiers[i]);
    $("recalc").checked = !!s.recalc;
    $("rpLow").value = s.low; $("rpDays").value = s.slowDays;
  }

  async function khoiDong() {
    Object.values(A.views).forEach(v => { if (v.bind) v.bind(); });

    $("tabs").onclick = e => { const b = e.target.closest("button[data-v]"); if (b) A.show(b.dataset.v); };

    try { await A.load(); } catch (e) { console.warn(e); }

    dienThongSo();
    A.veTatCa();

    const h = (location.hash || "").replace("#", "");
    A.show(A.views[h] ? h : (A.state.items.length ? "catalog" : "settings"));

    if (!A.state.items.length)
      A.flash("Chưa có dữ liệu — nhập file Excel ở màn Cài đặt");

    window.addEventListener("beforeunload", () => { try { A.save(true); } catch (e) {} });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", khoiDong);
  else khoiDong();

})(window.App);
