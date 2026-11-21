/* core.js — tiện ích chung, dùng cho mọi module */
window.App = window.App || {};
(function (A) {

  A.$  = id => document.getElementById(id);
  A.el = (tag, cls, html) => { const e = document.createElement(tag);
    if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  /* bỏ dấu tiếng Việt + bỏ khoảng trắng, dấu gạch -> để tìm kiếm dễ dãi */
  A.norm = s => (s || "").toString().toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");

  A.fm = n => (n == null || n === "" || Number.isNaN(n)) ? "—" : Number(n).toLocaleString("vi-VN");
  A.num = v => {
    if (v == null || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    let s = String(v).trim().replace(/[^\d.,-]/g, "");
    if (!/\d/.test(s)) return null;              // toàn chữ, không phải số
    const cham = s.lastIndexOf("."), phay = s.lastIndexOf(",");
    if (cham >= 0 && phay >= 0) {
      /* có cả hai: dấu nào đứng sau là dấu thập phân — hợp cả 1,234.5 lẫn 1.234,5 */
      s = cham > phay ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
    } else if (phay >= 0) {
      s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
    } else if (cham >= 0) {
      if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    }
    const x = Number(s);
    return Number.isFinite(x) ? x : null;
  };
  A.now = () => new Date().toISOString();
  A.gio = iso => { try { return new Date(iso).toLocaleString("vi-VN"); } catch (e) { return ""; } };
  A.ngay = iso => { try { return new Date(iso).toLocaleDateString("vi-VN"); } catch (e) { return ""; } };
  A.hnay = () => new Date().toISOString().slice(0, 10);
  A.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  A.soNgay = iso => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;
  A.esc = s => (s || "").toString().replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let ft;
  A.flash = (msg, bad) => {
    const f = A.$("flash"); if (!f) return;
    f.className = "flash" + (bad ? " bad" : ""); f.textContent = msg;
    clearTimeout(ft); ft = setTimeout(() => { f.textContent = ""; }, 3200);
  };

  /* nhóm F từ mã linh kiện: "F12 - D811" -> "F12" */
  A.grp = r => { const m = /^([Ff]\d{1,2})/.exec((r.code || "").replace(/\s/g, ""));
    return m ? m[1].toUpperCase() : "Khác"; };

  /* khoá nhận dạng một linh kiện: ưu tiên mã hàng, không có thì mã + tên */
  A.key = r => A.norm(r.sku) || (A.norm(r.code) + "|" + A.norm(r.name));

  /* đoán nhóm máy từ tên linh kiện */
  const NHOM = [["kingsmith","Máy chạy bộ Kingsmith"],["kingmist","Máy chạy bộ Kingsmith"],
    ["maychay","Máy chạy bộ Kingsmith"],["dreame","Robot hút bụi Dreame"],["dreane","Robot hút bụi Dreame"],
    ["roborock","Robot hút bụi Roborock"],["dyad","Robot hút bụi Roborock"],["redroad","Robot hút bụi Redroad"],
    ["ecovacs","Robot hút bụi Ecovacs"],["deebot","Robot hút bụi Ecovacs"],["aivi","Robot hút bụi Ecovacs"],
    ["xiaomi","Robot hút bụi Xiaomi"],["mijia","Robot hút bụi Xiaomi"],["robot","Robot hút bụi khác"]];
  A.doanNhom = txt => { const n = A.norm(txt);
    for (const [k, v] of NHOM) if (n.includes(k)) return v; return "Chưa phân nhóm"; };

  /* tìm linh kiện theo chuỗi gõ vào — mọi từ đều phải khớp */
  A.timKiem = (list, q, max) => {
    const toks = (q || "").trim().split(/\s+/).map(A.norm).filter(Boolean);
    if (!toks.length) return [];
    const out = [];
    for (const r of list) {
      const hay = A.norm(r.sku + " " + r.code + " " + r.name + " " + r.mach);
      if (toks.every(t => hay.includes(t))) { out.push(r); if (max && out.length >= max) break; }
    }
    return out;
  };

  /* giá đề xuất giảm theo bậc tồn kho */
  A.bacGiam = q => { const t = A.state.settings.tiers;
    if (q == null) return t[4];
    if (q >= 20) return t[0]; if (q >= 10) return t[1];
    if (q >= 5) return t[2];  if (q >= 2)  return t[3]; return t[4]; };

  A.giaGiam = r => {
    if (r.manual && r.given != null) return { v: r.given, src: "man" };
    if (r.given != null && !A.state.settings.recalc) return { v: r.given, src: "old" };
    if (!r.price) return { v: null, src: "no" };
    const b = A.state.settings.round || 10000;
    return { v: Math.floor(r.price * (1 - A.bacGiam(r.qty) / 100) / b) * b, src: "new" };
  };
  A.tyLe = (price, np) => (price && np != null) ? -((1 - np / price) * 100).toFixed(1) : "";

  /* chuyển trang */
  A.views = {};
  A.show = v => {
    document.querySelectorAll(".view").forEach(s => { s.hidden = s.id !== "v-" + v; });
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
    location.hash = v;
    const m = A.views[v]; if (m && m.onShow) m.onShow();
  };

})(window.App);
