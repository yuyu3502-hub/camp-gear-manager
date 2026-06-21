#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

node --check app.js

node <<'NODE'
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const readme = fs.readFileSync("README.md", "utf8");

const required = [
  [html, "最初は保管場所・用品・セットが0件の状態から始まります。"],
  [html, "全データを空にする"],
  [readme, "最初は保管場所・用品・セットが0件の状態から始まります。"],
  [app, "containers: []"],
  [app, "items: []"],
  [app, "presets: []"],
];

const forbidden = [
  [html, "全データをサンプルに戻す"],
  [html, "最初から入っている"],
  [readme, "最初から入っている"],
  [app, "サンプル表示に戻しました"],
];

for (const [source, text] of required) {
  if (!source.includes(text)) {
    throw new Error(`必要な文言・設定が見つかりません: ${text}`);
  }
}

for (const [source, text] of forbidden) {
  if (source.includes(text)) {
    throw new Error(`古い文言が残っています: ${text}`);
  }
}

console.log("verify ok");
NODE
