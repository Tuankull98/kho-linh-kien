/* moves.js — phiếu nhập / xuất / điều chỉnh và sổ lịch sử */
(function (A) {

  const $ = A.$;
  let chon = null, sel = -1, ds = [];

  const TEN = { in: "Nhập", out: "Xuất", adj: "Điều chỉnh" };
  const CLS = { in: "t-in", out: "t-out", adj: "t-adj" };

  /* ---------- ô tìm linh kiện có gợi ý ---------- */
  function veGoiY() {
    const box = $("mvSugg");
    if (!ds.length) { box.className = "sugg"; box.innerHTML = ""; return; }
    box.className = "sugg on";
    box.innerHTML = ds.map((r, i) =>
      `<div data-i="${i}" class="${i === sel ? "sel" : ""}"><b>${A.esc(r.code)}</b> ${A.esc(r.name)}
       <small style="color:var(--muted)"> · tồn ${r.qty == null ? "?" : r.qty}</small></div>`).join("");
  }
  function chonLK(r) {
    chon = r; ds = []; sel = -1; veGoiY();
    $("mvSeek").value = r.code + " — " + r.name;
    $("mvPick").innerHTML = `Đang chọn <b>${A.esc(r.code)}</b> · tồn hiện tại <b>${r.qty == null ? "?" : r.qty}</b>`
      + (r.price ? ` · giá ${A.fm(r.price)}` : "");
    $("mvAdd").disabled = false;
    $("mvQty").focus(); $("mvQty").select();
  }
  function boChon() {
    chon = null; $("mvAdd").disabled = true;
    $("mvPick").textContent = "Chưa chọn linh kiện nào.";
  }

  /* ---------- sổ ---------- */
  function locSo() {
    const q = A.norm($("mvFilter").value), t = $("mvFType").value;
    return A.state.moves.filter(m => {
      if (t && m.type !== t) return false;
      if (q && !A.norm(m.code + " " + m.name + " " + m.note + " " + m.sku).includes(q)) return false;
      return true;
    });
  }
  function ve() {
    const rows = locSo().slice(0, 400);
    $("mvTb").innerHTML = rows.map(m => `<tr data-id="${m.id}">
      <td style="white-space:nowrap;font-size:12.5px">${A.gio(m.at)}</td>
      <td><span class="tag ${CLS[m.type]}">${TEN[m.type]}</span></td>
      <td class="code">${A.esc(m.code)}</td>
      <td class="desc">${A.esc(m.name)}</td>
      <td class="num" style="font-weight:700;color:${m.qty < 0 ? "var(--down)" : "var(--ok)"}">
        ${m.qty > 0 ? "+" : ""}${m.qty}</td>
      <td class="num">${m.after}</td>
      <td style="font-size:12.5px;color:var(--muted)">${A.esc(m.note)}</td>
      <td><button class="del" title="Huỷ phiếu, trả tồn về như cũ">✕</button></td></tr>`).join("");
    $("mvNone").style.display = rows.length ? "none" : "block";
  }

  function xuatSo() {
    const rows = locSo().map(m => [A.gio(m.at), TEN[m.type], m.sku, m.code, m.name,
      m.qty, m.before, m.after, m.price ?? "", m.note]);
    if (!rows.length) { A.flash("Sổ đang trống", true); return; }
    A.taiXlsx([{ name: "Nhập xuất", rows,
      head: ["Thời gian","Loại","Mã hàng","Mã linh kiện","Tên linh kiện","Số lượng","Tồn trước","Tồn sau","Giá","Ghi chú"],
      cols: [18, 12, 12, 14, 50, 9, 10, 10, 13, 28] }],
      "So-nhap-xuat-" + A.hnay() + ".xlsx", "Đã xuất " + rows.length + " phiếu");
  }

  /* ---------- sự kiện ---------- */
  function bind() {
    $("mvSeek").addEventListener("input", () => {
      boChon();
      ds = A.timKiem(A.state.items, $("mvSeek").value, 12); sel = ds.length ? 0 : -1; veGoiY();
    });
    $("mvSeek").addEventListener("keydown", e => {
      if (!ds.length) return;
      if (e.key === "ArrowDown") { sel = (sel + 1) % ds.length; veGoiY(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = (sel - 1 + ds.length) % ds.length; veGoiY(); e.preventDefault(); }
      else if (e.key === "Enter" && sel >= 0) { chonLK(ds[sel]); e.preventDefault(); }
      else if (e.key === "Escape") { ds = []; veGoiY(); }
    });
    $("mvSugg").onclick = e => { const d = e.target.closest("[data-i]"); if (d) chonLK(ds[+d.dataset.i]); };
    document.addEventListener("click", e => {
      if (!e.target.closest("#mvSugg") && !e.target.closest("#mvSeek")) { ds = []; veGoiY(); }
    });

    $("mvQty").addEventListener("keydown", e => { if (e.key === "Enter") $("mvAdd").click(); });
    $("mvNote").addEventListener("keydown", e => { if (e.key === "Enter") $("mvAdd").click(); });

    $("mvAdd").onclick = () => {
      if (!chon) return;
      const t = $("mvType").value, q = Math.round(Number($("mvQty").value) || 0);
      if (t !== "adj" && q <= 0) { A.flash("Số lượng phải lớn hơn 0", true); return; }
      if (t === "out" && (chon.qty || 0) < q &&
          !confirm("Tồn chỉ còn " + (chon.qty || 0) + ", vẫn xuất " + q + "?")) return;
      const mv = A.ghiPhieu(t, chon, q, $("mvNote").value.trim());
      A.flash(TEN[t] + " " + Math.abs(mv.qty) + " × " + chon.code + " · tồn còn " + chon.qty);
      $("mvSeek").value = ""; $("mvNote").value = ""; $("mvQty").value = 1;
      boChon(); ve(); A.veDanhMuc(); $("mvSeek").focus();
    };

    $("mvTb").onclick = e => {
      if (!e.target.classList.contains("del")) return;
      const id = e.target.closest("tr").dataset.id;
      if (!confirm("Huỷ phiếu này và trả tồn về như trước?")) return;
      A.huyPhieu(id); ve(); A.veDanhMuc(); A.flash("Đã huỷ phiếu");
    };
    ["mvFilter", "mvFType"].forEach(id => $(id).addEventListener("input", ve));
    $("mvExport").onclick = xuatSo;
    $("mvScan").onclick = () => A.moQuet(it => { A.show("moves"); chonLK(it); });
  }

  A.views.moves = { ve, onShow: ve, bind };

})(window.App);
