import { readFileSync, writeFileSync } from "node:fs";

const indexPath = "dist/index.html";
const favicon = '<link rel="icon" href="/obradocs/favicon.ico" />';
const metadata = `${favicon}
    <link rel="apple-touch-icon" sizes="180x180" href="/obradocs/apple-touch-icon-v2.png" />
    <link rel="manifest" href="/obradocs/manifest.webmanifest" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Obradocs" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="#0C5BAA" />`;
const splashStyles = `<style id="obradocs-splash-styles">
      #obradocs-splash {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: #fff;
        background: #0C5BAA;
        transition: opacity 220ms ease;
      }
      #obradocs-splash img { width: 132px; height: 132px; }
      #obradocs-splash strong { font: 700 32px/1.2 Arial, sans-serif; }
      #obradocs-splash span { font: 400 16px/1.4 Arial, sans-serif; opacity: .88; }
      #obradocs-splash.obradocs-splash--hidden { opacity: 0; pointer-events: none; }
      @media (prefers-reduced-motion: reduce) {
        #obradocs-splash { transition: none; }
      }
    </style>`;
const splashMarkup = `<div id="obradocs-splash" role="status" aria-label="Abrindo o Obradocs">
      <img src="pwa-icon-512-v2.png" alt="" width="132" height="132" />
      <strong>Obradocs</strong>
      <span>Documentos de obra, organizados.</span>
    </div>`;
const splashScript = `<script>
    (() => {
      const root = document.getElementById("root");
      const splash = document.getElementById("obradocs-splash");
      if (!root || !splash) return;

      let removed = false;
      const removeSplash = () => {
        if (removed) return;
        removed = true;
        splash.classList.add("obradocs-splash--hidden");
        window.setTimeout(() => splash.remove(), 240);
      };
      const observer = new MutationObserver(() => {
        if (root.childElementCount > 0) {
          observer.disconnect();
          removeSplash();
        }
      });

      observer.observe(root, { childList: true });
      if (root.childElementCount > 0) removeSplash();
      window.setTimeout(removeSplash, 8000);
    })();
  </script>`;

const html = readFileSync(indexPath, "utf8");

if (!html.includes(favicon)) {
  throw new Error(`Favicon marker not found in ${indexPath}`);
}

writeFileSync(
  indexPath,
  html
    .replace(favicon, `${metadata}\n    ${splashStyles}`)
    .replace("<body>", `<body>\n    ${splashMarkup}`)
    .replace("</body>", `${splashScript}\n</body>`),
);
