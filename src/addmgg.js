import { useState } from 'react';

export default function AddMGG({ setToast }) {
  const [voucher1, setVoucher1] = useState(''); // listUser (SPC_ST)
  const [voucher2, setVoucher2] = useState(''); // listVoucher
  const [voucher3, setVoucher3] = useState(''); // text backup
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [validCount, setValidCount] = useState(0);
  const [validResults, setValidResults] = useState([]);
  const [errorResults, setErrorResults] = useState([]);

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

  const voucherLineCount1 = voucher1
    .split('\n')
    .filter(l => l.trim() !== '')
    .length;

  const voucherLineCount2 = voucher2
    .split('\n')
    .filter(l => l.trim() !== '')
    .length;

  const handleVoucherSubmit = async () => {
    const listUser = voucher1
      .split('\n')
      .map(l => l.trim())
      .filter(l => l !== '')
      .map(item =>
        item.startsWith('SPC_ST=') ? item : `SPC_ST=${item}`
      );

    const listVoucher = voucher2
      .split('\n')
      .map(l => l.trim())
      .filter(l => l !== '');

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
    setErrorResults([]);

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listUser,
          listVoucher,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `Lỗi HTTP ${response.status}`
        );
      }

      // Tách valid & error
      const all = data.results || [];

      const valids = all.filter(
        item =>
          item.invalid_message_code === 0 ||
          item.invalid_message_code === 1
      );

      const errors = all.filter(
        item =>
          item.status === 'auth_failed' ||
          item.invalid_message_code === 2
      );

      const count =
        data.validCount !== undefined
          ? data.validCount
          : valids.length;

      setValidCount(count);
      setValidResults(valids);
      setErrorResults(errors);

      // Nếu không có tài khoản nào áp được
      if (valids.length === 0) {
        setVoucher3('Không có cookie nào áp được mã');
      }

      const validLines = valids.map(
        item =>
          `Account ${item.accountIndex} | ${item.voucherCode} | ${
            item.cookie || ''
          }`
      );

      const errorLines = errors.map(
        item =>
          `Account ${item.accountIndex} | ${item.voucherCode} | ${
            item.cookie || ''
          } | [ERROR: ${
            item.invalid_message || 'Cookie hết hạn'
          }]`
      );

      setVoucher3(
        `${count} tài khoản có voucher\n\n` +
          `${validLines.join('\n')}\n\n` +
          `${
            errors.length > 0
              ? `--- ${errors.length} tài khoản lỗi ---\n${errorLines.join(
                  '\n'
                )}`
              : ''
          }`
      );
    } catch (err) {
      setVoucherError(
        err.message || 'Có lỗi xảy ra khi gọi API'
      );
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleCopyAllCookie = () => {
    const all = [...validResults, ...errorResults]
      .map(r => r.cookie)
      .filter(Boolean)
      .join('\n');

    if (all) {
      copyToClipboard(all);
    } else {
      setToast('Không có cookie nào!');
    }
  };

  const hasAnyResult =
    validResults.length > 0 || errorResults.length > 0;

  return (
    <div className="spc-form add-mgg-form">
      {/* ================= HEADER ================= */}
      <div className="mgg-header">
        <div className="mgg-title-wrap">
          <div className="mgg-title-icon">🎟️</div>

          <div>
            <h2>Add mã giảm giá</h2>
            <p>
              Kiểm tra và áp dụng voucher cho danh sách tài khoản
            </p>
          </div>
        </div>

        {validCount > 0 && (
          <div className="valid-count-box">
            <span className="valid-count-icon">✓</span>

            <div>
              <strong>{validCount}</strong>
              <span> tài khoản có voucher</span>
            </div>
          </div>
        )}
      </div>

      {/* ================= WARNING ================= */}
      <div className="mgg-warning">
        <div className="mgg-warning-icon">⚠️</div>

        <div>
          <strong>Lưu ý khi xử lý</strong>

          <p>
            Duyệt trên 100 cookie cùng lúc có thể phải chờ vài
            phút. Nên ưu tiên duyệt số lượng cookie{' '}
            <strong>&lt; 100</strong>.
          </p>
        </div>
      </div>

      {/* ================= HINT ================= */}
      <div className="hint-box">
        <div className="hint-title">
          <span>💡</span>
          <strong>Định dạng nhập liệu</strong>
        </div>

        <div className="hint-items">
          <div className="hint-item">
            <span className="hint-number">1</span>
            <code>Mỗi dòng 1 cookie SPC_ST</code>
          </div>

          <div className="hint-item">
            <span className="hint-number">2</span>
            <code>Mỗi dòng 1 mã voucher</code>
          </div>

          <div className="hint-item">
            <span className="hint-number">3</span>
            <span>Kết quả sẽ hiển thị tự động sau khi gửi</span>
          </div>
        </div>
      </div>

      {/* ================= MAIN ================= */}
      <div className="textarea-row">

        {/* ===== TEXTBOX 1 ===== */}
        <div className="textarea-group col-large">
          <div className="panel-card">

            <div className="panel-header">
              <div className="panel-title">
                <span className="panel-icon blue">🍪</span>

                <div>
                  <label>Danh sách SPC_ST</label>
                  <span className="panel-description">
                    Cookie tài khoản Shopee
                  </span>
                </div>
              </div>

              <span
                className={`line-counter ${
                  voucherLineCount1 >= 500 ? 'limit' : ''
                }`}
              >
                {voucherLineCount1}/500
              </span>
            </div>

            <div className="textarea-wrapper">
              <textarea
                className="no-wrap"
                wrap="off"
                value={voucher1}
                onChange={handleVoucher1Change}
                placeholder={`SPC_ST=data1
SPC_ST=data2
SPC_ST=data3`}
                rows="12"
              />

              <div className="textarea-footer">
                <span>
                  {voucherLineCount1 > 0
                    ? `${voucherLineCount1} cookie đã nhập`
                    : 'Chưa có cookie'}
                </span>

                <span className="limit-text">
                  Tối đa 500 dòng
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ===== TEXTBOX 2 ===== */}
        <div className="textarea-group col-large">
          <div className="panel-card">

            <div className="panel-header">
              <div className="panel-title">
                <span className="panel-icon purple">🎫</span>

                <div>
                  <label>Danh sách voucher</label>
                  <span className="panel-description">
                    Mã giảm giá cần kiểm tra
                  </span>
                </div>
              </div>

              <span
                className={`line-counter ${
                  voucherLineCount2 >= 500 ? 'limit' : ''
                }`}
              >
                {voucherLineCount2}/500
              </span>
            </div>

            <div className="textarea-wrapper">
              <textarea
                className="no-wrap"
                wrap="off"
                value={voucher2}
                onChange={handleVoucher2Change}
                placeholder={`voucher1
voucher2
voucher3`}
                rows="12"
              />

              <div className="textarea-footer">
                <span>
                  {voucherLineCount2 > 0
                    ? `${voucherLineCount2} voucher đã nhập`
                    : 'Chưa có voucher'}
                </span>

                <span className="limit-text">
                  Tối đa 500 dòng
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ===== TEXTBOX 3 ===== */}
        <div className="textarea-group col-large">
          <div className="panel-card result-panel">

            <div className="panel-header">
              <div className="panel-title">
                <span className="panel-icon green">✓</span>

                <div>
                  <label>Tài khoản có voucher</label>
                  <span className="panel-description">
                    Kết quả kiểm tra tài khoản
                  </span>
                </div>
              </div>

              {hasAnyResult && (
                <button
                  className="copy-all-btn"
                  onClick={handleCopyAllCookie}
                >
                  <span>📋</span>
                  Copy tất cả
                </button>
              )}
            </div>

            {hasAnyResult ? (
              <div className="result-list">

                {/* Không có valid */}
                {validResults.length === 0 && (
                  <div className="empty-valid">
                    <div className="empty-valid-icon">
                      ⚠️
                    </div>

                    <div>
                      <strong>
                        Không có cookie nào áp được mã
                      </strong>

                      <span>
                        Kiểm tra lại danh sách cookie hoặc voucher
                      </span>
                    </div>
                  </div>
                )}

                {/* ===== VALID ===== */}
                {validResults.length > 0 && (
                  <div className="result-section">
                    <div className="result-section-title success-title">
                      <span>✓</span>
                      <span>Thành công</span>
                      <b>{validResults.length}</b>
                    </div>

                    {validResults.map((item, idx) => (
                      <div
                        key={`valid-${idx}`}
                        className="result-item success"
                        onClick={() =>
                          item.cookie &&
                          copyToClipboard(item.cookie)
                        }
                        title="Click để copy cookie"
                      >
                        <div className="result-top">
                          <div className="account-info">
                            <span className="result-badge success-badge">
                              ✓
                            </span>

                            <div>
                              <span className="account-label">
                                Account
                              </span>

                              <strong>
                                {item.accountIndex}
                              </strong>
                            </div>
                          </div>

                          <span className="click-copy">
                            Click để copy
                          </span>
                        </div>

                        <div className="voucher-row">
                          <span>Voucher</span>
                          <strong>
                            {item.voucherCode}
                          </strong>
                        </div>

                        {item.cookie && (
                          <div className="result-spc">
                            {item.cookie}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ===== ERROR ===== */}
                {errorResults.length > 0 && (
                  <div className="result-section error-section">
                    <div className="result-section-title error-title">
                      <span>⚠</span>
                      <span>Tài khoản lỗi</span>
                      <b>{errorResults.length}</b>
                    </div>

                    {errorResults.map((item, idx) => (
                      <div
                        key={`error-${idx}`}
                        className="result-item error"
                        onClick={() =>
                          item.cookie &&
                          copyToClipboard(item.cookie)
                        }
                        title="Click để copy cookie lỗi"
                      >
                        <div className="result-top">
                          <div className="account-info">
                            <span className="result-badge error-badge">
                              !
                            </span>

                            <div>
                              <span className="account-label">
                                Account
                              </span>

                              <strong>
                                {item.accountIndex}
                              </strong>
                            </div>
                          </div>

                          <span className="click-copy">
                            Click để copy
                          </span>
                        </div>

                        <div className="voucher-row">
                          <span>Voucher</span>
                          <strong>
                            {item.voucherCode}
                          </strong>
                        </div>

                        <div className="error-message">
                          ⚠️{' '}
                          {item.invalid_message ||
                            'Cookie hết hạn'}
                        </div>

                        {item.cookie && (
                          <div className="result-spc error-cookie">
                            {item.cookie}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="result-empty">

                <div className="result-empty-icon">
                  <span>📋</span>
                </div>

                <strong>Chưa có kết quả</strong>

                <span>
                  Kết quả tài khoản có voucher sẽ hiển thị
                  ở đây sau khi bạn nhấn Gửi
                </span>

                <textarea
                  className="backup-result"
                  value={voucher3}
                  readOnly
                  placeholder=""
                  rows="5"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= ERROR ================= */}
      {voucherError && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <span>{voucherError}</span>
        </div>
      )}

      {/* ================= SUBMIT ================= */}
      <button
        className="submit-btn"
        onClick={handleVoucherSubmit}
        disabled={voucherLoading}
      >
        {voucherLoading ? (
          <>
            <span className="loading-spinner"></span>
            <span>Đang xử lý...</span>
          </>
        ) : (
          <>
            <span>🚀</span>
            <span>Gửi & kiểm tra voucher</span>
          </>
        )}
      </button>

      <div className="submit-hint">
        <span>🔒</span>
        <span>
          Dữ liệu được xử lý tự động • Tối đa 500 cookie
        </span>
      </div>
    </div>
  );
}
