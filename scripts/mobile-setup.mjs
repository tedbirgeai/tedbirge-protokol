#!/usr/bin/env node
/**
 * TEDBİRGE — ANAHTAR TESLİM MOBİL KURULUM (iOS + Android)
 * ------------------------------------------------------------------
 * Tek komut: `npm run mobile:setup`
 *
 * Yaptıkları (hepsi tekrar çalıştırılabilir / idempotent):
 *  1. Web derlemesi (dist/client)
 *  2. iOS ve Android platform klasörlerini ekler (yoksa)
 *  3. Rehber/kamera/mikrofon/bildirim izin metinlerini Info.plist ve
 *     AndroidManifest.xml içine kendiliğinden yazar
 *  4. Uygulama ikonu ve açılış ekranını üretir (@capacitor/assets varsa)
 *  5. `npx cap sync` ile web katmanını cihaz projesine kopyalar
 *
 * Not: iOS için macOS + Xcode, Android için Android Studio gerekir.
 * Eksikse o platform sessizce atlanır, diğeri kurulmaya devam eder.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { platform } from "node:os";

const run = (cmd, opts = {}) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
};
const tryRun = (cmd) => {
  try {
    run(cmd);
    return true;
  } catch {
    console.warn(`! atlandı: ${cmd}`);
    return false;
  }
};

const IOS_PERMS = [
  [
    "NSContactsUsageDescription",
    "Tanıdıklarınızı Tedbirge ağında bulmak için rehberiniz yalnızca bu cihazda okunur. Numaralarınız cihazdan çıkmaz.",
  ],
  ["NSCameraUsageDescription", "Görüntülü görüşme için kamera erişimi gerekir."],
  ["NSMicrophoneUsageDescription", "Sesli görüşme için mikrofon erişimi gerekir."],
  [
    "NSLocationWhenInUseUsageDescription",
    "Acil durum bildiriminde konumunuzu paylaşabilmek için gerekir.",
  ],
];

const ANDROID_PERMS = [
  "android.permission.READ_CONTACTS",
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.INTERNET",
  "android.permission.ACCESS_NETWORK_STATE",
];

function patchInfoPlist() {
  const path = "ios/App/App/Info.plist";
  if (!existsSync(path)) return;
  let xml = readFileSync(path, "utf8");
  let changed = false;
  for (const [key, value] of IOS_PERMS) {
    if (xml.includes(`<key>${key}</key>`)) continue;
    xml = xml.replace("</dict>\n</plist>", `\t<key>${key}</key>\n\t<string>${value}</string>\n</dict>\n</plist>`);
    changed = true;
  }
  // Arka planda sessiz push ile uyandırma
  if (!xml.includes("<key>UIBackgroundModes</key>")) {
    xml = xml.replace(
      "</dict>\n</plist>",
      "\t<key>UIBackgroundModes</key>\n\t<array>\n\t\t<string>remote-notification</string>\n\t\t<string>voip</string>\n\t</array>\n</dict>\n</plist>",
    );
    changed = true;
  }
  if (changed) {
    writeFileSync(path, xml);
    console.log("✓ iOS izin metinleri Info.plist içine yazıldı");
  } else {
    console.log("✓ iOS izin metinleri zaten yerinde");
  }
}

function patchAndroidManifest() {
  const path = "android/app/src/main/AndroidManifest.xml";
  if (!existsSync(path)) return;
  let xml = readFileSync(path, "utf8");
  const missing = ANDROID_PERMS.filter((p) => !xml.includes(`"${p}"`));
  if (missing.length === 0) {
    console.log("✓ Android izinleri zaten yerinde");
    return;
  }
  const block = missing.map((p) => `    <uses-permission android:name="${p}" />`).join("\n");
  xml = xml.replace("</manifest>", `${block}\n</manifest>`);
  writeFileSync(path, xml);
  console.log(`✓ Android izinleri eklendi: ${missing.length}`);
}

function prepareAssets() {
  mkdirSync("resources", { recursive: true });
  if (!existsSync("resources/icon.png") && existsSync("public/icon-512.png")) {
    copyFileSync("public/icon-512.png", "resources/icon.png");
  }
  if (!existsSync("resources/splash.png") && existsSync("resources/icon.png")) {
    copyFileSync("resources/icon.png", "resources/splash.png");
  }
}

console.log("Tedbirge — mobil kabuk kurulumu başlıyor");

run("npm run build");

if (!existsSync("android")) tryRun("npx cap add android");
if (platform() === "darwin") {
  if (!existsSync("ios")) tryRun("npx cap add ios");
} else if (!existsSync("ios")) {
  console.warn("! iOS platformu yalnızca macOS + Xcode üzerinde eklenebilir — atlandı");
}

patchInfoPlist();
patchAndroidManifest();
prepareAssets();

tryRun('npx capacitor-assets generate --iconBackgroundColor "#0b141a" --splashBackgroundColor "#0b141a"');
tryRun("npx cap sync");

console.log(`
✓ Kurulum tamam.

Sıradaki tek adım (mağaza derlemesi):
  npm run mobile:android   # Android Studio > Build > Signed Bundle (.aab)
  npm run mobile:ios       # Xcode > Archive > App Store Connect

Mağaza sürümünde uygulama dist/client içindeki dosyalarla çalışır
(CAP_LIVE_URL tanımlı değilse canlı siteye bağlanmaz).
Rehber izni ilk açılışta istenir; sonrasında tüm kişiler arka planda
kendiliğinden eşleşir.
`);
