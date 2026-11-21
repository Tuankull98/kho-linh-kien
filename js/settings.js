/* settings.js — chọn nơi lưu dữ liệu, nhập/xuất, thông số chung */
(function (A) {

  const $ = A.$;

  const NOI = [
    { id: "local",  ten: "Trình duyệt máy này",
      mo: "Không cần cài gì, mở là chạy. Chỉ dùng được trên đúng máy này, xoá dữ liệu trình duyệt là mất." },
    { id: "folder", ten: "Thư mục trên máy (tự ghi file)",
      mo: "Chọn một thư mục, sau đó mỗi lần sửa là tự ghi đè kho-du-lieu.json và kho-danh-muc.xlsx trong đó — không phải bấm tải." },
    { id: "sheets", ten: "Google Sheets (qua Apps Script)",
      mo: "Dán địa chỉ web app của Apps Script. Dữ liệu nằm trên Google Sheets, nhiều máy cùng xem được." },
    { id: "server", ten: "Máy chủ riêng",
      mo: "Dán địa chỉ API nhận GET trả JSON và POST ghi JSON. Dùng khi bạn có sẵn máy chủ hoặc Supabase." }
  ];

  function veNoiLuu() {
    const s = A.state.settings;
    $("stList").innerHTML = NOI.map(n => {
      const on = s.store === n.id;
      let cfg = "";
      if (n.id === "folder") {
        const t = A.thuMucDaChon();
        cfg = `<div class="cfg"><button class="btn" data-pick="1">${t ? "Đổi thư mục" : "Chọn thư mục"}</button>
               <span class="note" style="margin-left:8px">${t ? "Đang ghi vào: <b>" + A.esc(t) + "</b>" : "Chưa chọn thư mục"}</span></div>`;
      } else if (n.id === "sheets" || n.id === "server") {
        cfg = `<div class="cfg"><div class="row">
          <div style="flex:1 1 300px"><label>Địa chỉ</label>
            <input type="text" data-cf="url" value="${A.esc(s.url)}" placeholder="https://script.google.com/macros/s/..../exec" style="width:100%"></div>
          <div><label>Mã bảo vệ (tuỳ chọn)</label><input type="text" data-cf="token" value="${A.esc(s.token)}" style="width:150px"></div>
          <button class="btn" data-test="1">Thử kết nối</button></div></div>`;
      }
      return `<div class="opt${on ? " on" : ""}" data-n="${n.id}">
        <input type="radio" name="noi" ${on ? "checked" : ""}>
        <div style="flex:1"><b>${n.ten}</b><small>${n.mo}</small>${cfg}</div></div>`;
    }).join("");

    const s2 = A.state.settings;
    $("stWarn").innerHTML = (s2.store === "folder" && !A.coTheChonThuMuc())
      ? '<b class="bad">Trình duyệt này không cho chọn thư mục.</b> Cần Chrome hoặc Edge trên máy tính, và trang phải mở qua https hoặc từ máy chủ nội bộ — mở trong khung xem của Claude thì không được.'
      : (s2.store === "sheets" || s2.store === "server")
      ? 'Lưu ý: gọi ra máy chủ bên ngoài bị chặn khi trang chạy trong khung xem của Claude. Cách này chỉ hoạt động khi bạn tự đưa trang lên GitHub Pages hoặc máy chủ của mình.'
      : 'Một bản dữ liệu luôn được giữ trong trình duyệt máy này làm phao, kể cả khi bạn chọn nơi lưu khác.';
  }

  function doiNoi(id) {
    A.state.settings.store = id; A.save(true); veNoiLuu();
  }

  async function thuKetNoi(btn) {
    btn.disabled = true; btn.textContent = "Đang thử…";
    try {
      const ok = await A.load();
      A.flash(ok ? "Kết nối được, đã nạp dữ liệu" : "Nối được nhưng chưa có dữ liệu");
      A.veTatCa();
    } catch (e) { A.flash("Không nối được: " + e.message, true); }
    btn.disabled = false; btn.textContent = "Thử kết nối";
  }

  function bind() {
    $("stList").addEventListener("click", async e => {
      const opt = e.target.closest(".opt"); if (!opt) return;
      if (e.target.closest("[data-pick]")) {
        try { const t = await A.chonThuMuc(); doiNoi("folder"); A.save(true);
              A.flash("Sẽ ghi dữ liệu vào thư mục " + t); }
        catch (err) { A.flash("Không chọn được thư mục: " + err.message, true); }
        return;
      }
      if (e.target.closest("[data-test]")) { thuKetNoi(e.target.closest("[data-test]")); return; }
      if (e.target.matches("input[data-cf]")) return;
      doiNoi(opt.dataset.n);
    });
    $("stList").addEventListener("input", e => {
      const i = e.target.closest("input[data-cf]"); if (!i) return;
      A.state.settings[i.dataset.cf] = i.value.trim(); A.save();
    });

    $("goImport").onclick = () => A.show("import");

    $("dlAll").onclick = A.xuatDanhMuc;
    $("bkJson").onclick = () => A.taiText(A.goi(), "Sao-luu-kho-" + A.hnay() + ".json");
    $("rsJson").onchange = ev => {
      const f = ev.target.files[0]; if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        try { A.moGoi(fr.result); A.save(true); A.veTatCa(); A.flash("Đã phục hồi dữ liệu"); }
        catch (e) { A.flash("File sao lưu không đọc được", true); }
      };
      fr.readAsText(f); ev.target.value = "";
    };
    $("wipe").onclick = () => {
      if (!confirm("Xoá sạch danh mục, sổ nhập xuất và các phiên kiểm kê?")) return;
      A.state.items = []; A.state.moves = []; A.state.counts = [];
      A.save(true); A.veTatCa(); A.flash("Đã xoá sạch dữ liệu");
    };

    [["cfLow", "low"], ["cfDays", "slowDays"], ["cfRound", "round"]].forEach(([id, k]) =>
      $(id).addEventListener("change", () => {
        A.state.settings[k] = +$(id).value || (k === "round" ? 10000 : 0);
        A.save(); A.veTatCa(); }));
  }

  function ve() {
    const s = A.state.settings;
    veNoiLuu();
    $("cfLow").value = s.low; $("cfDays").value = s.slowDays; $("cfRound").value = s.round;
  }

  A.views.settings = { ve, onShow: ve, bind };

})(window.App);
