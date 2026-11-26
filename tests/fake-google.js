/* An in-memory stand-in for the parts of Google Apps Script that
   sheet-setup/apps-script-code.gs uses, so the backend can be
   tested in the browser. Sheets keep their cells in `rows`. */

function makeFakeGoogle() {
  const sheets = {};

  function makeSheet(name) {
    const sheet = {
      name,
      rows: [],
      getName: () => name,
      getLastRow: () => sheet.rows.length,
      appendRow(values) { sheet.rows.push(values.slice()); },
      setFrozenRows() {},
      getDataRange() {
        return { getValues: () => sheet.rows.map(r => r.slice()) };
      },
      getRange(row, col, numRows = 1, numCols = 1) {
        if (typeof row === 'string') return { setNumberFormat() { return this; } };
        return {
          getValues() {
            const out = [];
            for (let r = 0; r < numRows; r++) {
              const src = sheet.rows[row - 1 + r] || [];
              const line = [];
              for (let c = 0; c < numCols; c++) line.push(src[col - 1 + c] === undefined ? '' : src[col - 1 + c]);
              out.push(line);
            }
            return out;
          },
          setValues(values) {
            values.forEach((line, r) => {
              while (sheet.rows.length < row + r) sheet.rows.push([]);
              line.forEach((v, c) => { sheet.rows[row - 1 + r][col - 1 + c] = v; });
            });
            return this;
          },
          setNumberFormat() { return this; },
        };
      },
    };
    return sheet;
  }

  const spreadsheet = {
    getSheetByName: name => sheets[name] || null,
    insertSheet: name => (sheets[name] = makeSheet(name)),
  };

  let uuid = 0;
  const Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    // Not real SHA-256: a deterministic stand-in that returns 32 signed bytes.
    computeDigest(alg, value) {
      const bytes = [];
      for (let i = 0; i < 32; i++) {
        let h = 7 + i;
        for (let j = 0; j < value.length; j++) h = (h * 31 + value.charCodeAt(j) * (i + 1)) % 251;
        bytes.push(h - 128);
      }
      return bytes;
    },
    getUuid: () => `uuid-${++uuid}`,
  };

  const LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };

  const ContentService = {
    MimeType: { JSON: 'JSON' },
    createTextOutput(content) {
      return { setMimeType() { return this; }, getContent: () => content };
    },
  };

  return { SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet }, Utilities, LockService, ContentService, sheets };
}
