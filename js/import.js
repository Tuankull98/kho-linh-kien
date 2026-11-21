/* import.js — nhập dữ liệu từ file Excel/CSV bất kỳ bố cục nào.
   Tự đoán cột, cho sửa tay, lưu lại thành hồ sơ để lần sau nhận ra ngay. */
(function (A) {

  const $ = A.$;

  /* các ô của ứng dụng mà người dùng ghép cột file vào */
  const O = [
    { k: "sku",   ten: "Mã hàng",            goi: ["mahang","masp","sku","mavach","barcode","mahh"] },
    { k: "code",  ten: "Mã linh kiện",       goi: ["malinhkien","malk","mapt"] },
    { k: "name",  ten: "Tên linh kiện",      goi: ["tenhang","tenlinhkien","tensanpham","tenvattu","dienglai","noidung"], buoc: 1 },
    { k: "mach",  ten: "Nhóm máy",           goi: ["tenmay","nhommay","nhom","loaimay","danhmuc"] },
    { k: "unit",  ten: "Đơn vị tính",        goi: ["donvitinh","dvt","donvi"] },
    { k: "qty",   ten: "Số lượng / Tồn",     goi: ["toncuoiki","toncuoi","tonkho","soluong","slton","sl","ton","soluongton"] },
    { k: "price", ten: "Giá hiện tại",       goi: ["giahientai","giaban","giagoc","dongia","giale","giavon"] },
    { k: "given", ten: "Giá đề xuất giảm",   goi: ["giadexuatgiam","giadexuat","giagiam","giamoi","giakm"] },
    { k: "note",  ten: "Ghi chú",            goi: ["ghichu","dienglai","mota"] }
  ];

  let aoa = [], sheets = [], tenSheet = "", hRow = 0, cols = [], ketQua = null, hoSoDangDung = null;

  /* ---------- tiện ích ---------- */
  const chuCot = i => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - 1 - m) / 26; } return s; };
  const chuoiNhanDang = h => h.map(c => A.norm(c)).filter(Boolean).slice(0, 14).join("|");

  function laHeaderThua(row) {
    if (!cols.length) return false;
    const n = row.map(c => A.norm(c));
    let trung = 0;
    cols.forEach((c, i) => { if (c.sig && n[i] === c.sig) trung++; });
    return trung >= Math.max(2, Math.ceil(cols.filter(c => c.sig).length / 2));
  }

  /* đoán dòng tiêu đề: dòng có nhiều ô chữ nhất trong 15 dòng đầu */
  function doanDongTieuDe() {
    let best = 0, diem = -1;
    for (let i = 0; i < Math.min(15, aoa.length); i++) {
      const r = aoa[i] || [];
      const chu = r.filter(c => typeof c === "string" && c.trim() && isNaN(Number(c))).length;
      const khopGoi = r.filter(c => O.some(o => o.goi.includes(A.norm(c)))).length;
      const d = chu + khopGoi * 3;
      if (d > diem) { diem = d; best = i; }
    }
    return best;
  }

  /* đoán cột cho từng ô, không cho hai ô ăn chung một cột */
  function doanAnhXa() {
    const n = cols.map(c => c.sig);
    const dung = new Set(), map = {};
    O.forEach(o => {
      let i = n.findIndex((c, idx) => !dung.has(idx) && c && o.goi.includes(c));
      if (i < 0) i = n.findIndex((c, idx) => !dung.has(idx) && c && o.goi.some(g => c.includes(g) || g.includes(c)));
      if (i >= 0) { map[o.k] = i; dung.add(i); }
      else map[o.k] = -1;
    });
    /* nếu không thấy cột tên mà có cột nhiều chữ nhất thì lấy cột đó */
    if (map.name < 0) {
      let best = -1, dai = 0;
      cols.forEach((c, i) => { if (dung.has(i)) return;
        const d = c.mau.reduce((s, v) => s + String(v).length, 0) / (c.mau.length || 1);
        if (d > dai) { dai = d; best = i; } });
      if (dai > 12) { map.name = best; dung.add(best); }
    }
    return map;
  }

  /* ---------- vẽ ---------- */
  function veXemTruoc() {
    const sl = Math.min(aoa.length, 12);
    let h = "";
    for (let i = 0; i < sl; i++) {
      const r = aoa[i] || [];
      h += `<tr class="${i === hRow ? "hdr" : ""}"><td class="rn">${i + 1}</td>` +
        cols.map((c, j) => `<td>${A.esc(String(r[j] ?? ""))}</td>`).join("") + "</tr>";
    }
    $("imPrev").innerHTML = `<thead><tr><th class="nos"></th>` +
      cols.map((c, j) => `<th class="nos">${chuCot(j)}</th>`).join("") + "</tr></thead><tbody>" + h + "</tbody>";
  }

  function veAnhXa(map) {
    $("imMap").innerHTML = O.map(o => {
      const v = map[o.k] ?? -1;
      const opts = ['<option value="-1">— không dùng —</option>'].concat(
        cols.map((c, i) => `<option value="${i}"${i === v ? " selected" : ""}>${chuCot(i)}: ${A.esc(c.ten || "(trống)")}</option>`)
      ).join("");
      const mau = v >= 0 ? (cols[v].mau.find(x => x !== "" && x != null) ?? "") : "";
      return `<div class="m ${v >= 0 ? "set" : (o.buoc ? "need" : "")}" data-k="${o.k}">
        <b>${o.ten}${o.buoc ? " *" : ""}</b>
        <select data-k="${o.k}">${opts}</select>
        <small>${v >= 0 ? "ví dụ: " + A.esc(String(mau)) : (o.buoc ? "bắt buộc phải chọn" : "bỏ qua cũng được")}</small>
      </div>`;
    }).join("");
  }

  function layAnhXa() {
    const m = {};
    $("imMap").querySelectorAll("select[data-k]").forEach(s => m[s.dataset.k] = +s.value);
    return m;
  }

  function veHoSo() {
    const ds = A.state.settings.profiles || [];
    $("imProfWrap").hidden = !ds.length;
    $("imProf").innerHTML = '<option value="">— không dùng —</option>' +
      ds.map(p => `<option value="${p.id}"${hoSoDangDung === p.id ? " selected" : ""}>${A.esc(p.name)}</option>`).join("");
    $("imProfDel").hidden = !hoSoDangDung;
  }

  /* ---------- đọc file ---------- */
  function moFile(file) {
    if (typeof XLSX === "undefined") { A.flash("Chưa tải được thư viện đọc Excel", true); return; }
    const fr = new FileReader();
    fr.onload = () => {
      let wb;
      try { wb = XLSX.read(new Uint8Array(fr.result), { type: "array", cellDates: true }); }
      catch (e) { A.flash("Không mở được file này", true); return; }
      sheets = wb.SheetNames; window.__wb = wb;
      $("imSheet").innerHTML = sheets.map(s => `<option>${A.esc(s)}</option>`).join("");
      $("imSheetWrap").hidden = sheets.length < 2;
      $("imFileInfo").textContent = file.name + " · " + sheets.length + " trang tính";
      chonSheet(sheets[0]);
    };
    fr.readAsArrayBuffer(file);
  }

  function chonSheet(ten) {
    tenSheet = ten;
    aoa = XLSX.utils.sheet_to_json(window.__wb.Sheets[ten],
      { header: 1, blankrows: false, defval: "", raw: true });
    if (!aoa.length) { A.flash("Trang tính này trống", true); return; }
    hRow = doanDongTieuDe();
    $("imHead").innerHTML = aoa.slice(0, 15).map((r, i) =>
      `<option value="${i}"${i === hRow ? " selected" : ""}>Dòng ${i + 1}: ${
        A.esc(r.filter(Boolean).slice(0, 4).join(" | ").slice(0, 46))}</option>`).join("");
    $("imHeadWrap").hidden = false;
    $("imBody").hidden = false;
    dungCot();
  }

  function dungCot() {
    const h = aoa[hRow] || [];
    const rong = Math.max(h.length, ...aoa.slice(0, 40).map(r => r.length));
    cols = [];
    for (let i = 0; i < rong; i++) {
      cols.push({ ten: String(h[i] ?? "").trim(), sig: A.norm(h[i]),
        mau: aoa.slice(hRow + 1, hRow + 6).map(r => r[i]) });
    }
    veXemTruoc();
    const hs = tuNhanHoSo();
    if (hs) apHoSo(hs);
    else {
      hoSoDangDung = null; $("imProfName").value = ""; $("imProf").value = "";
      veAnhXa(doanAnhXa()); doanTuyChon(); doiDich();
    }
    veHoSo();
    $("imResWrap").hidden = true; $("imRun").disabled = true; ketQua = null;
    $("imCheck").innerHTML = "Bấm <b>Thử đọc</b> để xem máy hiểu file thế nào trước khi ghi vào dữ liệu thật.";
  }

  function doanTuyChon() {
    const m = layAnhXa();
    /* nếu cột tên chứa dạng "F12 - D811 - ..." mà chưa có cột mã riêng thì bật tách mã */
    let coMau = false;
    if (m.name >= 0) {
      const mau = aoa.slice(hRow + 1, hRow + 25).map(r => String(r[m.name] ?? ""));
      coMau = mau.filter(s => A.tachMa(s)).length >= Math.max(2, mau.filter(Boolean).length * 0.3);
    }
    $("imSplit").checked = coMau && m.code < 0;
    $("imGuess").checked = m.mach < 0;
  }

  /* ---------- hồ sơ ---------- */
  function tuNhanHoSo() {
    const sig = chuoiNhanDang(aoa[hRow] || []);
    return (A.state.settings.profiles || []).find(p => p.sig && p.sig === sig) || null;
  }
  function apHoSo(p) {
    hoSoDangDung = p.id;
    if (p.headerRow != null && p.headerRow < aoa.length && p.headerRow !== hRow) {
      hRow = p.headerRow; $("imHead").value = hRow;
      const h = aoa[hRow] || [];
      cols.forEach((c, i) => { c.ten = String(h[i] ?? "").trim(); c.sig = A.norm(h[i]); });
      veXemTruoc();
    }
    veAnhXa(p.map);
    $("imSplit").checked = !!p.split; $("imGuess").checked = !!p.guess;
    $("imSkipEmpty").checked = p.skipEmpty !== false;
    $("imTarget").value = p.target || "merge"; $("imDup").value = p.dup || "sum";
    $("imProfName").value = p.name;
    doiDich();
    A.flash("Đã nhận ra hồ sơ “" + p.name + "” và áp dụng sẵn");
  }
  function luuHoSo() {
    const ten = $("imProfName").value.trim();
    if (!ten) { A.flash("Đặt tên cho hồ sơ trước đã", true); return; }
    if (!aoa.length) return;
    const s = A.state.settings;
    s.profiles = s.profiles || [];
    const p = {
      id: hoSoDangDung || A.uid(), name: ten, sig: chuoiNhanDang(aoa[hRow] || []),
      headerRow: hRow, map: layAnhXa(), split: $("imSplit").checked, guess: $("imGuess").checked,
      skipEmpty: $("imSkipEmpty").checked, target: $("imTarget").value, dup: $("imDup").value
    };
    const i = s.profiles.findIndex(x => x.id === p.id);
    if (i >= 0) s.profiles[i] = p; else s.profiles.push(p);
    hoSoDangDung = p.id;
    A.save(); veHoSo();
    A.flash("Đã lưu hồ sơ “" + ten + "” — lần sau mở file cùng kiểu sẽ tự áp dụng");
  }
  function xoaHoSo() {
    const s = A.state.settings;
    s.profiles = (s.profiles || []).filter(p => p.id !== hoSoDangDung);
    hoSoDangDung = null; A.save(); veHoSo(); A.flash("Đã xoá hồ sơ");
  }

  /* ---------- đọc dữ liệu theo ánh xạ ---------- */
  function docTheoAnhXa() {
    const m = layAnhXa(), tach = $("imSplit").checked, doan = $("imGuess").checked,
          boTrong = $("imSkipEmpty").checked;
    const lay = (r, k) => m[k] >= 0 ? r[m[k]] : "";
    const out = [], rep = { tong: 0, boQua: 0, tachDuoc: 0, thieuGia: 0, thieuSL: 0, trung: 0 };

    for (let i = hRow + 1; i < aoa.length; i++) {
      const r = aoa[i];
      if (!r || !r.length) { rep.boQua++; continue; }
      if (laHeaderThua(r)) { rep.boQua++; continue; }

      let name = String(lay(r, "name") ?? "").trim();
      let code = String(lay(r, "code") ?? "").trim();
      const sku = String(lay(r, "sku") ?? "").trim();

      if (tach && !code) {
        const t = A.tachMa(name);
        if (t) { code = t.code; name = t.name; rep.tachDuoc++; }
      }
      if (boTrong && !name && !code && !sku) { rep.boQua++; continue; }
      if (!code) code = sku || name.slice(0, 20) || "—";

      const price = A.num(lay(r, "price")), qty = A.num(lay(r, "qty"));
      if (price == null) rep.thieuGia++;
      if (qty == null) rep.thieuSL++;
      const given = A.num(lay(r, "given"));

      out.push(A.mkItem({
        sku, code, name,
        mach: String(lay(r, "mach") ?? "").trim() || (doan ? A.doanNhom(name) : "Chưa phân nhóm"),
        unit: String(lay(r, "unit") ?? "").trim(),
        qty, price, given, manual: given != null
      }));
      out[out.length - 1].note = String(lay(r, "note") ?? "").trim();
      rep.tong++;
    }
    const thay = new Set();
    out.forEach(r => { const k = A.key(r); if (thay.has(k)) rep.trung++; else thay.add(k); });
    return { rows: out, rep };
  }

  const laPhieu = () => ["in", "out"].includes($("imTarget").value);

  function thuDoc() {
    if (!aoa.length) return;
    const m = layAnhXa();
    if (m.name < 0 && m.code < 0 && m.sku < 0) {
      $("imCheck").innerHTML = '<b class="bad">Chưa ghép được cột nào để nhận ra linh kiện.</b> Ít nhất phải chọn cột Tên linh kiện hoặc Mã hàng.';
      $("imRun").disabled = true; return;
    }
    const kq = docTheoAnhXa();
    let rows = kq.rows;
    if (!laPhieu()) rows = A.gopTrung(rows.map(r => Object.assign({}, r)), $("imDup").value);

    /* đối chiếu với danh mục hiện có */
    let khop = 0, moi = 0;
    rows.forEach(r => { if (A.state.items.find(x => A.key(x) === A.key(r))) khop++; else moi++; });
    ketQua = { rows, rep: kq.rep, khop, moi };

    const t = $("imTarget").value;
    let h = `Đọc được <b>${kq.rep.tong}</b> dòng`;
    if (!laPhieu() && kq.rep.trung) h += `, trùng <b>${kq.rep.trung}</b> dòng → còn <b>${rows.length}</b> sau khi gộp`;
    h += `.<br>• Khớp với danh mục đang có: <b>${khop}</b> · chưa có trong danh mục: <b class="${moi && t !== "replace" && t !== "merge" ? "bad" : ""}">${moi}</b>`;
    if (kq.rep.tachDuoc) h += `<br>• Tách được mã từ tên hàng: <b>${kq.rep.tachDuoc}</b> dòng`;
    h += `<br>• Thiếu giá: <b>${kq.rep.thieuGia}</b> · thiếu số lượng: <b>${kq.rep.thieuSL}</b> · bỏ qua: <b>${kq.rep.boQua}</b>`;
    if (laPhieu() && moi) h += `<br><b class="bad">${moi} dòng không tìm thấy trong danh mục sẽ bị bỏ qua khi ghi phiếu.</b>`;
    if (t === "replace") h += `<br><b class="bad">Danh mục hiện có ${A.state.items.length} dòng sẽ bị thay sạch.</b>`;
    $("imCheck").innerHTML = h;

    $("imRes").innerHTML = "<thead><tr><th>Mã hàng</th><th>Mã linh kiện</th><th>Tên</th>" +
      "<th class='num'>SL</th><th class='num'>Giá</th><th class='num'>Giá giảm</th><th>Nhóm máy</th><th>Có sẵn?</th></tr></thead><tbody>" +
      rows.slice(0, 60).map(r => `<tr>
        <td>${A.esc(r.sku)}</td><td class="code">${A.esc(r.code)}</td>
        <td class="desc">${A.esc(r.name)}</td>
        <td class="num">${r.qty ?? "—"}</td><td class="num">${A.fm(r.price)}</td>
        <td class="num">${A.fm(r.given)}</td><td style="font-size:12px">${A.esc(r.mach)}</td>
        <td>${A.state.items.find(x => A.key(x) === A.key(r))
          ? '<span class="tag t-old">có</span>' : '<span class="tag t-new">mới</span>'}</td></tr>`).join("") +
      "</tbody>";
    $("imResWrap").hidden = false;
    $("imRun").disabled = false;
    A.flash("Đã thử đọc " + rows.length + " dòng — xem kỹ rồi bấm Nhập vào dữ liệu");
  }

  function chayNhap() {
    if (!ketQua) return;
    const t = $("imTarget").value, rows = ketQua.rows;
    let up = 0, ad = 0, bo = 0;

    if (t === "replace") {
      A.state.items = rows; ad = rows.length;
    } else if (t === "merge") {
      rows.forEach(o => {
        const ex = A.state.items.find(r => A.key(r) === A.key(o));
        if (ex) { if (o.qty != null) ex.qty = o.qty; if (o.price != null) ex.price = o.price;
                  if (!ex.manual && o.given != null) { ex.given = o.given; ex.manual = true; }
                  if (o.name) ex.name = o.name; if (o.unit) ex.unit = o.unit; up++; }
        else { A.state.items.push(o); ad++; }
      });
    } else if (t === "price" || t === "qty") {
      rows.forEach(o => {
        const ex = A.state.items.find(r => A.key(r) === A.key(o));
        if (!ex) { bo++; return; }
        if (t === "price") { if (o.price != null) { ex.price = o.price; up++; } else bo++;
                             if (o.given != null) { ex.given = o.given; ex.manual = true; } }
        else { if (o.qty != null) { ex.qty = o.qty; up++; } else bo++; }
      });
    } else {
      const ghi = $("imRef").value.trim() || (t === "in" ? "Nhập từ file Excel" : "Xuất từ file Excel");
      rows.forEach(o => {
        const ex = A.state.items.find(r => A.key(r) === A.key(o));
        if (!ex || !o.qty) { bo++; return; }
        A.ghiPhieu(t, ex, o.qty, ghi); up++;
      });
    }

    A.save(true); A.veTatCa();
    const ten = { replace: "thay danh mục", merge: "cập nhật danh mục", price: "cập nhật giá",
                  qty: "cập nhật tồn", in: "ghi phiếu nhập", out: "ghi phiếu xuất" }[t];
    A.flash(`Xong ${ten}: sửa ${up} dòng, thêm ${ad} dòng${bo ? ", bỏ qua " + bo + " dòng" : ""}`);
    $("imCheck").innerHTML = `<b class="good">Đã nhập xong.</b> Sửa <b>${up}</b> dòng, thêm mới <b>${ad}</b> dòng`
      + (bo ? `, bỏ qua <b>${bo}</b> dòng không khớp danh mục` : "") + ".";
    $("imRun").disabled = true;
    A.show(laPhieu() ? "moves" : "catalog");
  }

  function doiDich() {
    const p = laPhieu();
    $("imRefWrap").hidden = !p;
    $("imDupWrap").hidden = p;
  }

  /* ---------- gắn sự kiện ---------- */
  function bind() {
    $("imFile").onchange = e => { const f = e.target.files[0]; if (f) { hoSoDangDung = null; moFile(f); } e.target.value = ""; };
    $("imSheet").onchange = () => chonSheet($("imSheet").value);
    $("imHead").onchange = () => { hRow = +$("imHead").value; dungCot(); };
    $("imMap").addEventListener("change", e => {
      if (!e.target.matches("select[data-k]")) return;
      veAnhXa(layAnhXa());
      $("imRun").disabled = true; $("imResWrap").hidden = true;
    });
    ["imSplit","imGuess","imSkipEmpty","imDup"].forEach(id =>
      $(id).addEventListener("change", () => { $("imRun").disabled = true; $("imResWrap").hidden = true; }));
    $("imTarget").onchange = () => { doiDich(); $("imRun").disabled = true; $("imResWrap").hidden = true; };
    $("imTest").onclick = thuDoc;
    $("imRun").onclick = chayNhap;
    $("imProfSave").onclick = luuHoSo;
    $("imProfDel").onclick = xoaHoSo;
    $("imProf").onchange = () => {
      const p = (A.state.settings.profiles || []).find(x => x.id === $("imProf").value);
      if (p) apHoSo(p); else { hoSoDangDung = null; veHoSo(); }
    };
  }

  A.views.import = { ve: veHoSo, onShow: veHoSo, bind };

})(window.App);
