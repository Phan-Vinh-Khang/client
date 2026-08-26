import { useState } from 'react';

export default function AddMGG({ setToast }) {
  const [voucher1, setVoucher1] = useState(''); // listUser (SPC_ST)
  const [voucher2, setVoucher2] = useState(''); // listVoucher
  const [voucher3, setVoucher3] = useState('');  // text backup
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [validCount, setValidCount] = useState(0);
  const [validResults, setValidResults] = useState([]);
  const [errorResults, setErrorResults] = useState([]); // ← NEW: lưu cookie lỗi

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast('Đã copy!');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setToast('Đã copy!');
    }
  };

  const handleVoucher1Change = (e) => {
    const value = e.target.value;
    const lines = value.split('\n');
    if (lines.length <= 500) {
      setVoucher1(value);
      setVoucherError('');
    } else {
      setVoucher1(lines.slice(0, 500).join('\n'));
    }
  };

  const handleVoucher2Change = (e) => {
    const value = e.target.value;
    const lines = value.split('\n');
    if (lines.length <= 500) {
      setVoucher2(value);
      setVoucherError('');
    } else {
      setVoucher2(lines.slice(0, 500).join('\n'));
    }
  };

  const voucherLineCount1 = voucher1.split('\n').filter(l => l.trim() !== '').length;
  const voucherLineCount2 = voucher2.split('\n').filter(l => l.trim() !== '').length;

  const handleVoucherSubmit = async () => {
    const listUser = voucher1
      .split('\n')
      .map(l => l.trim())
      .filter(l => l !== '')
      .map(item => item.startsWith('SPC_ST=') ? item : `SPC_ST=${item}`);
    const listVoucher = voucher2.split('\n').map(l => l.trim()).filter(l => l !== '');

    if (listUser.length === 0) {
      setVoucherError('Vui lòng nhập ít nhất 1 SPC_ST ở Textbox 1');
      return;
    }
    if (listVoucher.length === 0) {
      setVoucherError('Vui lòng nhập ít nhất 1 voucher ở Textbox 2');
      return;
    }

    setVoucherLoading(true);
    setVoucherError('');
    setVoucher3('');
    setValidCount(0);
    setValidResults([]);
    setErrorResults([]); // ← reset

    try {
      // --- Đọc query param addDB từ URL client ---
      const clientParams = new URLSearchParams(window.location.search);
      const addDB = clientParams.get('addDB');
      let apiUrl = 'https://api6-production.up.railway.app/addmgg';
      if (addDB === 'false') {
        apiUrl += '?addDB=false';
      }
      // --- END ---

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listUser, listVoucher }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Lỗi HTTP ${response.status}`);

      // Tách valid & error
      const all = data.results || [];
      const valids = all.filter(
        item => item.invalid_message_code === 0 || item.invalid_message_code === 1
      );
      const errors = all.filter(
        item => item.status === 'auth_failed' || item.invalid_message_code === 2
      );

      const count = data.validCount !== undefined ? data.validCount : valids.length;
      setValidCount(count);
      setValidResults(valids);
      setErrorResults(errors);

      // Nếu không có tài khoản nào áp được → hiển thị thông báo ở textbox 3
      if (valids.length === 0) {
        setVoucher3('Không có cookie nào áp được mã');
      }

      const validLines = valids.map(item =>
        `Account ${item.accountIndex} | ${item.voucherCode} | ${item.cookie || ''}`
      );
      const errorLines = errors.map(item =>
        `Account ${item.accountIndex} | ${item.voucherCode} | ${item.cookie || ''} | [ERROR: ${item.invalid_message || 'Cookie hết hạn'}]`
      );
      setVoucher3(
        `${count} tài khoản có voucher\n\n` +
        `${validLines.join('\n')}\n\n` +
        `${errors.length > 0 ? `--- ${errors.length} tài khoản lỗi ---\n${errorLines.join('\n')}` : ''}`
      );
    } catch (err) {
      setVoucherError(err.message || 'Có lỗi xảy ra khi gọi API');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleCopyAllCookie = () => {
    const all = [...validResults, ...errorResults].map(r => r.cookie).filter(Boolean).join('\n');
    if (all) copyToClipboard(all);
    else setToast('Không có cookie nào!');
  };

  const hasAnyResult = validResults.length > 0 || errorResults.length > 0;

  return (
    <div className="spc-form">
      <h2>Add mã giảm giá</h2>

      {/* Cảnh báo số lượng cookie */}
      <div style={{ marginBottom: '12px', padding: '10px 16px', background: '#fff3e0', borderRadius: '8px', border: '1px solid #ff9800', color: '#e65100', fontSize: '14px' }}>
        ⚠️ <strong>Cảnh báo:</strong> Duyệt trên 100 cookie cùng lúc có thể phải chờ vài phút, mn ưu tiên duyệt số lượng cookie &lt;100
      </div>

      {/* Banner validCount */}
      {validCount > 0 && (
        <div className="valid-count-box" style={{ marginBottom: '12px', padding: '10px 16px', background: '#e8f5e9', borderRadius: '8px', border: '1px solid #4caf50', color: '#2e7d32', fontWeight: 'bold' }}>
          {validCount} tài khoản có voucher
        </div>
      )}

      <div className="hint-box">
        <strong>Định dạng nhập liệu:</strong><br />
        <code>Mỗi dòng 1 cookie SPC_ST</code><br />
        <code>Mỗi dòng 1 mã voucher</code>
      </div>

      <div className="textarea-row">
        {/* ── Textbox 1: listUser (SPC_ST) ── */}
        <div className="textarea-group col-large">
          <div className="label-row">
            <label>Danh sách SPC_ST</label>
            <span className={`line-counter ${voucherLineCount1 >= 500 ? 'limit' : ''}`}>{voucherLineCount1}/500 dòng</span>
          </div>
          <textarea
            className="no-wrap"
            wrap="off"
            value={voucher1}
            onChange={handleVoucher1Change}
            placeholder="SPC_ST=data1&#10;SPC_ST=data2"
            rows="12"
          />
        </div>

        {/* ── Textbox 2: listVoucher ── */}
        <div className="textarea-group col-large">
          <div className="label-row">
            <label>Danh sách voucher</label>
            <span className={`line-counter ${voucherLineCount2 >= 500 ? 'limit' : ''}`}>{voucherLineCount2}/500 dòng</span>
          </div>
          <textarea
            className="no-wrap"
            wrap="off"
            value={voucher2}
            onChange={handleVoucher2Change}
            placeholder="voucher1&#10;voucher2"
            rows="12"
          />
        </div>

        {/* ── Textbox 3: Kết quả — Tài khoản có voucher ── */}
        <div className="textarea-group col-large">
          <div className="label-row">
            <label>Tài khoản có voucher</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {hasAnyResult && (
                <button className="copy-all-btn" onClick={handleCopyAllCookie}>📋 Copy tất cả</button>
              )}
            </div>
          </div>

          {hasAnyResult ? (
            <div className="result-list" style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px' }}>
              {/* Thông báo khi không có tài khoản nào áp được */}
              {validResults.length === 0 && (
                <div style={{ padding: '12px', color: '#d32f2f', fontWeight: 'bold', textAlign: 'center', marginBottom: '8px', background: '#ffebee', borderRadius: '4px' }}>
                  Không có cookie nào áp được mã
                </div>
              )}

              {/* VALID items – màu xanh */}
              {validResults.map((item, idx) => (
                <div
                  key={`valid-${idx}`}
                  className="result-item success"
                  onClick={() => item.cookie && copyToClipboard(item.cookie)}
                  title="Click để copy cookie"
                  style={{ marginBottom: '8px', cursor: 'pointer' }}
                >
                  <div className="result-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    <div style={{ fontSize: '13px', color: '#555' }}>
                      <strong>cookie:</strong> {item.accountIndex}
                    </div>
                    <div style={{ fontSize: '13px', color: '#555' }}>
                      <strong>voucher:</strong> {item.voucherCode}
                    </div>
                  </div>
                  {item.cookie && (
                    <div className="result-spc" style={{ marginTop: '4px', wordBreak: 'break-all', fontSize: '12px', color: '#2e7d32', fontFamily: 'monospace', background: '#f1f8e9', padding: '6px', borderRadius: '4px' }}>
                      {item.cookie}
                    </div>
                  )}
                </div>
              ))}

              {/* ERROR items – màu cam */}
              {errorResults.map((item, idx) => (
                <div
                  key={`error-${idx}`}
                  className="result-item error"
                  onClick={() => item.cookie && copyToClipboard(item.cookie)}
                  title="Click để copy cookie (lỗi / hết hạn)"
                  style={{ marginBottom: '8px', cursor: 'pointer' }}
                >
                  <div className="result-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    <div style={{ fontSize: '13px', color: '#555' }}>
                      <strong>cookie:</strong> {item.accountIndex}
                    </div>
                    <div style={{ fontSize: '13px', color: '#555' }}>
                      <strong>voucher:</strong> {item.voucherCode}
                    </div>
                    <div style={{ fontSize: '12px', color: '#ed6c02', fontWeight: 'bold' }}>
                      ⚠️ {item.invalid_message || 'Cookie hết hạn'}
                    </div>
                  </div>
                  {item.cookie && (
                    <div className="result-spc" style={{ marginTop: '4px', wordBreak: 'break-all', fontSize: '12px', color: '#ed6c02', fontFamily: 'monospace', background: '#fff3e0', padding: '6px', borderRadius: '4px', border: '1px solid #ffcc80' }}>
                      {item.cookie}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <textarea
              className="no-wrap"
              wrap="off"
              value={voucher3}
              readOnly
              placeholder="Sau khi gửi, danh sách tài khoản có voucher sẽ hiển thị ở đây"
              rows="12"
            />
          )}
        </div>
      </div>

      {voucherError && <div className="alert alert-error">{voucherError}</div>}
      <button className="submit-btn" onClick={handleVoucherSubmit} disabled={voucherLoading}>
        {voucherLoading ? 'Đang gửi...' : 'Gửi'}
      </button>
    </div>
  );
}