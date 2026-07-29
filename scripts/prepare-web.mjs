import { readFileSync, writeFileSync } from "node:fs";

const indexPath = "dist/index.html";
const favicon = '<link rel="icon" href="/obradocs/favicon.ico" />';
const metadata = `${favicon}
    <link rel="apple-touch-icon" sizes="180x180" href="/obradocs/apple-touch-icon.png" />
    <link rel="manifest" href="/obradocs/manifest.webmanifest" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Obradocs" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="#0C5BAA" />`;

const html = readFileSync(indexPath, "utf8");

if (!html.includes(favicon)) {
  throw new Error(`Favicon marker not found in ${indexPath}`);
}

writeFileSync(indexPath, html.replace(favicon, metadata));
