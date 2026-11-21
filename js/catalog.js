/* catalog.js — màn Danh mục: lọc, sửa tồn, giá đề xuất giảm */
(function (A) {

  const $ = A.$;
  let actF = new Set(), sortKey = "", sortDir = 1, hitId = null;

  /* bộ lọc hiện hành — các module khác cũng dùng lại */
  A.locDanhMuc = function () {
    const toks = ($("q").value || "").trim().split(/\s+/).map(A.norm).filter(Boolean);
    const m = $("mach").value, st = $("st").value, low = A.state.settings.low;
    return A.state.items.filter(r => {
      if (actF.size && !actF.has(A.grp(r))) return false;
      if (m && r.mach !== m) return false;
      if (st === "noprice" && r.price) return false;
      if (st === "nonew" && A.giaGiam(r).v != null) return false;
      if (st === "zero" && r.qty !== 0) return false;
      if (st === "low" && !(r.qty != null && r.qty <= low)) return false;
      if (st === "noqty" && r.qty != null) return false;
      if (toks.length) {
        const hay = A.norm(r.sku + " " + r.code + " " + r.name + " " + r.mach);
        if (!toks.every(t => hay.includes(t))) return false;
      }
      return true;
    });
  };

  function chips() {
    const cur = [...new Set(A.state.items.map(A.grp))].sort();
    [...actF].forEach(f => { if (!cur.includes(f)) actF.delete(f); });
    $("fchips").innerHTML = cur.length
      ? cur.map(f => `<div class="chip${actF.has(f) ? " on" : ""}" data-f="${f}">${f}</div>`).join("")
      : '<span class="note">Chưa có dữ liệu — vào Cài đặt để nhập file Excel</span>';
  }
  function machSelect() {
    const cur = [...new Set(A.state.items.map(r => r.mach))].sort(), v = $("mach").value;
    $("mach").innerHTML = '<option value="">Tất cả</option>' +
      cur.map(m => `<option${m === v ? " selected" : ""}>${A.esc(m)}</option>`).join("");
    $("machlist").innerHTML = cur.map(m => `<option value="${A.esc(m)}">`).join("");
  }

  function render() {
    chips(); machSelect();
    let rows = A.locDanhMuc();
    if (sortKey) {
      rows = [...rows].sort((x, y) => {
        const g = r => ({ code: r.code, name: r.name, qty: r.qty ?? -1, price: r.price ?? -1,
          np: A.giaGiam(r).v ?? -1,
          pct: r.price ? 1 - (A.giaGiam(r).v ?? r.price) / r.price : -1 })[sortKey];
        const a = g(x), b = g(y);
        return (typeof a === "string" ? a.localeCompare(b, "vi") : a - b) * sortDir;
      });
    }
    let html = "", last = "";
    rows.forEach(r => {
      if (!sortKey && r.mach !== last) { last = r.mach; html += `<tr class="grp"><td colspan="7">${A.esc(r.mach)}</td></tr>`; }
      const s = A.giaGiam(r);
      html += `<tr data-id="${r.id}"${r.id === hitId ? ' class="hit"' : ""}>
        <td class="code">${A.esc(r.code)}${r.sku ? `<span class="sku">${A.esc(r.sku)}</span>` : ""}</td>
        <td class="desc">${A.esc(r.name)}</td>
        <td class="num"><input class="cell qty" type="number" data-k="qty" value="${r.qty == null ? "" : r.qty}" placeholder="?"></td>
        <td class="num"><input class="cell" type="number" data-k="price" value="${r.price == null ? "" : r.price}" placeholder="?"></td>
        <td class="num"><input class="cell" type="number" data-k="given" value="${s.v == null ? "" : s.v}" placeholder="—"></td>
        <td class="num"><span class="j-tag"></span> <span class="pct j-pct"></span></td>
        <td><div class="act">
          <button class="mini i" data-a="in" title="Nhập thêm">+</button>
          <button class="mini o" data-a="out" title="Xuất bớt">−</button>
          <button class="del" data-a="del" title="Xoá khỏi danh mục">✕</button>
        </div></td></tr>`;
    });
    $("tb").innerHTML = html;
    $("none").style.display = rows.length ? "none" : "block";
    $("tb").querySelectorAll("tr[data-id]").forEach(paint);
    stats(rows);
  }
  A.veDanhMuc = render;

  const rowOf = tr => A.state.items.find(r => r.id === tr.dataset.id);

  function badge(tr, r) {
    const s = A.giaGiam(r);
    const pct = (r.price && s.v != null) ? "−" + ((1 - s.v / r.price) * 100).toFixed(1) + "%" : "—";
    tr.querySelector(".j-pct").textContent = pct;
    const t = tr.querySelector(".j-tag");
    t.className = "j-tag tag " + (s.src === "man" ? "t-man" : s.src === "old" ? "t-old" : s.src === "no" ? "t-no" : "t-new");
    t.textContent = s.src === "man" ? "tự đặt" : s.src === "old" ? "có sẵn" : s.src === "no" ? "thiếu giá" : "đề xuất";
    return s;
  }
  function paint(tr) {
    const r = rowOf(tr); if (!r) return;
    const s = badge(tr, r);
    const gi = tr.querySelector('input[data-k="given"]');
    if (document.activeElement !== gi) gi.value = s.v == null ? "" : s.v;
    const qi = tr.querySelector('input[data-k="qty"]');
    qi.classList.toggle("need", r.qty == null);
    qi.value = document.activeElement === qi ? qi.value : (r.qty == null ? "" : r.qty);
    tr.querySelector('input[data-k="price"]').classList.toggle("need", !r.price);
  }

  function stats(rows) {
    rows = rows || A.locDanhMuc();
    let tq = 0, tc = 0, tn = 0, ng = 0;
    rows.forEach(r => { const q = r.qty || 0, s = A.giaGiam(r);
      tq += q; if (!r.price) ng++; else { tc += q * r.price; tn += q * (s.v ?? r.price); } });
    $("s1").textContent = A.fm(rows.length); $("s2").textContent = A.fm(tq);
    $("s6").textContent = A.fm(ng); $("s3").textContent = A.fm(tc);
    $("s4").textContent = A.fm(tn); $("s5").textContent = "−" + A.fm(tc - tn);
    A.veThanhDay();
  }

  A.veThanhDay = function () {
    const n = A.state.items.length, co = A.state.items.filter(r => A.giaGiam(r).v != null).length;
    $("barinfo").innerHTML = n
      ? `Danh mục <b>${A.fm(n)}</b> linh kiện · đã có giá giảm <b>${A.fm(co)}</b> · còn thiếu <b>${A.fm(n - co)}</b>`
      : "Danh mục đang trống — vào Cài đặt để nhập file Excel";
  };

  /* nhảy tới một linh kiện (dùng cho quét mã vạch) */
  A.toiLinhKien = function (item) {
    A.show("catalog");
    $("q").value = item.sku || item.code;
    $("st").value = ""; $("mach").value = ""; actF.clear(); sortKey = "";
    hitId = item.id; render();
    const tr = $("tb").querySelector(`tr[data-id="${item.id}"]`);
    if (tr) { tr.scrollIntoView({ block: "center", behavior: "smooth" });
      tr.querySelector('input[data-k="qty"]').focus(); }
  };

  /* ---------- sự kiện ---------- */
  function bind() {
    $("tb").addEventListener("input", e => {
      const i = e.target.closest("input.cell"); if (!i) return;
      const tr = i.closest("tr"), r = rowOf(tr); if (!r) return;
      const k = i.dataset.k, raw = i.value.trim();
      if (k === "qty") r.qty = raw === "" ? null : Math.max(0, Math.round(+raw || 0));
      else if (k === "price") r.price = raw === "" ? null : Math.max(0, +raw || 0);
      else if (k === "given") {
        if (raw === "") { r.given = null; r.manual = false; }
        else { r.given = Math.max(0, +raw || 0); r.manual = true; }
      }
      if (k === "given") badge(tr, r); else paint(tr);
      stats(); A.save();
    });

    $("tb").addEventListener("click", e => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      const tr = b.closest("tr[data-id]"), r = rowOf(tr); if (!r) return;
      const a = b.dataset.a;
      if (a === "del") {
        if (!confirm("Xoá " + r.code + " khỏi danh mục?")) return;
        A.state.items = A.state.items.filter(x => x.id !== r.id); A.save(); render();
      } else {
        const n = prompt((a === "in" ? "Nhập thêm bao nhiêu " : "Xuất ra bao nhiêu ") + r.code + "?", "1");
        if (n == null) return;
        const q = Math.round(Number(n) || 0); if (q <= 0) return;
        A.ghiPhieu(a, r, q, a === "in" ? "Nhập nhanh từ danh mục" : "Xuất nhanh từ danh mục");
        A.flash((a === "in" ? "Đã nhập " : "Đã xuất ") + q + " × " + r.code + " · tồn còn " + r.qty);
        paint(tr); stats(); if (A.views.moves) A.views.moves.ve();
      }
    });

    $("fchips").onclick = e => { const c = e.target.closest(".chip"); if (!c) return;
      const f = c.dataset.f; actF.has(f) ? actF.delete(f) : actF.add(f); render(); };
    document.querySelectorAll('#v-catalog th[data-s]').forEach(th => th.onclick = () => {
      const k = th.dataset.s; sortDir = sortKey === k ? -sortDir : 1; sortKey = k; render(); });
    ["q", "mach", "st"].forEach(id => $(id).addEventListener("input", () => { hitId = null; render(); }));
    $("reset").onclick = () => { $("q").value = ""; $("mach").value = ""; $("st").value = "";
      actF.clear(); sortKey = ""; hitId = null; render(); };

    ["t1","t2","t3","t4","t5"].forEach((id, i) => $(id).addEventListener("input", () => {
      A.state.settings.tiers[i] = +$(id).value || 0;
      $("tb").querySelectorAll("tr[data-id]").forEach(paint); stats(); A.save(); }));
    $("recalc").addEventListener("change", () => {
      A.state.settings.recalc = $("recalc").checked;
      $("tb").querySelectorAll("tr[data-id]").forEach(paint); stats(); A.save(); });

    $("addItem").onclick = () => {
      const code = $("n_code").value.trim(), name = $("n_name").value.trim();
      if (!code && !name) { $("addmsg").textContent = "Cần ít nhất Mã hoặc Tên linh kiện."; return; }
      A.state.items.push(A.mkItem({ sku: $("n_sku").value, mach: $("n_mach").value.trim() || A.doanNhom(name),
        code: code || $("n_sku").value, name, qty: $("n_qty").value, price: $("n_price").value }));
      ["n_sku","n_code","n_name","n_qty","n_price"].forEach(i => $(i).value = "");
      $("addmsg").textContent = "Đã thêm " + (code || name) + ".";
      A.save(); render();
    };
    $("saveAll").onclick = A.xuatDanhMuc;
    $("scanBtn").onclick = () => A.moQuet(it => A.toiLinhKien(it));
  }

  A.views.catalog = { ve: render, onShow: render, bind };

})(window.App);
