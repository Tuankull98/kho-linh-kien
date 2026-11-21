/* count.js — kiểm kê theo phiên: đếm thực tế, so sổ sách, chốt phiên sinh phiếu điều chỉnh */
(function (A) {

  const $ = A.$;
  let hien = null;      // phiên đang mở
  let timKiem = "";

  const dangMo = () => A.state.counts.find(c => c.status === "open") || null;

  /* ---------- mở / huỷ / chốt ---------- */
  function mo() {
    if (dangMo()) { A.flash("Đang có một phiên chưa chốt", true); return; }
    const nguon = $("ctScope").value === "filter" ? A.locDanhMuc() : A.state.items;
    if (!nguon.length) { A.flash("Không có linh kiện nào trong phạm vi đã chọn", true); return; }
    const p = {
      id: A.uid(), name: $("ctName").value.trim() || ("Kiểm kê " + new Date().toLocaleDateString("vi-VN")),
      at: A.now(), closedAt: null, status: "open",
      lines: nguon.map(r => ({ itemId: r.id, sku: r.sku, code: r.code, name: r.name,
                               book: r.qty || 0, real: null, price: r.price }))
    };
    A.state.counts.unshift(p); hien = p; A.save(); ve();
    A.flash("Đã mở phiên với " + p.lines.length + " mã");
  }

  function huy() {
    if (!hien) return;
    if (!confirm("Huỷ phiên này? Số đã đếm sẽ mất, tồn kho giữ nguyên.")) return;
    A.state.counts = A.state.counts.filter(c => c.id !== hien.id);
    hien = null; A.save(); ve(); A.flash("Đã huỷ phiên");
  }

  function chot() {
    if (!hien) return;
    const lech = hien.lines.filter(l => l.real != null && l.real !== l.book);
    const chuaDem = hien.lines.filter(l => l.real == null).length;
    let msg = "Chốt phiên?\n\n• Lệch: " + lech.length + " mã → sẽ sinh phiếu điều chỉnh, tồn lấy theo số đếm thực tế.";
    if (chuaDem) msg += "\n• Chưa đếm: " + chuaDem + " mã → giữ nguyên tồn cũ.";
    if (!confirm(msg)) return;
    lech.forEach(l => {
      const it = A.state.items.find(r => r.id === l.itemId);
      if (it) A.ghiPhieu("adj", it, l.real, "Kiểm kê: " + hien.name, hien.id);
    });
    hien.status = "closed"; hien.closedAt = A.now();
    hien.diff = lech.length;
    hien.value = lech.reduce((s, l) => s + (l.real - l.book) * (l.price || 0), 0);
    hien = null; A.save(); ve(); A.veDanhMuc();
    if (A.views.moves) A.views.moves.ve();
    A.flash("Đã chốt phiên, điều chỉnh " + lech.length + " mã");
  }

  /* ---------- nhập số đếm ---------- */
  function dem(itemId, so) {
    if (!hien) return;
    const l = hien.lines.find(x => x.itemId === itemId); if (!l) return;
    l.real = (so === "" || so == null) ? null : Math.max(0, Math.round(Number(so) || 0));
    A.save();
  }
  /* quét mã vạch trong lúc kiểm kê: cộng dồn 1 cái mỗi lần quét */
  A.demQuet = function (item) {
    if (!hien) { A.flash("Chưa mở phiên kiểm kê", true); return; }
    const l = hien.lines.find(x => x.itemId === item.id);
    if (!l) { A.flash(item.code + " không nằm trong phiên này", true); return; }
    l.real = (l.real || 0) + 1; A.save(); ve();
    A.flash("Đếm " + item.code + ": " + l.real);
  };

  /* ---------- vẽ ---------- */
  function ve() {
    hien = hien || dangMo();
    $("ctOpen").hidden = !!hien;
    $("ctRun").hidden = !hien;
    veLichSu();
    if (!hien) return;

    $("ctTitle").textContent = hien.name;
    $("ctMeta").textContent = "Mở lúc " + A.gio(hien.at) + " · " + hien.lines.length + " mã";

    const chiThieu = $("ctOnlyLeft").checked, toks = A.norm(timKiem);
    let ds = hien.lines;
    if (chiThieu) ds = ds.filter(l => l.real == null);
    if (toks) ds = ds.filter(l => A.norm(l.code + " " + l.name + " " + l.sku).includes(toks));

    $("ctTb").innerHTML = ds.slice(0, 600).map(l => {
      const d = l.real == null ? null : l.real - l.book;
      return `<tr data-id="${l.itemId}">
        <td class="code">${A.esc(l.code)}${l.sku ? `<span class="sku">${A.esc(l.sku)}</span>` : ""}</td>
        <td class="desc">${A.esc(l.name)}</td>
        <td class="num">${l.book}</td>
        <td class="num"><input class="cell qty ${l.real == null ? "" : (d ? "need" : "ok")}"
             type="number" data-c="1" value="${l.real == null ? "" : l.real}" placeholder="?"></td>
        <td class="num" style="font-weight:700;color:${!d ? "var(--muted)" : d > 0 ? "var(--ok)" : "var(--down)"}">
          ${d == null ? "—" : (d > 0 ? "+" + d : d)}</td>
        <td class="num">${d == null || !l.price ? "—" : A.fm(d * l.price)}</td></tr>`;
    }).join("");

    const daDem = hien.lines.filter(l => l.real != null);
    const lech = daDem.filter(l => l.real !== l.book);
    $("c1").textContent = A.fm(hien.lines.length);
    $("c2").textContent = A.fm(daDem.length);
    $("c3").textContent = A.fm(hien.lines.length - daDem.length);
    $("c4").textContent = A.fm(lech.length);
    $("c5").textContent = A.fm(lech.reduce((s, l) => s + (l.real - l.book) * (l.price || 0), 0));
  }

  function veLichSu() {
    const ds = A.state.counts.filter(c => c.status === "closed");
    $("ctHist").innerHTML = ds.length ? '<div class="lst">' + ds.slice(0, 30).map(c =>
      `<div class="l"><div><b>${A.esc(c.name)}</b>
        <small>Chốt ${A.gio(c.closedAt)} · ${c.lines.length} mã · lệch ${c.diff || 0} mã</small></div>
        <span class="n ${(c.value || 0) < 0 ? "bad" : "good"}">${A.fm(c.value || 0)}</span>
        <button class="mini" data-h="${c.id}">Xuất lại</button></div>`).join("") + "</div>"
      : '<p class="note">Chưa có phiên nào được chốt.</p>';
  }

  function xuat(p) {
    p = p || hien; if (!p) return;
    const rows = p.lines.map(l => [l.sku, l.code, l.name, l.book, l.real ?? "",
      l.real == null ? "" : l.real - l.book, l.price ?? "",
      (l.real == null || !l.price) ? "" : (l.real - l.book) * l.price]);
    A.taiXlsx([{ name: "Kiểm kê", rows,
      head: ["Mã hàng","Mã linh kiện","Tên linh kiện","Sổ sách","Thực tế","Lệch","Giá","Giá trị lệch"],
      cols: [12, 14, 50, 10, 10, 9, 13, 15] }],
      "Kiem-ke-" + A.hnay() + ".xlsx", "Đã xuất bảng kiểm kê " + p.lines.length + " dòng");
  }

  function bind() {
    $("ctStart").onclick = mo;
    $("ctCancel").onclick = huy;
    $("ctClose").onclick = chot;
    $("ctExport").onclick = () => xuat();
    $("ctOnlyLeft").onchange = ve;
    $("ctSeek").addEventListener("input", () => { timKiem = $("ctSeek").value; ve(); });
    $("ctScan").onclick = () => A.moQuet(it => A.demQuet(it), true);
    $("ctTb").addEventListener("input", e => {
      const i = e.target.closest("input[data-c]"); if (!i) return;
      const id = i.closest("tr").dataset.id;
      dem(id, i.value);
      const l = hien.lines.find(x => x.itemId === id), d = l.real == null ? null : l.real - l.book;
      i.className = "cell qty " + (l.real == null ? "" : (d ? "need" : "ok"));
      const tds = i.closest("tr").children;
      tds[4].textContent = d == null ? "—" : (d > 0 ? "+" + d : d);
      tds[4].style.color = !d ? "var(--muted)" : d > 0 ? "var(--ok)" : "var(--down)";
      tds[5].textContent = (d == null || !l.price) ? "—" : A.fm(d * l.price);
      const daDem = hien.lines.filter(x => x.real != null), lech = daDem.filter(x => x.real !== x.book);
      $("c2").textContent = A.fm(daDem.length);
      $("c3").textContent = A.fm(hien.lines.length - daDem.length);
      $("c4").textContent = A.fm(lech.length);
      $("c5").textContent = A.fm(lech.reduce((s, l) => s + (l.real - l.book) * (l.price || 0), 0));
    });
    $("ctHist").onclick = e => { const b = e.target.closest("[data-h]"); if (!b) return;
      xuat(A.state.counts.find(c => c.id === b.dataset.h)); };
  }

  A.views.count = { ve, onShow: ve, bind };

})(window.App);
