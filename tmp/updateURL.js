const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
}

const files = walkSync(path.resolve('d:/New folder/frontend/src')).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace standard string prefixes
  if (content.includes("'http://localhost:5000")) {
    content = content.replace(/'http:\/\/localhost:5000/g, "(import.meta.env.VITE_API_URL || 'http://localhost:5000') + '");
    changed = true;
  }
  
  // Replace template literals prefixes
  if (content.includes("`http://localhost:5000")) {
    content = content.replace(/`http:\/\/localhost:5000/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}");
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
    console.log("Updated: " + file);
  }
});

console.log("Environment injection complete!");
