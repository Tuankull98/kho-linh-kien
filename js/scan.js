/* scan.js — quét mã vạch bằng camera điện thoại, có đường lui nhập tay */
(function (A) {

  const $ = A.$;
  let stream = null, detector = null, vong = null, nhan = null, lienTuc = false, lanCuoi = 0, maCuoi = "";

  function dong() {
    if (vong) { cancelAnimationFrame(vong); vong = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    $("scanBox").classList.remove("on");
    nhan = null; lienTuc = false;
  }

  function timVaTra(ma) {
    const it = A.timTheoMa(ma) ||
      A.state.items.find(r => A.norm(r.sku).includes(A.norm(ma))) ||
      A.state.items.find(r => A.norm(r.code).includes(A.norm(ma)));
    if (!it) { $("scanMsg").textContent = "Không tìm thấy mã " + ma + " trong danh mục."; return false; }
    const cb = nhan;
    if (!lienTuc) dong();
    if (cb) cb(it);
    if (lienTuc) $("scanMsg").textContent = "Đã quét " + it.code + " — tiếp tục chĩa vào mã khác";
    return true;
  }

  async function batCamera() {
    const msg = $("scanMsg"), vid = $("scanVid");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      msg.innerHTML = "Trình duyệt này không mở được camera. Hãy gõ tay mã hàng vào ô dưới."; return;
    }
    if (!("BarcodeDetector" in window)) {
      msg.innerHTML = "Máy này không có bộ đọc mã vạch sẵn (thường chỉ Chrome trên Android có). "
        + "Bạn vẫn gõ tay mã hàng vào ô dưới được."; return;
    }
    try {
      detector = detector || new window.BarcodeDetector({
        formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "itf"] });
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }, audio: false });
      vid.srcObject = stream; await vid.play();
      msg.textContent = "Đang quét… chĩa camera vào mã vạch trên tem.";
      const quet = async () => {
        if (!stream) return;
        try {
          const kq = await detector.detect(vid);
          if (kq && kq.length) {
            const ma = (kq[0].rawValue || "").trim();
            const t = Date.now();
            if (ma && (ma !== maCuoi || t - lanCuoi > 1500)) { maCuoi = ma; lanCuoi = t; timVaTra(ma); }
          }
        } catch (e) {}
        if (stream) vong = requestAnimationFrame(quet);
      };
      vong = requestAnimationFrame(quet);
    } catch (e) {
      msg.innerHTML = "Không mở được camera (" + (e.message || "bị từ chối") +
        "). Hãy gõ tay mã hàng vào ô dưới.<br><small>Camera chỉ chạy khi trang mở qua https hoặc trên chính máy bạn.</small>";
    }
  }

  /* mở hộp quét; cb nhận linh kiện tìm được. nhieuLan = true thì quét xong không đóng hộp */
  A.moQuet = function (cb, nhieuLan) {
    nhan = cb; lienTuc = !!nhieuLan; maCuoi = "";
    $("scanManual").value = "";
    $("scanMsg").textContent = "Đang xin quyền camera…";
    $("scanBox").classList.add("on");
    $("scanManual").focus();
    batCamera();
  };

  function bind() {
    $("scanClose").onclick = dong;
    $("scanBox").onclick = e => { if (e.target.id === "scanBox") dong(); };
    $("scanManual").addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      const v = $("scanManual").value.trim(); if (!v) return;
      if (timVaTra(v)) $("scanManual").value = "";
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && $("scanBox").classList.contains("on")) dong();
    });
  }

  A.views.scan = { bind };

})(window.App);
