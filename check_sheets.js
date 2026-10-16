import fs from 'fs';

async function check() {
  try {
    const res = await fetch('https://docs.google.com/spreadsheets/d/1iRRkVS5mc9BfuKvEIsWN6l946zE7HKMEmmun0iIdXFs/htmlview');
    const html = await res.text();
    fs.writeFileSync('sheet_htmlview.html', html);
    
    // Look for sheet tabs
    const buttonMatches = [...html.matchAll(/id="sheet-button-([0-9]+)"[^>]*>([\s\S]*?)<\/li>/gi)];
    console.log('Button matches length:', buttonMatches.length);
    buttonMatches.forEach(m => {
      const name = m[2].replace(/<[^>]+>/g, '').trim();
      console.log(`Sheet: "${name}" -> gid: ${m[1]}`);
    });

    // Look for other patterns like item id
    const items = [...html.matchAll(/\{\s*name:\s*"([^"]+)",\s*pageUrl:[^}]+gid=([0-9]+)/g)];
    if (items.length > 0) {
      console.log('JSON matches:');
      items.forEach(m => console.log(`- ${m[1]} (gid: ${m[2]})`));
    }
  } catch (err) {
    console.error(err);
  }
}

check();
