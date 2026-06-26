/**
 * RelayMesh Load Test — HTML Report Generator
 * 
 * Usage: node load-test/generate-report.cjs load-test/report.json
 * 
 * Since "artillery report" is deprecated in Artillery v2, this script
 * reads the raw report.json and generates a standalone report.html
 * with Chart.js visualizations.
 */

const fs = require("fs");
const path = require("path");

const inputFile = process.argv[2] || path.join(__dirname, "report.json");
const outputFile = path.join(__dirname, "report.html");

if (!fs.existsSync(inputFile)) {
    console.error(`Error: ${inputFile} not found. Run "npm run load-test" first.`);
    process.exit(1);
}

const report = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
const { aggregate, intermediate } = report;

// ─── Extract time-series data from intermediate periods ───────────────────────
const labels = intermediate.map((_, i) => `${i * 10}s`);
const vuCreated   = intermediate.map(p => p.counters?.["vusers.created"] || 0);
const vuFailed    = intermediate.map(p => p.counters?.["vusers.failed"] || 0);
const vuCompleted = intermediate.map(p => p.counters?.["vusers.completed"] || 0);

// Count errors across all types
const vuErrors = intermediate.map(p => {
    return Object.entries(p.counters || {})
        .filter(([k]) => k.startsWith("errors."))
        .reduce((sum, [, v]) => sum + v, 0);
});

// Extract latency if available (socketio emit)
const latP50 = intermediate.map(p => p.summaries?.["socketio.emit"]?.p50 || p.summaries?.["socketio.response_time"]?.p50 || null);
const latP95 = intermediate.map(p => p.summaries?.["socketio.emit"]?.p95 || p.summaries?.["socketio.response_time"]?.p95 || null);
const latP99 = intermediate.map(p => p.summaries?.["socketio.emit"]?.p99 || p.summaries?.["socketio.response_time"]?.p99 || null);
const hasLatency = latP95.some(v => v !== null);

// ─── Aggregate summary numbers ────────────────────────────────────────────────
const totalCreated   = aggregate.counters?.["vusers.created"] || 0;
const totalCompleted = aggregate.counters?.["vusers.completed"] || 0;
const totalFailed    = aggregate.counters?.["vusers.failed"] || 0;
const totalErrors    = Object.entries(aggregate.counters || {})
    .filter(([k]) => k.startsWith("errors."))
    .reduce((sum, [, v]) => sum + v, 0);

const successRate = totalCreated > 0 
    ? (((totalCreated - totalFailed) / totalCreated) * 100).toFixed(1)
    : "0.0";

const durationMs = (aggregate.lastCounterAt || 0) - (aggregate.firstCounterAt || 0);
const durationSec = (durationMs / 1000).toFixed(0);

// ─── Custom Metrics ──────────────────────────────────────────────────────────
const totalMessages = aggregate.counters?.["messages_sent"] || 0;
const totalTyping = aggregate.counters?.["typing_events"] || 0;
const totalReceipts = aggregate.counters?.["read_receipts_sent"] || 0;
const totalRequests = totalMessages + totalTyping + totalReceipts;

// ─── Error breakdown ─────────────────────────────────────────────────────────
const errorBreakdown = Object.entries(aggregate.counters || {})
    .filter(([k]) => k.startsWith("errors."))
    .map(([k, v]) => ({ label: k.replace("errors.", ""), count: v }))
    .sort((a, b) => b.count - a.count);

// ─── Generate HTML ────────────────────────────────────────────────────────────
const statusColor = parseFloat(successRate) >= 95 ? "#10b981" : parseFloat(successRate) >= 70 ? "#f59e0b" : "#ef4444";
const statusLabel = parseFloat(successRate) >= 95 ? "PASSED" : parseFloat(successRate) >= 70 ? "PARTIAL" : "FAILED";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RelayMesh — Artillery Load Test Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
  
  header { 
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); 
    border-bottom: 1px solid #1e293b; 
    padding: 32px 48px; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
  }
  header h1 { font-size: 28px; font-weight: 700; color: #f8fafc; }
  header p { font-size: 14px; color: #64748b; margin-top: 4px; }
  
  .status-badge {
    background: ${statusColor}22;
    color: ${statusColor};
    border: 1px solid ${statusColor}44;
    padding: 8px 20px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 2px;
  }

  .container { max-width: 1400px; margin: 0 auto; padding: 40px 48px; }
  
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
  .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 24px; }
  .grid-1 { margin-bottom: 24px; }
  
  .card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 16px;
    padding: 24px;
  }
  .card h2 { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
  .card .value { font-size: 40px; font-weight: 700; color: #f8fafc; line-height: 1; }
  .card .sub { font-size: 13px; color: #64748b; margin-top: 6px; }
  .card.green .value { color: #10b981; }
  .card.red .value { color: #ef4444; }
  .card.yellow .value { color: #f59e0b; }
  .card.blue .value { color: #60a5fa; }

  .chart-card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; }
  .chart-card h3 { font-size: 16px; font-weight: 600; color: #f1f5f9; margin-bottom: 20px; }
  .chart-wrap { position: relative; height: 280px; }

  table { width: 100%; border-collapse: collapse; }
  thead th { text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; padding: 12px 16px; border-bottom: 1px solid #334155; }
  tbody td { padding: 12px 16px; border-bottom: 1px solid #1e293b; font-size: 14px; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: #334155; }

  .no-errors { color: #10b981; font-size: 15px; text-align: center; padding: 24px; }
  
  footer { text-align: center; padding: 32px; color: #475569; font-size: 13px; border-top: 1px solid #1e293b; margin-top: 16px; }
</style>
</head>
<body>
<header>
  <div>
    <h1>🚀 RelayMesh — Artillery Load Test Report</h1>
    <p>Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; Total duration: ${durationSec}s &nbsp;|&nbsp; ${totalCreated.toLocaleString()} virtual users</p>
  </div>
  <div class="status-badge">${statusLabel}</div>
</header>

<div class="container">

  <!-- KPI Cards -->
  <div class="grid-4">
    <div class="card blue">
      <h2>Virtual Users Created</h2>
      <div class="value">${totalCreated.toLocaleString()}</div>
      <div class="sub">Across all 5 phases</div>
    </div>
    <div class="card green">
      <h2>Completed Successfully</h2>
      <div class="value">${totalCompleted.toLocaleString()}</div>
      <div class="sub">Full scenario completed</div>
    </div>
    <div class="card red">
      <h2>Failed VUs</h2>
      <div class="value">${totalFailed.toLocaleString()}</div>
      <div class="sub">Errors during session</div>
    </div>
    <div class="card ${parseFloat(successRate) >= 95 ? 'green' : parseFloat(successRate) >= 70 ? 'yellow' : 'red'}">
      <h2>Success Rate</h2>
      <div class="value">${successRate}%</div>
      <div class="sub">Target: ≥ 95%</div>
    </div>
  </div>

  <!-- Custom Application Metrics -->
  ${totalRequests > 0 ? `
  <div class="grid-4" style="margin-bottom: 32px;">
    <div class="card" style="border-color: #8b5cf6;">
      <h2 style="color: #a78bfa;">Total Events Processed</h2>
      <div class="value" style="color: #c4b5fd;">${totalRequests.toLocaleString()}</div>
      <div class="sub">Total socket interactions</div>
    </div>
    <div class="card">
      <h2>Messages Sent</h2>
      <div class="value">${totalMessages.toLocaleString()}</div>
      <div class="sub">sendMessage events</div>
    </div>
    <div class="card">
      <h2>Typing Indicators</h2>
      <div class="value">${totalTyping.toLocaleString()}</div>
      <div class="sub">startTyping / stopTyping</div>
    </div>
    <div class="card">
      <h2>Read Receipts</h2>
      <div class="value">${totalReceipts.toLocaleString()}</div>
      <div class="sub">messagesDelivered/Read</div>
    </div>
  </div>
  ` : ''}

  <!-- VU Over Time -->
  <div class="grid-1">
    <div class="chart-card">
      <h3>📈 Virtual Users Over Time (per 10s window)</h3>
      <div class="chart-wrap">
        <canvas id="vuChart"></canvas>
      </div>
    </div>
  </div>

  <!-- Errors Over Time + Error Breakdown -->
  <div class="grid-2">
    <div class="chart-card">
      <h3>❌ Errors Over Time</h3>
      <div class="chart-wrap">
        <canvas id="errChart"></canvas>
      </div>
    </div>
    
    <div class="chart-card">
      <h3>🔍 Error Breakdown</h3>
      ${errorBreakdown.length === 0 
        ? '<div class="no-errors">✅ No errors recorded!</div>'
        : `<table>
            <thead><tr><th>Error</th><th>Count</th></tr></thead>
            <tbody>
              ${errorBreakdown.map(e => `
                <tr>
                  <td style="color:#fca5a5;font-size:13px;">${e.label}</td>
                  <td style="color:#ef4444;font-weight:700;">${e.count.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
      }
    </div>
  </div>

  ${hasLatency ? `
  <!-- Latency Chart -->
  <div class="grid-1">
    <div class="chart-card">
      <h3>⚡ Socket Emit Latency (ms)</h3>
      <div class="chart-wrap">
        <canvas id="latChart"></canvas>
      </div>
    </div>
  </div>
  ` : `
  <div class="card" style="margin-bottom:24px;">
    <h2>Latency Data</h2>
    <div class="sub" style="font-size:15px;margin-top:8px;">
      Latency metrics are only captured when virtual users successfully complete the connection phase.
      Fix auth errors first, then re-run to see latency charts.
    </div>
  </div>
  `}

</div>

<footer>RelayMesh Artillery Report &nbsp;|&nbsp; Built with Artillery v2 + Chart.js</footer>

<script>
const labels = ${JSON.stringify(labels)};
const chartDefaults = {
  plugins: { legend: { labels: { color: '#94a3b8' } } },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
    y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }
  }
};

// VU Chart
new Chart(document.getElementById('vuChart'), {
  type: 'line',
  data: {
    labels,
    datasets: [
      { label: 'Created', data: ${JSON.stringify(vuCreated)}, borderColor: '#60a5fa', backgroundColor: '#60a5fa22', fill: true, tension: 0.4, pointRadius: 0 },
      { label: 'Completed', data: ${JSON.stringify(vuCompleted)}, borderColor: '#10b981', backgroundColor: '#10b98122', fill: true, tension: 0.4, pointRadius: 0 },
      { label: 'Failed', data: ${JSON.stringify(vuFailed)}, borderColor: '#ef4444', backgroundColor: '#ef444422', fill: true, tension: 0.4, pointRadius: 0 },
    ]
  },
  options: { ...chartDefaults, responsive: true, maintainAspectRatio: false }
});

// Error Chart
new Chart(document.getElementById('errChart'), {
  type: 'bar',
  data: {
    labels,
    datasets: [
      { label: 'Errors', data: ${JSON.stringify(vuErrors)}, backgroundColor: '#ef444477', borderColor: '#ef4444', borderWidth: 1 }
    ]
  },
  options: { ...chartDefaults, responsive: true, maintainAspectRatio: false }
});

${hasLatency ? `
// Latency Chart
new Chart(document.getElementById('latChart'), {
  type: 'line',
  data: {
    labels,
    datasets: [
      { label: 'P50', data: ${JSON.stringify(latP50)}, borderColor: '#10b981', tension: 0.4, pointRadius: 0 },
      { label: 'P95', data: ${JSON.stringify(latP95)}, borderColor: '#f59e0b', tension: 0.4, pointRadius: 0 },
      { label: 'P99', data: ${JSON.stringify(latP99)}, borderColor: '#ef4444', tension: 0.4, pointRadius: 0 },
    ]
  },
  options: { ...chartDefaults, responsive: true, maintainAspectRatio: false }
});
` : ''}
</script>
</body>
</html>`;

fs.writeFileSync(outputFile, html);
console.log(`\n✅ Report generated: ${outputFile}\n`);
console.log(`   Open it in your browser to view the charts!\n`);
