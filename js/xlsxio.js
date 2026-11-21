/* xlsxio.js — đọc file Excel đủ kiểu và xuất file Excel ra máy */
(function (A) {

  A.HEAD = ["Mã hàng","Tên máy","Mã linh kiện","Tên linh kiện","ĐVT","SL tồn",
            "Giá hiện tại","Giá đề xuất giảm","Tỷ lệ giảm (%)","Cập nhật"];

  /* ---------- nhận dạng dòng tiêu đề và ánh xạ cột ---------- */
  const HDR = ["mahang","tenhang","tenlinhkien","malinhkien","toncuoiki","soluong",
               "giahientai","giaban","tenmay","donvitinh"];
  const laHeader = row => row.map(c => A.norm(c)).filter(c => HDR.includes(c)).length >= 2;

  function mapCot(h) {
    const n = h.map(c => A.norm(c));
    const gde = n.findIndex(c => c.includes("giade") || c.includes("giagiam") || c.includes("giadexuat"));
    let gia = n.findIndex(c => c.includes("giahientai") || c.includes("giaban") || c.includes("giagoc"));
    if (gia < 0) gia = n.findIndex((c, i) => c.startsWith("gia") && i !== gde
      && !c.includes("giam") && !c.includes("de"));
    return {
      sku:  n.findIndex(c => c.includes("mahang") || c.includes("masp") || c === "sku"),
      mach: n.findIndex(c => c.includes("tenmay") || c.includes("nhommay")),
      code: n.findIndex(c => c.includes("malinhkien")),
      name: n.findIndex(c => c.includes("tenhang") || c.includes("tenlinhkien") || c.includes("tensanpham")),
      unit: n.findIndex(c => c.includes("donvitinh") || c === "dvt"),
      qty:  n.findIndex(c => c.includes("ton") || c.includes("soluong") || c === "sl"),
      price: gia, given: gde
    };
  }

  /* tách "F14 - D610 - Bánh xe nhỏ" hoặc "F13 - D410 Quạt sấy" thành mã + tên */
  const P1 = /^\s*([Ff]\s*\d{1,2})\s*[-–]\s*([A-Za-z0-9]{2,6})\s*[-–]\s*(.+)$/;
  const P2 = /^\s*([Ff]\s*\d{1,2})\s*[-–]\s*([A-Za-z0-9]{2,6})\s+(.+)$/;
  function tachMa(s) {
    const m = P1.exec(s) || P2.exec(s);
    if (!m) return null;
    return { code: m[1].replace(/\s/g, "").toUpperCase() + " - " + m[2].toUpperCase(), name: m[3].trim() };
  }
  A.tachMa = tachMa;

  /* ---------- đọc file ---------- */
  A.docFileExcel = function (file, xong) {
    if (typeof XLSX === "undefined") {
      A.flash("Chưa tải được thư viện đọc Excel — kiểm tra mạng rồi mở lại trang", true); return;
    }
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const wb = XLSX.read(new Uint8Array(fr.result), { type: "array" });
        const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],
          { header: 1, blankrows: false, defval: "" });
        let hi = aoa.findIndex(laHeader); if (hi < 0) hi = 0;
        const C = mapCot(aoa[hi] || []);
        const out = [], rep = { tong: 0, coMa: 0, khongMa: 0, thieuGia: 0, boQua: 0,
                                khoi: aoa.filter(laHeader).length || 1, trung: 0 };

        for (let i = hi + 1; i < aoa.length; i++) {
          const r = aoa[i];
          if (!r || laHeader(r)) { rep.boQua++; continue; }
          const dau = A.norm(r.find(c => c !== "" && c != null));
          if (dau === "tongcong" || dau === "tong" || dau === "total" || dau === "congdon") {
            rep.boQua++; continue;
          }
          const raw = (C.name >= 0 ? r[C.name] : "").toString().trim();
          const sku = (C.sku  >= 0 ? r[C.sku]  : "").toString().trim();
          if (!raw && !sku) { rep.boQua++; continue; }

          let code = (C.code >= 0 ? r[C.code] : "").toString().trim(), name = raw;
          if (!code) {
            const t = tachMa(raw);
            if (t) { code = t.code; name = t.name; rep.coMa++; }
            else { code = sku || "—"; rep.khongMa++; }
          } else rep.coMa++;

          const price = C.price >= 0 ? A.num(r[C.price]) : null;
          if (!price) rep.thieuGia++;
          const given = C.given >= 0 ? A.num(r[C.given]) : null;

          out.push(A.mkItem({
            sku, mach: (C.mach >= 0 ? r[C.mach] : "") || A.doanNhom(raw), code, name,
            unit: C.unit >= 0 ? r[C.unit] : "",
            qty: C.qty >= 0 ? A.num(r[C.qty]) : null,
            price, given, manual: given != null
          }));
          rep.tong++;
        }
        const thay = new Set();
        out.forEach(r => { const k = A.key(r); if (thay.has(k)) rep.trung++; else thay.add(k); });
        xong(out, rep, { aoa, hRow: hi, C });
      } catch (err) {
        A.flash("Không đọc được file này — hãy lưu lại dạng .xlsx rồi thử lại", true);
      }
    };
    fr.readAsArrayBuffer(file);
  };

  /* gộp các dòng trùng mã hàng: cộng dồn SL / giữ dòng đầu / giữ nguyên */
  A.gopTrung = function (rows, cach) {
    if (cach === "keep") return rows;
    const m = new Map(), out = [];
    rows.forEach(r => {
      const k = A.key(r), ex = m.get(k);
      if (!ex) { m.set(k, r); out.push(r); return; }
      if (cach === "sum") {
        if (r.qty != null) ex.qty = (ex.qty || 0) + r.qty;
        if (ex.price == null) ex.price = r.price;
        if (ex.given == null) { ex.given = r.given; ex.manual = r.manual; }
      }
    });
    return out;
  };

  /* ---------- xuất file ---------- */
  let DL = null;
  try { if (typeof claude !== "undefined" && claude && typeof claude.use === "function")
    claude.use("downloads").then(d => { DL = d; }).catch(() => {}); } catch (e) {}

  function anchorSave(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  /* bản đơn giản, dùng khi thư viện định dạng chưa tải được */
  function blobTron(sheets) {
    const wb = XLSX.utils.book_new();
    sheets.forEach(s => {
      const ws = XLSX.utils.aoa_to_sheet([s.head].concat(s.rows));
      if (s.cols) ws["!cols"] = s.cols.map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
    });
    return new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: MIME });
  }

  const MAU = { do: "FFFEF3F2", vang: "FFFFF8E6", xanh: "FFECFDF3" };

  /* bản có định dạng: đóng băng tiêu đề, bộ lọc, tiền tệ, tô màu, dòng tổng */
  async function blobDep(sheets) {
    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    sheets.forEach(s => {
      const ws = wb.addWorksheet(s.name.slice(0, 31), {
        views: [{ state: "frozen", ySplit: 1 }]
      });
      ws.addRow(s.head);
      s.rows.forEach(r => ws.addRow(r));

      /* cột nào là số thì định dạng có dấu phẩy */
      const soCot = s.head.length;
      const laSo = [];
      for (let c = 0; c < soCot; c++) {
        const mau = s.rows.slice(0, 80).map(r => r[c]).filter(v => v !== "" && v != null);
        laSo[c] = mau.length > 0 && mau.every(v => typeof v === "number");
      }

      const hd = ws.getRow(1);
      hd.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      hd.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
      hd.alignment = { vertical: "middle", wrapText: true };
      hd.height = 26;

      for (let c = 1; c <= soCot; c++) {
        const col = ws.getColumn(c);
        col.width = (s.cols && s.cols[c - 1]) || Math.max(10, String(s.head[c - 1] || "").length + 4);
        if (laSo[c - 1]) {
          const ten = A.norm(s.head[c - 1]);
          col.numFmt = ten.includes("gia") || ten.includes("tien") || ten.includes("giatri")
            ? "#,##0" : (ten.includes("tyle") || ten.includes("phantram") ? "0.0" : "#,##0");
          col.alignment = { horizontal: "right" };
        }
      }

      /* tô màu theo quy tắc của từng bảng */
      if (s.hi) s.rows.forEach((r, i) => {
        const m = s.hi(r, i); if (!m || !MAU[m]) return;
        ws.getRow(i + 2).eachCell({ includeEmpty: true }, c =>
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MAU[m] } });
      });

      /* viền nhạt cho toàn bảng */
      const vien = { style: "thin", color: { argb: "FFE3E6EA" } };
      ws.eachRow({ includeEmpty: false }, r => r.eachCell({ includeEmpty: true }, c => {
        c.border = { top: vien, left: vien, bottom: vien, right: vien }; }));

      /* dòng tổng cho các cột được chỉ định */
      if (s.total && s.total.length && s.rows.length) {
        const n = s.rows.length;
        const d = ["TỔNG CỘNG"];
        for (let c = 1; c < soCot; c++) {
          const L = ws.getColumn(c + 1).letter;
          d.push(s.total.includes(c) ? { formula: `SUM(${L}2:${L}${n + 1})` } : "");
        }
        const row = ws.addRow(d);
        row.font = { bold: true };
        row.eachCell({ includeEmpty: true }, c =>
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F3F6" } });
      }

      if (s.rows.length)
        ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: soCot } };
    });
    return new Blob([await wb.xlsx.writeBuffer()], { type: MIME });
  }

  A.lamBlobXlsx = async function (sheets) {
    if (typeof ExcelJS !== "undefined") {
      try { return await blobDep(sheets); }
      catch (e) { console.warn("Định dạng lỗi, dùng bản trơn:", e); }
    }
    return blobTron(sheets);
  };

  A.taiXlsx = async function (sheets, fname, label) {
    if (typeof XLSX === "undefined") { A.flash("Thư viện Excel chưa tải xong", true); return; }
    const blob = await A.lamBlobXlsx(sheets);
    let name = (fname || "du-lieu.xlsx").trim();
    if (!/\.xlsx$/i.test(name)) name += ".xlsx";
    if (DL) {
      try { await DL.save({ filename: name, data: blob }); A.flash(label || ("Đã tải " + name)); return; }
      catch (err) { if (err && err.code === "declined") { A.flash("Bạn đã huỷ tải file", true); return; } }
    }
    try { anchorSave(blob, name); A.flash(label || ("Đã tải " + name)); }
    catch (e) { A.flash("Trình duyệt không cho tải file ở đây", true); }
  };

  A.taiText = function (txt, name, mime) {
    const blob = new Blob([txt], { type: mime || "application/json" });
    if (DL) { DL.save({ filename: name, data: blob }).then(() => A.flash("Đã tải " + name))
      .catch(() => anchorSave(blob, name)); return; }
    anchorSave(blob, name);
    A.flash("Đã tải " + name);
  };

  /* bảng danh mục dùng chung cho xuất file và ghi vào thư mục */
  A.bangDanhMuc = () => A.state.items.map(r => { const v = A.giaGiam(r).v;
    return [r.sku, r.mach, r.code, r.name, r.unit, r.qty ?? "", r.price ?? "", v ?? "",
            A.tyLe(r.price, v), r.lastOut ? A.ngay(r.lastOut) : ""]; });

  /* tô đỏ dòng thiếu giá, tô vàng dòng sắp hết, tô xanh dòng đã có giá giảm */
  const toDanhMuc = r => !r[6] ? "do" : (r[5] !== "" && r[5] <= A.state.settings.low ? "vang"
                        : (r[7] !== "" ? "xanh" : null));

  const sheetDanhMuc = () => ({ name: "Danh mục", head: A.HEAD, rows: A.bangDanhMuc(),
    cols: [12, 24, 14, 54, 7, 8, 14, 16, 12, 12], hi: toDanhMuc, total: [5, 6, 7] });

  A.xuatXlsxBlob = () => A.lamBlobXlsx([sheetDanhMuc()]);

  A.xuatDanhMuc = () => {
    if (!A.state.items.length) { A.flash("Danh mục đang trống", true); return; }
    const co = A.state.items.filter(r => A.giaGiam(r).v != null).length;
    A.taiXlsx([sheetDanhMuc()], "Danh-muc-sau-giam-" + A.hnay() + ".xlsx",
      "Đã xuất " + A.state.items.length + " dòng (" + co + " dòng có giá giảm)");
  };

})(window.App);
