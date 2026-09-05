const fs = require('fs');

const md = fs.readFileSync('universe_report.md', 'utf-8');
const escapedMd = md.replace(/`/g, '\\`').replace(/\$/g, '\\$');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UniVerse Final Architecture Report</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css">
  <style>
    body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
    }
    @media (max-width: 767px) {
      body {
        padding: 15px;
      }
    }
    @media print {
        body {
            padding: 0;
            max-width: 100%;
        }
        .no-print {
            display: none !important;
        }
    }
    .loading {
        text-align: center;
        font-size: 20px;
        margin-top: 50px;
        color: #666;
    }
    .logo-container {
        margin-bottom: 24px;
        text-align: center;
    }
  </style>
</head>
<body class="markdown-body">
  <div class="logo-container">
    <img src="frontend/public/helmet-guy.png" alt="UniVerse Logo" style="max-height: 160px; margin: 0 auto; display: block;" onerror="this.outerHTML='<h1 style=\\'font-size: 44px; font-weight: 900; letter-spacing: 5px; color: #111; margin: 0; text-transform: uppercase;\\'>UNIVERSE</h1>'">
  </div>
  <div id="content" class="loading">Generating Report... Please wait.</div>
  
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script>
    const rawMarkdown = \`${escapedMd}\`;
    document.getElementById('content').innerHTML = marked.parse(rawMarkdown);
    document.getElementById('content').classList.remove('loading');
    
    // Auto-open print dialog to save as PDF
    setTimeout(() => {
        window.print();
    }, 800);
  </script>
</body>
</html>`;

fs.writeFileSync('universe_report.html', html);
console.log('HTML generated successfully!');
