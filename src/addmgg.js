import { useState } from 'react';

export default function AddMGG({ setToast }) {
  const [voucher1, setVoucher1] = useState('');
  const [voucher2, setVoucher2] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherResult, setVoucherResult] = useState(null);
  const [voucherParsed, setVoucherParsed] = useState([]);
  const [voucherError, setVoucherError] = useState('');

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

  const parseVoucherLines = () => {
    const lines = voucher1.split('\n').filter(line => line.trim() !== '');
    const listVoucher = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('|');
      if (parts.length < 3) continue;
      listVoucher.push({
        code: parts[0].trim(),
        type: parts[1].trim(),
        value: parts[2].trim(),
      });
    }
    return listVoucher;
  };

  const parseVoucherApiResults = (data) => {
    if (!data?.results || !Array.isArray(data.results)) return [];
    return data.results.map(item => {
      const id = item.code || item.voucherCode || 'unknown';
      return {
        id,
        value: item.voucherId || item.newCode || item.resultCode || '',
        error: item.error || (item.status === 'success' ? 0 : 1),
        des: item.message || item.des || item.status || '',
        success: (item.error === 0 || item.status === 'success') && !!(item.voucherId || item.newCode || item.resultCode),
        prefix: 'VOUCHER=',
      };
    });
  };

  const handleVoucher1Change = (e) => {
    const value = e.target.value;
    const lines = value.split('\n');
    if (lines.length <= 50) {
      setVoucher1(value);
      setVoucherError('');
    } else {
      setVoucher1(lines.slice(0, 50).join('\n'));
    }
  };

  const voucherLineCount = voucher1.split('\n').filter(l => l.trim() !== '').length;

  const handleVoucherSubmit = async () => {
    const listVoucher = parseVoucherLines();
    if (listVoucher.length === 0) {
      setVoucherError('Không có dữ liệu hợp lệ. Mỗi dòng: code|loại|giá_trị');
      return;
    }
    setVoucherLoading(true);
    setVoucherError('');
    setVoucherResult(null);
    setVoucherParsed([]);
    setVoucher2('');

    try {
      const response = await fetch('https://api6-ufcx.onrender.com/add-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listVoucher }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Lỗi HTTP ${response.status}`);
      setVoucherResult(data);
      const parsed = parseVoucherApiResults(data);
      setVoucherParsed(parsed);
      setVoucher2(parsed.map(r => r.success ? `${r.id}: ${r.des} ✅\n${r.prefix}${r.value}` : `${r.id}: ${r.des} ❌`).join('\n\n'));
    } catch (err) {
      setVoucherError(err.message || 'Có lỗi xảy ra khi gọi API');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleVoucherCopyOne = (prefix, value) => {
    if (value) copyToClipboard(`${prefix}${value}`);
  };

  const handleVoucherCopyAll = () => {
    const all = voucherParsed.filter(r => r.success).map(r => `${r.prefix}${r.value}`).join('\n');
    if (all) copyToClipboard(all);
    else setToast('Không có dữ liệu nào!');
  };

  return (
    <div className="spc-form">
      <h2>Add mã giảm giá</h2>
      <div className="hint-box">
        <strong>Định dạng mỗi dòng (không xuống dòng):</strong><br />
        <code> Nhập cookie dạng SPC_ST=data</code><br />
        <code>Mỗi dòng 1 cookie</code>
      </div>

      <div className="textarea-row">
        <div className="textarea-group">
          <div className="label-row">
            <label>Danh sách SPC_ST</label>
            <span className={`line-counter ${voucherLineCount >= 50 ? 'limit' : ''}`}>{voucherLineCount}/50 dòng</span>
          </div>
          <textarea
            className="no-wrap"
            wrap="off"
            value={voucher1}
            onChange={handleVoucher1Change}
            placeholder="SPC_ST=data"
            rows="12"
          />
        </div>

        <div className="textarea-group">
          <div className="label-row">
            <label>Danh sách cookie add mã thành công</label>
            {voucherParsed.length > 0 && (
              <button className="copy-all-btn" onClick={handleVoucherCopyAll}>📋 Copy tất cả VOUCHER</button>
            )}
          </div>
          {voucherParsed.length > 0 ? (
            <div className="result-list">
              {voucherParsed.map((item, idx) => (
                <div
                  key={idx}
                  className={`result-item ${item.success ? 'success' : 'fail'}`}
                  onClick={() => item.success && handleVoucherCopyOne(item.prefix, item.value)}
                  title={item.success ? 'Click để copy' : ''}
                >
                  <div className="result-header">
                    <span className="result-id">{item.id}</span>
                    <span className="result-des">{item.des}</span>
                    <span className="result-icon">{item.success ? '✅' : '❌'}</span>
                  </div>
                  {item.success && (
                    <div className="result-spc">
                      <span className="spc-label">{item.prefix}</span>
                      <span className="spc-value">{item.value}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <textarea
              className="no-wrap"
              wrap="off"
              value={voucher2}
              onChange={(e) => setVoucher2(e.target.value)}
              placeholder="Sau khi gửi, kết quả mã giảm giá sẽ hiển thị ở đây..."
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