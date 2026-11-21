/* Dán toàn bộ file này vào Apps Script của một Google Sheet trống,
   rồi Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.
   Copy địa chỉ /exec dán vào ô Địa chỉ trong màn Cài đặt của ứng dụng. */

const MA_BAO_VE = '';        // để trống là không kiểm tra; điền chuỗi bất kỳ cho an toàn hơn
const TEN_SHEET = 'duLieu';

function _sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(TEN_SHEET) || ss.insertSheet(TEN_SHEET);
}
function _check(e) {
  if (!MA_BAO_VE) return true;
  return e && e.parameter && e.parameter.token === MA_BAO_VE;
}
function _tra(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (!_check(e)) return _tra({ error: 'sai ma bao ve' });
  const v = _sheet().getRange('A1').getValue();
  if (!v) return _tra({ items: [], moves: [], counts: [] });
  return _tra(JSON.parse(v));
}

function doPost(e) {
  if (!_check(e)) return _tra({ error: 'sai ma bao ve' });
  const sh = _sheet();
  sh.getRange('A1').setValue(e.postData.contents);
  sh.getRange('B1').setValue(new Date());
  return _tra({ ok: true });
}
