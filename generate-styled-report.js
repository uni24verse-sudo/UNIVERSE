const fs = require('fs');
const { marked } = require('marked');

const markdownPath = 'universe_report.md';
let markdown = '';
try {
  markdown = fs.readFileSync(markdownPath, 'utf-8');
} catch (err) {
  console.error(`Could not read ${markdownPath}.`);
  process.exit(1);
}

const htmlContent = marked.parse(markdown);

const styledHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UniVerse Production Website Usage, Test & Safety Report</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #4f46e5;
      --primary-dark: #3730a3;
      --success: #10b981;
      --warning: #f59e0b;
      --card-bg: #ffffff;
      --text-main: #1e293b;
      --border-color: #e2e8f0;
    }
    
    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: var(--text-main);
      margin: 0;
      padding: 40px 20px;
    }

    .report-container {
      max-width: 1040px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
      padding: 50px 60px;
    }

    /* Header Banner */
    .report-header {
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 30px;
      margin-bottom: 35px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }

    .brand-title {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin: 0;
    }

    .brand-sub {
      color: #64748b;
      font-size: 14px;
      margin-top: 4px;
    }

    .badge-certified {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 8px 16px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.3px;
    }

    /* KPI Highlights Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 40px;
    }

    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }

    .kpi-val {
      font-size: 32px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 6px;
    }

    .kpi-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .kpi-sub {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
    }

    .color-green { color: #059669; }
    .color-blue  { color: #0284c7; }
    .color-purple{ color: #7c3aed; }
    .color-amber { color: #d97706; }

    /* Markdown styling tweaks */
    .markdown-body {
      font-family: inherit;
      color: inherit;
      line-height: 1.7;
    }

    .markdown-body h1 {
      border-bottom: none;
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 30px;
    }

    .markdown-body h2 {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 36px;
    }

    .markdown-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      border-radius: 8px;
      overflow: hidden;
    }

    .markdown-body table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 12px 14px;
    }

    .markdown-body table td {
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
    }

    .markdown-body code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .markdown-body pre code {
      background: transparent;
      padding: 0;
    }

    /* Print Controls */
    .toolbar-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 20px;
    }

    .btn-print {
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s ease;
    }

    .btn-print:hover {
      background: #334155;
    }

    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .report-container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <div class="report-container">
    <div class="toolbar-actions no-print">
      <button class="btn-print" onclick="window.print()">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/></svg>
        Save as PDF / Print
      </button>
    </div>

    <div class="report-header">
      <div>
        <h1 class="brand-title">UniVerse Production Audit</h1>
        <div class="brand-sub">Domain: https://universeorder.co.in &bull; AWS EC2 Ubuntu &bull; Nginx 1.28.3</div>
      </div>
      <div class="badge-certified">
        <span>✓</span> LIVE AUDIT CERTIFIED
      </div>
    </div>

    <!-- Quick Metric Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-val color-green">Grade A</div>
        <div class="kpi-label">SSL & Security</div>
        <div class="kpi-sub">Qualys SSL Labs (TLS 1.3 + PQC)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val color-blue">88 / 100</div>
        <div class="kpi-label">Desktop Speed</div>
        <div class="kpi-sub">LCP 1.4s &bull; TBT 60ms &bull; 96 BP</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val color-purple">0.00%</div>
        <div class="kpi-label">k6 Stress Failure</div>
        <div class="kpi-sub">513 Requests @ 30 Peak VUs</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val color-amber">2.4K</div>
        <div class="kpi-label">Active Users</div>
        <div class="kpi-sub">36K Production Events (GA4)</div>
      </div>
    </div>

    <div class="markdown-body">
      ${htmlContent}
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync('universe_report.html', styledHtml);
fs.writeFileSync('universe_usage_safety_report.html', styledHtml);
console.log('Successfully generated universe_report.html and universe_usage_safety_report.html');
