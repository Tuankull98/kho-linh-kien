/* store.js — dữ liệu và 4 nơi lưu: trình duyệt / thư mục trên máy / Google Sheets / máy chủ riêng */
(function (A) {

  const KEY = "kho-app-v1";

  A.state = {
    items: [], moves: [], counts: [],
    settings: { tiers: [30, 25, 20, 16, 12], recalc: false, round: 10000,
                low: 2, slowDays: 180, store: "local", url: "", token: "", fname: "",
                profiles: [] }
  };

  /* ---------- tạo một dòng linh kiện chuẩn ---------- */
  A.mkItem = o => ({
    id: o.id || A.uid(),
    sku: (o.sku || "").toString().trim(),
    mach: o.mach || "Chưa phân nhóm",
    code: (o.code || "").toString().trim(),
    name: (o.name || "").toString().trim(),
    unit: o.unit || "",
    qty:   (o.qty === "" || o.qty == null) ? null : Number(o.qty),
    price: (o.price === "" || o.price == null) ? null : Number(o.price),
    given: (o.given === "" || o.given == null) ? null : Number(o.given),
    manual: !!o.manual,
    lastOut: o.lastOut || null,
    lastIn: o.lastIn || null
  });

  /* ---------- IndexedDB nhỏ, để nhớ thư mục đã chọn ---------- */
  function idb(mode, val) {
    return new Promise(res => {
      try {
        const rq = indexedDB.open("kho-app", 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
        rq.onerror = () => res(null);
        rq.onsuccess = () => {
          const db = rq.result, tx = db.transaction("kv", mode === "get" ? "readonly" : "readwrite");
          const st = tx.objectStore("kv");
          const r = mode === "get" ? st.get("dir") : st.put(val, "dir");
          r.onsuccess = () => res(mode === "get" ? r.result : true);
          r.onerror = () => res(null);
        };
      } catch (e) { res(null); }
    });
  }

  /* ---------- các nơi lưu ---------- */
  let dirHandle = null;
  A.coTheChonThuMuc = () => typeof window.showDirectoryPicker === "function";
  A.thuMucDaChon = () => dirHandle ? dirHandle.name : null;

  A.chonThuMuc = async () => {
    if (!A.coTheChonThuMuc()) throw new Error("Trình duyệt này không cho chọn thư mục");
    dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    await idb("set", dirHandle);
    return dirHandle.name;
  };

  async function quyenThuMuc() {
    if (!dirHandle) return false;
    const o = { mode: "readwrite" };
    if (await dirHandle.queryPermission(o) === "granted") return true;
    return await dirHandle.requestPermission(o) === "granted";
  }

  async function ghiThuMuc(ten, blob) {
    if (!await quyenThuMuc()) throw new Error("Chưa được cấp quyền ghi thư mục");
    const fh = await dirHandle.getFileHandle(ten, { create: true });
    const w = await fh.createWritable();
    await w.write(blob); await w.close();
  }
  A.ghiThuMuc = ghiThuMuc;

  async function docThuMuc(ten) {
    if (!dirHandle || !await quyenThuMuc()) return null;
    try { const fh = await dirHandle.getFileHandle(ten); return await (await fh.getFile()).text(); }
    catch (e) { return null; }
  }

  const goiMayChu = async (method, body) => {
    const s = A.state.settings;
    if (!s.url) throw new Error("Chưa điền địa chỉ máy chủ");
    const opt = { method, headers: { "Content-Type": "text/plain;charset=utf-8" } };
    if (body) opt.body = JSON.stringify(body);
    const u = s.url + (s.url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(s.token || "");
    const r = await fetch(u, opt);
    if (!r.ok) throw new Error("Máy chủ trả về lỗi " + r.status);
    const t = await r.text();
    try { return JSON.parse(t); } catch (e) { return null; }
  };

  /* ---------- gói / mở gói dữ liệu ---------- */
  const goi = () => JSON.stringify({ v: 1, at: A.now(),
    items: A.state.items, moves: A.state.moves, counts: A.state.counts, settings: A.state.settings });

  function moGoi(txt) {
    const d = JSON.parse(txt);
    A.state.items  = (d.items  || []).map(A.mkItem);
    A.state.moves  = d.moves  || [];
    A.state.counts = d.counts || [];
    Object.assign(A.state.settings, d.settings || {});
    return true;
  }
  A.moGoi = moGoi; A.goi = goi;

  /* ---------- lưu (gộp nhiều lần sửa thành một lần ghi) ---------- */
  let hen = null, dangGhi = false;
  A.save = function (ngay) {
    clearTimeout(hen);
    if (ngay) return thucSuLuu();
    hen = setTimeout(thucSuLuu, 600);
  };

  async function thucSuLuu() {
    if (dangGhi) { A.save(); return; }
    dangGhi = true;
    const s = A.state.settings, data = goi();
    try {
      localStorage.setItem(KEY, data);            // luôn giữ một bản trong máy làm phao
      if (s.store === "folder" && dirHandle) {
        await ghiThuMuc("kho-du-lieu.json", new Blob([data], { type: "application/json" }));
        if (A.xuatXlsxBlob) await ghiThuMuc("kho-danh-muc.xlsx", await A.xuatXlsxBlob());
        A.flash("Đã ghi vào thư mục " + dirHandle.name);
      } else if (s.store === "sheets" || s.store === "server") {
        await goiMayChu("POST", JSON.parse(data));
        A.flash("Đã đồng bộ lên máy chủ");
      } else {
        A.flash("Đã lưu " + new Date().toLocaleTimeString("vi-VN"));
      }
    } catch (e) {
      A.flash("Chưa lưu được: " + e.message + " (bản trong máy vẫn còn)", true);
    }
    dangGhi = false;
  }

  /* ---------- nạp lúc mở trang ---------- */
  A.load = async function () {
    let xong = false;
    try { const t = localStorage.getItem(KEY); if (t) { moGoi(t); xong = true; } } catch (e) {}

    const s = A.state.settings;
    if (s.store === "folder") {
      dirHandle = await idb("get");
      const t = await docThuMuc("kho-du-lieu.json");
      if (t) { try { moGoi(t); xong = true; A.flash("Đã nạp từ thư mục " + dirHandle.name); } catch (e) {} }
    } else if (s.store === "sheets" || s.store === "server") {
      try { const d = await goiMayChu("GET");
            if (d && d.items) { moGoi(JSON.stringify(d)); xong = true; A.flash("Đã nạp từ máy chủ"); } }
      catch (e) { A.flash("Không nối được máy chủ, dùng bản trong máy", true); }
    }
    return xong;
  };

  /* ---------- thao tác nghiệp vụ ---------- */
  A.timTheoKhoa = k => A.state.items.find(r => A.key(r) === k);
  A.timTheoMa = s => { const n = A.norm(s);
    return A.state.items.find(r => A.norm(r.sku) === n) || A.state.items.find(r => A.norm(r.code) === n); };

  /* ghi một phiếu nhập/xuất/điều chỉnh, tồn tự cộng trừ */
  A.ghiPhieu = function (type, item, qty, note, lang) {
    qty = Number(qty) || 0;
    if (!item || (type !== "adj" && qty <= 0)) return null;
    const truoc = item.qty || 0;
    let sau;
    if (type === "in")  sau = truoc + qty;
    else if (type === "out") sau = Math.max(0, truoc - qty);
    else sau = Math.max(0, qty);
    item.qty = sau;
    if (type === "in")  item.lastIn  = A.now();
    if (type === "out") item.lastOut = A.now();
    const mv = { id: A.uid(), at: A.now(), type, itemId: item.id, sku: item.sku, code: item.code,
                 name: item.name, qty: type === "adj" ? (sau - truoc) : qty,
                 before: truoc, after: sau, price: item.price, note: note || "", tag: lang || "" };
    A.state.moves.unshift(mv);
    if (A.state.moves.length > 5000) A.state.moves.length = 5000;
    A.save();
    return mv;
  };

  /* huỷ một phiếu: trả tồn về như trước khi ghi phiếu đó */
  A.huyPhieu = function (id) {
    const i = A.state.moves.findIndex(m => m.id === id);
    if (i < 0) return false;
    const mv = A.state.moves[i], it = A.state.items.find(r => r.id === mv.itemId);
    if (it) it.qty = Math.max(0, (it.qty || 0) - (mv.after - mv.before));
    A.state.moves.splice(i, 1);
    A.save();
    return true;
  };

})(window.App);
