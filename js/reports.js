/* reports.js — báo cáo quản trị */
(function (A) {

  const $ = A.$;
  const giaTri = r => (r.qty || 0) * (r.price || 0);

  function tinh() {
    const low = +$("rpLow").value || 0, days = +$("rpDays").value || 180;
    const I = A.state.items;

    const nhom = {};
    I.forEach(r => { const g = nhom[r.mach] || (nhom[r.mach] = { sl: 0, gt: 0, ma: 0 });
      g.sl += r.qty || 0; g.gt += giaTri(r); g.ma++; });

    const xuat = {};
    A.state.moves.filter(m => m.type === "out").forEach(m => {
      const x = xuat[m.itemId] || (xuat[m.itemId] = { sl: 0, lan: 0, name: m.name, code: m.code });
      x.sl += Math.abs(m.qty); x.lan++; });

    return {
      low, days,
      tongMa: I.length,
      tongSL: I.reduce((s, r) => s + (r.qty || 0), 0),
      tongGT: I.reduce((s, r) => s + giaTri(r), 0),
      tongSauGiam: I.reduce((s, r) => s + (r.qty || 0) * (A.giaGiam(r).v ?? r.price ?? 0), 0),
      thieuGia: I.filter(r => !r.price).length,
      het: I.filter(r => r.qty === 0).length,
      nhom: Object.entries(nhom).sort((a, b) => b[1].gt - a[1].gt),
      big: [...I].sort((a, b) => giaTri(b) - giaTri(a)).slice(0, 15),
      sapHet: I.filter(r => r.qty != null && r.qty <= low).sort((a, b) => a.qty - b.qty).slice(0, 40),
      cham: I.filter(r => (r.qty || 0) > 0)
             .filter(r => { const d = A.soNgay(r.lastOut); return d == null || d >= days; })
             .sort((a, b) => giaTri(b) - giaTri(a)).slice(0, 40),
      nhanh: Object.values(xuat).sort((a, b) => b.sl - a.sl).slice(0, 15)
    };
  }

  function lst(items, fn) {
    if (!items.length) return '<p class="note">Không có dòng nào.</p>';
    return '<div class="lst">' + items.map(fn).join("") + "</div>";
  }
  const thanh = (v, max) => `<div class="meter"><i style="width:${max ? Math.round(v / max * 100) : 0}%"></i></div>`;

  function ve() {
    const d = tinh();
    $("rpTop").innerHTML = `
      <div class="stat"><span>Tổng mã</span><b>${A.fm(d.tongMa)}</b></div>
      <div class="stat"><span>Tổng tồn</span><b>${A.fm(d.tongSL)}</b></div>
      <div class="stat"><span>Giá trị tồn</span><b>${A.fm(d.tongGT)}</b></div>
      <div class="stat"><span>Sau giảm giá</span><b>${A.fm(d.tongSauGiam)}</b></div>
      <div class="stat"><span>Mã đã hết</span><b class="bad">${A.fm(d.het)}</b></div>
      <div class="stat"><span>Thiếu giá</span><b class="bad">${A.fm(d.thieuGia)}</b></div>`;

    const maxG = d.nhom.length ? d.nhom[0][1].gt : 0;
    $("rpGroup").innerHTML = lst(d.nhom, ([ten, g]) =>
      `<div class="l"><div><b>${A.esc(ten)}</b><small>${g.ma} mã · tồn ${A.fm(g.sl)}</small>${thanh(g.gt, maxG)}</div>
       <span class="n">${A.fm(g.gt)}</span><span></span></div>`);

    const maxB = d.big.length ? giaTri(d.big[0]) : 0;
    $("rpBig").innerHTML = lst(d.big, r =>
      `<div class="l"><div><b>${A.esc(r.code)}</b><small>${A.esc(r.name)}</small>${thanh(giaTri(r), maxB)}</div>
       <span class="n">${A.fm(r.qty)} cái</span><span class="n">${A.fm(giaTri(r))}</span></div>`);

    $("rpLowList").innerHTML = lst(d.sapHet, r =>
      `<div class="l"><div><b>${A.esc(r.code)}</b><small>${A.esc(r.name)}</small></div>
       <span class="n ${r.qty === 0 ? "bad" : ""}">${r.qty === 0 ? "HẾT" : "còn " + r.qty}</span>
       <span class="n">${A.fm(r.price)}</span></div>`);

    $("rpSlow").innerHTML = lst(d.cham, r => { const n = A.soNgay(r.lastOut);
      return `<div class="l"><div><b>${A.esc(r.code)}</b><small>${A.esc(r.name)}</small></div>
        <span class="n">${n == null ? "chưa xuất lần nào" : n + " ngày"}</span>
        <span class="n">${A.fm(giaTri(r))}</span></div>`; });

    const maxN = d.nhanh.length ? d.nhanh[0].sl : 0;
    $("rpFast").innerHTML = lst(d.nhanh, x =>
      `<div class="l"><div><b>${A.esc(x.code)}</b><small>${A.esc(x.name)}</small>${thanh(x.sl, maxN)}</div>
       <span class="n">${x.sl} cái</span><span class="n">${x.lan} lần</span></div>`);

    const ch = d.tongGT - d.tongSauGiam;
    $("rpVal").innerHTML = `<div class="lst">
      <div class="l"><div>Giá trị theo giá hiện tại</div><span class="n">${A.fm(d.tongGT)}</span><span></span></div>
      <div class="l"><div>Giá trị theo giá đề xuất giảm</div><span class="n">${A.fm(d.tongSauGiam)}</span><span></span></div>
      <div class="l"><div><b>Phần giảm</b></div><span class="n bad">−${A.fm(ch)}</span>
        <span class="n bad">${d.tongGT ? (ch / d.tongGT * 100).toFixed(1) + "%" : "—"}</span></div></div>`;

    A.rpData = d;
  }

  function xuat() {
    const d = A.rpData || tinh();
    A.taiXlsx([
      { name: "Tổng quan", head: ["Chỉ tiêu", "Giá trị"],
        rows: [["Tổng số mã", d.tongMa], ["Tổng tồn", d.tongSL], ["Giá trị tồn", d.tongGT],
               ["Giá trị sau giảm", d.tongSauGiam], ["Phần giảm", d.tongGT - d.tongSauGiam],
               ["Mã đã hết", d.het], ["Mã thiếu giá", d.thieuGia]], cols: [30, 18] },
      { name: "Theo nhóm máy", head: ["Nhóm máy", "Số mã", "Tổng tồn", "Giá trị tồn"],
        rows: d.nhom.map(([t, g]) => [t, g.ma, g.sl, g.gt]), cols: [30, 10, 12, 18] },
      { name: "Tồn nhiều nhất", head: ["Mã linh kiện", "Tên", "SL", "Giá", "Giá trị"],
        rows: d.big.map(r => [r.code, r.name, r.qty, r.price, (r.qty || 0) * (r.price || 0)]),
        cols: [14, 50, 9, 14, 16] },
      { name: "Sắp hết", head: ["Mã linh kiện", "Tên", "Còn lại", "Giá"],
        rows: d.sapHet.map(r => [r.code, r.name, r.qty, r.price]), cols: [14, 50, 10, 14] },
      { name: "Tồn lâu", head: ["Mã linh kiện", "Tên", "SL", "Số ngày chưa xuất", "Giá trị"],
        rows: d.cham.map(r => [r.code, r.name, r.qty, A.soNgay(r.lastOut) ?? "chưa xuất",
          (r.qty || 0) * (r.price || 0)]), cols: [14, 50, 9, 18, 16] },
      { name: "Xuất nhiều", head: ["Mã linh kiện", "Tên", "Tổng xuất", "Số lần"],
        rows: d.nhanh.map(x => [x.code, x.name, x.sl, x.lan]), cols: [14, 50, 12, 10] }
    ], "Bao-cao-kho-" + A.hnay() + ".xlsx", "Đã xuất báo cáo 6 sheet");
  }

  function bind() {
    $("rpRefresh").onclick = ve;
    $("rpExport").onclick = xuat;
    ["rpLow", "rpDays"].forEach(id => $(id).addEventListener("change", () => {
      A.state.settings.low = +$("rpLow").value || 0;
      A.state.settings.slowDays = +$("rpDays").value || 180;
      A.save(); ve(); }));
  }

  A.views.reports = { ve, onShow: ve, bind };

})(window.App);
