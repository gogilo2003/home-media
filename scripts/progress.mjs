// Tiny TTY-aware progress reporter: in-place counter on a terminal,
// plain lines when stderr is redirected (e.g. in CI or a log file).
export function createProgress(total, label = '') {
  const tty = Boolean(process.stderr.isTTY);
  let done = 0;
  const start = Date.now();

  function render(item) {
    done++;
    const secs = (Date.now() - start) / 1000;
    const rate = done / secs;
    const eta = rate > 0 ? Math.max(0, Math.round((total - done) / rate)) : 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 100;
    const line = `${label}[${done}/${total}] ${pct}% eta ${eta}s  ${item}`;
    if (tty) process.stderr.write(`\r\x1b[2K${line}`);
    else process.stderr.write(`${line}\n`);
  }

  function end(summary) {
    if (tty) process.stderr.write('\r\x1b[2K');
    if (summary) process.stderr.write(`${summary}\n`);
  }

  return { render, end };
}
