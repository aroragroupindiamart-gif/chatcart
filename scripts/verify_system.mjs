#!/usr/bin/env node
import { performance } from "perf_hooks";

const target = process.argv[2] || "https://chatcart.in";
console.log(`\x1b[36m[Verification Agent] Testing target: ${target}\x1b[0m\n`);

async function assertUrl(url, options = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const duration = performance.now() - start;
    
    if (!res.ok) {
      throw new Error(`HTTP Status ${res.status}`);
    }
    
    return {
      status: res.status,
      contentType: res.headers.get("content-type"),
      text: async () => await res.text(),
      json: async () => await res.json(),
      duration,
    };
  } catch (err) {
    throw new Error(`Failed to fetch ${url}: ${err.message}`);
  }
}

async function runTests() {
  let failed = false;

  // 1. API Healthz
  try {
    console.log("👉 Test 1: Checking API health...");
    const check = await assertUrl(`${target}/api/healthz`);
    const data = await check.json();
    if (data.status !== "ok") {
      throw new Error(`Expected healthz status "ok", got "${data.status}"`);
    }
    console.log(`   ✅ API Healthz responds OK (${Math.round(check.duration)}ms)`);
  } catch (err) {
    console.error(`   ❌ Test 1 Failed: ${err.message}`);
    failed = true;
  }

  // 2. Homepage Loading
  try {
    console.log("👉 Test 2: Checking homepage rendering...");
    const check = await assertUrl(target);
    const html = await check.text();
    if (!html.includes("The catalog")) {
      throw new Error("Homepage HTML does not contain key marketing headers");
    }
    console.log(`   ✅ Homepage loaded successfully (${Math.round(check.duration)}ms)`);
  } catch (err) {
    console.error(`   ❌ Test 2 Failed: ${err.message}`);
    failed = true;
  }

  // 3. Storefront Dynamic Metadata
  try {
    console.log("👉 Test 3: Checking storefront dynamic metadata injection...");
    const check = await assertUrl(`${target}/store/psejewels`);
    const html = await check.text();
    
    if (!html.includes("<title>Pse Jewels")) {
      throw new Error("Storefront page does not render seller-specific custom meta title");
    }
    console.log(`   ✅ Storefront metadata injected successfully (${Math.round(check.duration)}ms)`);
  } catch (err) {
    console.error(`   ❌ Test 3 Failed: ${err.message}`);
    failed = true;
  }

  // 4. Storefront Assets Checks
  try {
    console.log("👉 Test 4: Checking storefront assets loading...");
    const checkStore = await assertUrl(`${target}/store/psejewels`);
    const html = await checkStore.text();
    
    const scriptMatch = html.match(/src="(\/store\/assets\/index-[^"]+\.js)"/);
    if (!scriptMatch) {
      throw new Error("Could not locate storefront bundle JS script tag in HTML output");
    }
    
    const assetUrl = `${target}${scriptMatch[1]}`;
    console.log(`   Found JS bundle: ${scriptMatch[1]}`);
    const checkAsset = await assertUrl(assetUrl);
    
    if (!checkAsset.contentType || !checkAsset.contentType.includes("javascript")) {
      throw new Error(`Expected JavaScript Content-Type, got "${checkAsset.contentType}"`);
    }
    console.log(`   ✅ Storefront JS bundle loaded successfully (${Math.round(checkAsset.duration)}ms)`);
  } catch (err) {
    console.error(`   ❌ Test 4 Failed: ${err.message}`);
    failed = true;
  }

  // 5. Image Server Performance
  try {
    console.log("👉 Test 5: Checking uploaded images loading speed...");
    const imageId = "08c3f28b-ab65-43c5-8f1f-7530ee028d83";
    const imageUrl = `${target}/api/public/img/uploads/${imageId}`;
    const check = await assertUrl(imageUrl);
    
    if (!check.contentType || !check.contentType.startsWith("image/")) {
      throw new Error(`Expected image Content-Type, got "${check.contentType}"`);
    }
    
    const maxLatency = 1000;
    if (check.duration > maxLatency) {
      console.warn(`   ⚠️ Warning: Image load latency is high (${Math.round(check.duration)}ms)`);
    } else {
      console.log(`   ✅ Image loaded quickly (${Math.round(check.duration)}ms)`);
    }
  } catch (err) {
    console.error(`   ❌ Test 5 Failed: ${err.message}`);
    failed = true;
  }

  console.log("\n------------------------------------------------");
  if (failed) {
    console.error("\x1b[31m[Verification Agent] SYSTEM VERIFICATION FAILED! Please inspect the logs above.\x1b[0m");
    process.exit(1);
  } else {
    console.log("\x1b[32m[Verification Agent] ALL TESTS PASSED! System is completely healthy.\x1b[0m");
    process.exit(0);
  }
}

runTests();
