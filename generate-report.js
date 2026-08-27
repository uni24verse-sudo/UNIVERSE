const fs = require('fs');
const { execSync } = require('child_process');

try {
  require.resolve('marked');
} catch (e) {
  console.log('Installing marked for markdown conversion...');
  execSync('npm install marked', { stdio: 'inherit' });
}

const { marked } = require('marked');

const markdownPath = 'universe_report.md';
let markdown = '';
try {
    markdown = fs.readFileSync(markdownPath, 'utf-8');
} catch (err) {
    console.error(`Could not read ${markdownPath}. Please make sure the file exists.`);
    process.exit(1);
}

const htmlContent = marked.parse(markdown);

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UniVerse Architecture Report</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css">
  <style>
    body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
      font-family: -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
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
    }
  </style>
</head>
<body class="markdown-body">
  ${htmlContent}
  <script>
    // Automatically open the print dialog when the file is opened
    window.onload = () => {
        setTimeout(() => {
            window.print();
        }, 500);
    };
  </script>
</body>
</html>
`;

fs.writeFileSync('universe_report.html', html);
console.log('Successfully created universe_report.html');
