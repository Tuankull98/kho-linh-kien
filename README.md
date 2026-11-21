# Quản lý kho linh kiện

Ứng dụng web tĩnh, không cần máy chủ. Mở `index.html` là chạy.

## Cấu trúc

    index.html      giao diện, khai báo các màn hình
    app.css         toàn bộ phần nhìn
    js/core.js      tiện ích chung: bỏ dấu, định dạng số, tính giá giảm
    js/store.js     dữ liệu và 4 nơi lưu
    js/xlsxio.js    đọc file Excel, xuất file Excel
    js/import.js    màn Nhập liệu đa bố cục, hồ sơ ánh xạ cột
    js/excel.js     bộ công cụ Excel: so sánh, gộp, tách, dò lỗi
    js/catalog.js   màn Danh mục
    js/moves.js     màn Nhập / Xuất
    js/count.js     màn Kiểm kê
    js/reports.js   màn Báo cáo
    js/scan.js      quét mã vạch
    js/settings.js  màn Cài đặt
    js/main.js      khởi động

Sửa một màn hình thì chỉ động vào đúng file của màn đó.

## Nhập file Excel bất kỳ bố cục

Màn **Nhập liệu** không đọc cứng một bố cục. Quy trình 5 bước:

1. Mở file .xlsx / .xls / .csv, chọn trang tính nếu file nhiều trang.
2. Xem trước dữ liệu thô, chỉnh lại dòng tiêu đề nếu máy đoán sai.
3. Ghép từng cột của file vào ô của ứng dụng — máy đoán sẵn, bạn chỉ sửa chỗ sai.
4. Chọn đích đến: thay danh mục, cập nhật, chỉ sửa giá, chỉ sửa tồn,
   ghi thành phiếu nhập kho hoặc phiếu xuất kho.
5. Bấm Thử đọc xem kết quả rồi mới ghi vào dữ liệu thật.

Lưu cách ghép cột lại thành **hồ sơ** kèm tên. Lần sau mở file cùng kiểu,
ứng dụng so chữ ký dòng tiêu đề và tự áp dụng hồ sơ đó.

## Bộ công cụ Excel

Tab **Công cụ Excel** làm việc trực tiếp trên file, không cần nhập vào danh mục:

- **So sánh hai file** — chọn file kỳ trước và kỳ này, ra bảng mã mới,
  mã biến mất, tồn tăng, tồn giảm, giá thay đổi.
- **Gộp nhiều file** — chọn nhiều file cùng lúc, cộng dồn hoặc giữ riêng,
  file gộp có cột ghi rõ dòng nào đến từ file nào.
- **Tách theo nhóm** — tách danh mục hoặc một file ra nhiều sheet
  theo nhóm máy hoặc theo mã F.
- **Dò lỗi dữ liệu** — mã trùng, một mã linh kiện gắn nhiều mã hàng,
  tên gần giống nhau, thiếu giá, thiếu tồn, tồn âm, giá giảm cao hơn giá gốc,
  giá cao hoặc thấp bất thường so với nhóm, ô đáng lẽ là số lại là chữ.

File xuất ra đều có định dạng: đóng băng dòng tiêu đề, bộ lọc tự động,
định dạng nghìn cho cột số, tô màu dòng cần chú ý, dòng TỔNG CỘNG dùng công thức SUM.
Khi nhập lại, dòng TỔNG CỘNG được bỏ qua tự động.

## Bốn nơi lưu dữ liệu

1. Trình duyệt máy này — mặc định, không cần cài gì.
2. Thư mục trên máy — tự ghi `kho-du-lieu.json` và `kho-danh-muc.xlsx`. Cần Chrome hoặc Edge trên máy tính, trang mở qua https.
3. Google Sheets qua Apps Script — dán địa chỉ web app vào Cài đặt.
4. Máy chủ riêng — API nhận GET trả JSON, POST ghi JSON.

Cách 2, 3, 4 chỉ chạy khi tự host, không chạy trong khung xem của Claude.

## Đưa lên GitHub Pages

    git init
    git add .
    git commit -m "Ứng dụng quản lý kho linh kiện"
    git branch -M main
    git remote add origin https://github.com/TEN_CUA_BAN/kho-linh-kien.git
    git push -u origin main

Vào Settings > Pages, chọn nhánh `main`, thư mục `/ (root)`, bấm Save.
