/* excel.js — bộ công cụ Excel dùng chung: so sánh, gộp, tách, dò lỗi */
(function (A) {

  const $ = A.$;
  const doc = (f) => new Promise(res => A.docFileExcel(f, (rows, rep, raw) => res({ rows, rep, raw })));
  const tenNgan = s => s.length > 28 ? s.slice(0, 26) + "…" : s;

  /* ================= 1. SO SÁNH HAI FILE ================= */
  let cmpA = null, cmpB = null, cmpKQ = null;

  function sanSangSo() { $("cmpRun").disabled = !(cmpA && cmpB); }

  function soSanh() {
    const a = new Map(), b = new Map();
    cmpA.rows.forEach(r => a.set(A.key(r), r));
    cmpB.rows.forEach(r => b.set(A.key(r), r));

    const d = { moi: [], mat: [], tang: [], giam: [], doiGia: [], yen: 0 };
    b.forEach((r, k) => {
      const o = a.get(k);
      if (!o) { d.moi.push(r); return; }
      const dq = (r.qty || 0) - (o.qty || 0);
      const dp = (r.price || 0) - (o.price || 0);
      if (dq > 0) d.tang.push({ r, o, d: dq });
      else if (dq < 0) d.giam.push({ r, o, d: dq });
      if (dp !== 0 && o.price && r.price) d.doiGia.push({ r, o, d: dp });
      if (!dq && !dp) d.yen++;
    });
    a.forEach((r, k) => { if (!b.has(k)) d.mat.push(r); });
    cmpKQ = d;

    $("cmpRep").hidden = false;
    $("cmpRep").innerHTML =
      `File cũ <b>${cmpA.rows.length}</b> dòng · file mới <b>${cmpB.rows.length}</b> dòng<br>
       • Mã mới xuất hiện: <b>${d.moi.length}</b> · mã biến mất: <b class="bad">${d.mat.length}</b><br>
       • Tồn tăng: <b class="good">${d.tang.length}</b> · tồn giảm: <b class="bad">${d.giam.length}</b>
         · giá thay đổi: <b>${d.doiGia.length}</b> · không đổi gì: <b>${d.yen}</b>`;

    const hang = [];
    d.moi.forEach(r => hang.push(["Mã mới", r.code, r.name, "", r.qty ?? "", "", r.price ?? "", ""]));
    d.mat.forEach(r => hang.push(["Mã biến mất", r.code, r.name, r.qty ?? "", "", r.price ?? "", "", ""]));
    d.tang.concat(d.giam).forEach(x => hang.push([x.d > 0 ? "Tồn tăng" : "Tồn giảm", x.r.code, x.r.name,
      x.o.qty ?? "", x.r.qty ?? "", x.o.price ?? "", x.r.price ?? "", x.d]));
    d.doiGia.forEach(x => hang.push(["Giá đổi", x.r.code, x.r.name,
      x.o.qty ?? "", x.r.qty ?? "", x.o.price ?? "", x.r.price ?? "", x.d]));
    cmpKQ.hang = hang;

    $("cmpWrap").hidden = false; $("cmpExp").hidden = false;
    $("cmpTb").innerHTML = "<thead><tr><th>Việc gì</th><th>Mã</th><th class='desc'>Tên</th>" +
      "<th class='num'>Tồn cũ</th><th class='num'>Tồn mới</th><th class='num'>Giá cũ</th>" +
      "<th class='num'>Giá mới</th><th class='num'>Lệch</th></tr></thead><tbody>" +
      hang.slice(0, 200).map(h => {
        const cl = h[0] === "Tồn tăng" ? "t-in" : h[0] === "Tồn giảm" || h[0] === "Mã biến mất" ? "t-out"
                 : h[0] === "Mã mới" ? "t-new" : "t-adj";
        return `<tr><td><span class="tag ${cl}">${h[0]}</span></td><td class="code">${A.esc(h[1])}</td>
          <td class="desc">${A.esc(tenNgan(h[2]))}</td><td class="num">${A.fm(h[3])}</td>
          <td class="num">${A.fm(h[4])}</td><td class="num">${A.fm(h[5])}</td>
          <td class="num">${A.fm(h[6])}</td><td class="num" style="font-weight:700">${h[7] === "" ? "—" : A.fm(h[7])}</td></tr>`;
      }).join("") + "</tbody>";
    A.flash("So xong: " + hang.length + " dòng khác nhau");
  }

  function xuatSoSanh() {
    if (!cmpKQ) return;
    A.taiXlsx([{ name: "Chênh lệch", rows: cmpKQ.hang,
      head: ["Việc gì", "Mã linh kiện", "Tên", "Tồn cũ", "Tồn mới", "Giá cũ", "Giá mới", "Lệch"],
      cols: [14, 14, 50, 10, 10, 14, 14, 10],
      hi: r => r[0] === "Tồn tăng" ? "xanh" : (r[0] === "Mã biến mất" || r[0] === "Tồn giảm" ? "do" : "vang") }],
      "So-sanh-" + A.hnay() + ".xlsx", "Đã xuất bảng chênh lệch");
  }

  /* ================= 2. GỘP NHIỀU FILE ================= */
  let mgKQ = null;

  async function gop(files) {
    const mode = $("mgMode").value, m = new Map(), out = [];
    let tongDong = 0;
    const nguon = [];
    for (const f of files) {
      const { rows } = await doc(f);
      tongDong += rows.length;
      nguon.push(f.name + " (" + rows.length + " dòng)");
      rows.forEach(r => {
        r.nguon = f.name;
        const k = A.key(r), ex = m.get(k);
        if (!ex || mode === "keep") { if (!ex) m.set(k, r); out.push(r); return; }
        if (mode === "sum") { if (r.qty != null) ex.qty = (ex.qty || 0) + r.qty;
                              if (ex.price == null) ex.price = r.price;
                              ex.nguon += ", " + f.name; }
        else if (mode === "last") { Object.assign(ex, r, { id: ex.id, nguon: ex.nguon + ", " + f.name }); }
      });
    }
    mgKQ = out;
    $("mgRep").hidden = false;
    $("mgRep").innerHTML = `Đã đọc <b>${files.length}</b> file, tổng <b>${tongDong}</b> dòng → còn <b>${out.length}</b> dòng sau khi gộp.<br>`
      + nguon.map(n => "• " + A.esc(n)).join("<br>");
    $("mgExp").hidden = false; $("mgToCat").hidden = false;
    A.flash("Gộp xong " + out.length + " dòng");
  }

  function xuatGop() {
    if (!mgKQ) return;
    A.taiXlsx([{ name: "Đã gộp",
      head: ["Mã hàng", "Nhóm máy", "Mã linh kiện", "Tên linh kiện", "ĐVT", "SL tồn", "Giá hiện tại", "Từ file"],
      rows: mgKQ.map(r => [r.sku, r.mach, r.code, r.name, r.unit, r.qty ?? "", r.price ?? "", r.nguon || ""]),
      cols: [12, 24, 14, 50, 7, 9, 14, 30], total: [5] }],
      "Gop-file-" + A.hnay() + ".xlsx", "Đã tải file gộp " + mgKQ.length + " dòng");
  }

  /* ================= 3. TÁCH THEO NHÓM ================= */
  async function tach() {
    let rows = A.state.items;
    if ($("spSrc").value === "file") {
      const f = $("spFile").files[0];
      if (!f) { A.flash("Chọn file đã", true); return; }
      rows = (await doc(f)).rows;
    }
    if (!rows.length) { A.flash("Không có dữ liệu để tách", true); return; }

    const theo = $("spBy").value;
    const nhom = new Map();
    rows.forEach(r => { const k = theo === "mach" ? (r.mach || "Chưa phân nhóm") : A.grp(r);
      (nhom.get(k) || nhom.set(k, []).get(k)).push(r); });

    const sheets = [...nhom.entries()].sort((a, b) => b[1].length - a[1].length).map(([ten, ds]) => ({
      name: ten.replace(/[\\\/\?\*\[\]:]/g, "-"),
      head: ["Mã hàng", "Mã linh kiện", "Tên linh kiện", "ĐVT", "SL tồn", "Giá hiện tại", "Giá đề xuất giảm"],
      rows: ds.map(r => [r.sku, r.code, r.name, r.unit, r.qty ?? "", r.price ?? "", A.giaGiam(r).v ?? ""]),
      cols: [12, 14, 52, 7, 9, 14, 16], total: [4, 5, 6],
      hi: r => !r[5] ? "do" : null
    }));
    $("spRep").hidden = false;
    $("spRep").innerHTML = `Tách <b>${rows.length}</b> dòng thành <b>${sheets.length}</b> sheet:<br>`
      + sheets.map(s => `• ${A.esc(s.name)}: ${s.rows.length} dòng`).join("<br>");
    A.taiXlsx(sheets, "Tach-theo-" + (theo === "mach" ? "nhom-may" : "ma-F") + "-" + A.hnay() + ".xlsx",
      "Đã tách thành " + sheets.length + " sheet");
  }

  /* ================= 4. DÒ LỖI ================= */
  let lnKQ = null;

  /* chữ ký tên: các từ có nghĩa, sắp xếp lại — để bắt hai tên gần giống nhau */
  function chuKyTen(s) {
    const bo = new Set(["robot","may","cho","dung","hut","bui","cua","va","bo","cum","loai"]);
    return A.norm(s).length < 6 ? "" :
      (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
      .split(/[^a-z0-9]+/).filter(w => w.length > 2 && !bo.has(w)).sort().join(" ");
  }

  async function doLoi() {
    let rows = A.state.items, raw = null;
    if ($("lnSrc").value === "file") {
      const f = $("lnFile").files[0];
      if (!f) { A.flash("Chọn file đã", true); return; }
      const kq = await doc(f); rows = kq.rows; raw = kq.raw;
    }
    if (!rows.length) { A.flash("Không có dữ liệu để dò", true); return; }

    const loi = [];
    const them = (muc, ma, ten, mota) => loi.push([muc, ma, ten, mota]);

    /* mã hàng trùng */
    const theoKhoa = new Map();
    rows.forEach(r => { const k = A.key(r); (theoKhoa.get(k) || theoKhoa.set(k, []).get(k)).push(r); });
    theoKhoa.forEach(ds => { if (ds.length > 1)
      them("Mã trùng", ds[0].sku || ds[0].code, ds[0].name,
        ds.length + " dòng cùng mã, tồn: " + ds.map(r => r.qty ?? "?").join(" / ")); });

    /* mã linh kiện trùng nhưng mã hàng khác nhau */
    const theoCode = new Map();
    rows.forEach(r => { const c = A.norm(r.code); if (!c || c === "—") return;
      (theoCode.get(c) || theoCode.set(c, []).get(c)).push(r); });
    theoCode.forEach(ds => {
      const sku = new Set(ds.map(r => A.norm(r.sku)).filter(Boolean));
      if (ds.length > 1 && sku.size > 1)
        them("Một mã linh kiện, nhiều mã hàng", ds[0].code, ds[0].name,
          "mã hàng: " + [...new Set(ds.map(r => r.sku).filter(Boolean))].join(", "));
    });

    /* tên gần giống nhau mà mã khác nhau */
    const theoTen = new Map();
    rows.forEach(r => { const s = chuKyTen(r.name); if (!s) return;
      (theoTen.get(s) || theoTen.set(s, []).get(s)).push(r); });
    theoTen.forEach(ds => {
      const ma = [...new Set(ds.map(r => A.norm(r.code)))];
      if (ds.length > 1 && ma.length > 1)
        them("Tên gần giống nhau", ds.map(r => r.code).join(" ↔ "), ds[0].name,
          "có thể là cùng một món nhập hai lần khác tên");
    });

    /* thiếu giá, thiếu tồn, giá bằng 0 */
    rows.forEach(r => {
      if (!r.price) them("Thiếu giá", r.code, r.name, "chưa có giá hiện tại");
      if (r.qty == null) them("Thiếu tồn", r.code, r.name, "chưa có số lượng");
      if (r.qty != null && r.qty < 0) them("Tồn âm", r.code, r.name, "tồn = " + r.qty);
      if (r.given != null && r.price && r.given >= r.price)
        them("Giá giảm không hợp lý", r.code, r.name,
          "giá đề xuất " + A.fm(r.given) + " ≥ giá hiện tại " + A.fm(r.price));
    });

    /* giá bất thường so với mặt bằng cùng nhóm F */
    const theoF = new Map();
    rows.forEach(r => { if (!r.price) return; const g = A.grp(r);
      (theoF.get(g) || theoF.set(g, []).get(g)).push(r); });
    theoF.forEach((ds, g) => {
      if (ds.length < 5) return;
      const gia = ds.map(r => r.price).sort((a, b) => a - b);
      const tv = gia[Math.floor(gia.length / 2)];
      ds.forEach(r => {
        if (r.price > tv * 6) them("Giá cao bất thường", r.code, r.name,
          A.fm(r.price) + " trong khi nhóm " + g + " phổ biến quanh " + A.fm(tv));
        if (r.price * 6 < tv) them("Giá thấp bất thường", r.code, r.name,
          A.fm(r.price) + " trong khi nhóm " + g + " phổ biến quanh " + A.fm(tv));
      });
    });

    /* ô đáng lẽ là số nhưng trong file lại là chữ */
    if (raw) {
      const { aoa, hRow, C } = raw;
      [["qty", "Số lượng"], ["price", "Giá hiện tại"], ["given", "Giá đề xuất"]].forEach(([k, ten]) => {
        if (C[k] < 0) return;
        for (let i = hRow + 1; i < aoa.length; i++) {
          const v = aoa[i] && aoa[i][C[k]];
          if (v === "" || v == null || typeof v === "number") continue;
          if (A.num(v) == null && String(v).trim())
            them("Ô số lại là chữ", "dòng " + (i + 1), String(aoa[i][C.name] ?? "").slice(0, 50),
              ten + ' = "' + String(v).slice(0, 24) + '"');
        }
      });
    }

    lnKQ = loi;
    const dem = {};
    loi.forEach(l => dem[l[0]] = (dem[l[0]] || 0) + 1);
    $("lnRep").hidden = false;
    $("lnRep").innerHTML = loi.length
      ? `Soi <b>${rows.length}</b> dòng, thấy <b class="bad">${loi.length}</b> điểm cần xem lại:<br>`
        + Object.entries(dem).sort((a, b) => b[1] - a[1]).map(([k, v]) => `• ${k}: <b>${v}</b>`).join("<br>")
      : `Soi <b>${rows.length}</b> dòng, <b class="good">không thấy lỗi nào</b>.`;

    $("lnWrap").hidden = !loi.length; $("lnExp").hidden = !loi.length;
    $("lnTb").innerHTML = "<thead><tr><th>Loại</th><th>Mã</th><th class='desc'>Tên</th><th>Chi tiết</th></tr></thead><tbody>"
      + loi.slice(0, 300).map(l => `<tr><td><span class="tag t-no">${A.esc(l[0])}</span></td>
          <td class="code">${A.esc(l[1])}</td><td class="desc">${A.esc(tenNgan(l[2]))}</td>
          <td style="font-size:12.5px;color:var(--muted)">${A.esc(l[3])}</td></tr>`).join("") + "</tbody>";
    A.flash(loi.length ? "Thấy " + loi.length + " điểm cần xem lại" : "Không thấy lỗi nào");
  }

  function xuatLoi() {
    if (!lnKQ) return;
    A.taiXlsx([{ name: "Lỗi dữ liệu", rows: lnKQ,
      head: ["Loại lỗi", "Mã", "Tên", "Chi tiết"], cols: [26, 18, 50, 50] }],
      "Loi-du-lieu-" + A.hnay() + ".xlsx", "Đã xuất " + lnKQ.length + " điểm cần xem lại");
  }

  /* ================= gắn sự kiện ================= */
  function bind() {
    $("cmpA").onchange = async e => { const f = e.target.files[0]; if (!f) return;
      $("cmpAL").textContent = "📂 " + tenNgan(f.name);
      cmpA = await doc(f); sanSangSo(); A.flash("File cũ: " + cmpA.rows.length + " dòng"); };
    $("cmpB").onchange = async e => { const f = e.target.files[0]; if (!f) return;
      $("cmpBL").textContent = "📂 " + tenNgan(f.name);
      cmpB = await doc(f); sanSangSo(); A.flash("File mới: " + cmpB.rows.length + " dòng"); };
    $("cmpRun").onclick = soSanh;
    $("cmpExp").onclick = xuatSoSanh;

    $("mgFiles").onchange = e => { const fs = [...e.target.files]; if (!fs.length) return;
      $("mgL").textContent = "📂 " + fs.length + " file đã chọn"; $("mgRun").disabled = false;
      $("mgRun").onclick = () => gop(fs); };
    $("mgExp").onclick = xuatGop;
    $("mgToCat").onclick = () => {
      if (!mgKQ) return;
      if (!confirm("Thay toàn bộ danh mục bằng " + mgKQ.length + " dòng vừa gộp?")) return;
      A.state.items = mgKQ.map(r => A.mkItem(r)); A.save(true); A.veTatCa(); A.show("catalog");
      A.flash("Đã đưa " + A.state.items.length + " dòng vào danh mục");
    };

    $("spSrc").onchange = () => { $("spFileWrap").hidden = $("spSrc").value !== "file"; };
    $("spFile").onchange = e => { if (e.target.files[0]) $("spL").textContent = "📂 " + tenNgan(e.target.files[0].name); };
    $("spRun").onclick = tach;

    $("lnSrc").onchange = () => { $("lnFileWrap").hidden = $("lnSrc").value !== "file"; };
    $("lnFile").onchange = e => { if (e.target.files[0]) $("lnL").textContent = "📂 " + tenNgan(e.target.files[0].name); };
    $("lnRun").onclick = doLoi;
    $("lnExp").onclick = xuatLoi;
  }

  A.views.excel = { bind };

})(window.App);
