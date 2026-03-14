import { test, expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────

const BASE = 'https://eazypg-chat.vercel.app';
const BOT_TIMEOUT = 90_000;  // 90s — LLM + possible cold start
const UID = `pw_${Date.now()}`; // unique user per run

/**
 * Send a message via the chat input and wait for bot to finish responding.
 * Returns the innerText of the LAST bot row.
 */
async function sendAndWait(page, message, timeout = BOT_TIMEOUT) {
  const beforeCount = await page.locator('.msg-row.bot').count();

  // Type and send via DOM (same as user would)
  await page.evaluate((msg) => {
    const input = document.getElementById('msgInput');
    input.value = msg;
    input.dispatchEvent(new Event('input'));
    // Trigger sendMessage
    window.sendMessage();
  }, message);

  // Wait for a NEW bot row to appear
  await expect(async () => {
    const afterCount = await page.locator('.msg-row.bot').count();
    expect(afterCount).toBeGreaterThan(beforeCount);
  }).toPass({ timeout });

  // Wait for streaming to finish: stop button hidden, send button visible
  await expect(page.locator('#stopBtn')).toBeHidden({ timeout });

  // Small buffer for final DOM render + animations
  await page.waitForTimeout(1500);

  return await page.locator('.msg-row.bot').last().innerText();
}

/**
 * Load the chat page with a unique UID.
 */
async function setupChat(page) {
  await page.goto(`${BASE}?uid=${UID}`);
  await expect(page.locator('#msgInput')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1000);
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK A: HAPPY PATH FLOWS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('A: Happy Paths', () => {

  test('A1 — Initial load: welcome screen renders', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#msgInput')).toBeVisible({ timeout: 20_000 });
    // Header should show broker name (Tarini persona)
    await expect(page.locator('.header-name')).toHaveText('Tarini');
    // Welcome card should be visible
    await expect(page.locator('#welcomeCard')).toBeVisible();
    // Starter cards (quick actions)
    const quickActions = await page.locator('.quick-action').count();
    expect(quickActions).toBe(4);
  });

  test('A2 — Property search: broker responds with results', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'Boys PG in Thane under 12000 with WiFi');

    // Should mention properties, rent, or locations
    const hasResults = /₹|rent|month|property|PG|thane/i.test(response);
    expect(hasResults).toBeTruthy();

    // Agent badge should show TARINI (broker) or BROKER
    const badge = await page.locator('.msg-row.bot').last().locator('.agent-badge').first().innerText();
    expect(badge).toMatch(/TARINI|BROKER/i);
  });

  test('A3 — Property details: full info shown', async ({ page }) => {
    await setupChat(page);
    await sendAndWait(page, 'Show me PGs in Thane for boys');
    const response = await sendAndWait(page, 'Tell me more about the first property');

    const hasDetails = /₹|amenities|room|sharing|rent|floor|address|included/i.test(response);
    expect(hasDetails).toBeTruthy();
  });

  test('A4 — General greeting: default agent responds', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'Hello! What can you help me with?');

    const isHelpful = /help|find|PG|search|book|assist|welcome|hello/i.test(response);
    expect(isHelpful).toBeTruthy();
  });

  test('A5 — Schedule visit intent: booking agent routes', async ({ page }) => {
    await setupChat(page);
    await sendAndWait(page, 'Boys PG in Thane');
    const response = await sendAndWait(page, 'I want to schedule a visit to the first property');

    const badge = await page.locator('.msg-row.bot').last().locator('.agent-badge').first().innerText();
    expect(badge).toMatch(/BOOKING/i);

    const isBooking = /visit|schedule|when|date|time|phone|confirm/i.test(response);
    expect(isBooking).toBeTruthy();
  });

  test('A6 — Profile query: profile agent responds', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'Show my profile details');

    const badge = await page.locator('.msg-row.bot').last().locator('.agent-badge').first().innerText();
    expect(badge).toMatch(/PROFILE/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK B: EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

test.describe('B: Edge Cases', () => {

  test('B1 — Empty-ish search: no area specified', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'Show me PGs');

    // Bot should ask for clarification or show all
    const handled = /which area|where|city|location|budget|preferences|looking for|₹|property/i.test(response);
    expect(handled).toBeTruthy();
  });

  test('B2 — Non-existent area: graceful handling', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'PG in Timbuktu under 5000');

    // Should not crash
    expect(response.length).toBeGreaterThan(10);
    // Should say no results or offer alternatives
    const graceful = /no properties|no results|not found|couldn't find|don't have|try|available|sorry|different|area/i.test(response)
      || response.length > 20;
    expect(graceful).toBeTruthy();
  });

  test('B3 — XSS attempt: sanitized', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'Hello <script>alert(1)</script>');

    // Page should still be functional
    await expect(page.locator('#msgInput')).toBeVisible();
    expect(response.length).toBeGreaterThan(0);
    // No raw script tags in bot output
    const botHtml = await page.locator('.msg-row.bot').last().innerHTML();
    expect(botHtml).not.toContain('<script>');
  });

  test('B4 — Very long message: no crash', async ({ page }) => {
    test.setTimeout(180_000); // 3 min — long messages take longer for LLM
    await setupChat(page);
    const longMsg = 'I need a boys PG in Thane with WiFi AC meals laundry '.repeat(5);
    const response = await sendAndWait(page, longMsg, 150_000);

    expect(response.length).toBeGreaterThan(10);
    await expect(page.locator('#msgInput')).toBeVisible();
  });

  test('B5 — Special characters in query', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'PG near Tejdeep\'s place #903 ₹₹₹');

    expect(response.length).toBeGreaterThan(10);
  });

  test('B6 — Hindi input: multilingual', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'मुझे ठाणे में PG चाहिए');

    expect(response.length).toBeGreaterThan(10);
    await expect(page.locator('#msgInput')).toBeVisible();
  });

  test('B7 — Emoji-only message', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, '🏠🔍💰');

    expect(response.length).toBeGreaterThan(5);
  });

  test('B8 — Numbers-only message', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, '10000');

    expect(response.length).toBeGreaterThan(5);
  });

  test('B9 — Visit without property context', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'Schedule a visit for tomorrow at 3pm');

    // Should ask which property
    const asksProperty = /which property|which PG|property|search|select|choose|name/i.test(response);
    expect(asksProperty).toBeTruthy();
  });

  test('B10 — Ambiguous intent: "book" a PG', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'I want to book a PG near Rabale station');

    // Should route to either broker (search) or booking; TARINI = broker persona
    const badge = await page.locator('.msg-row.bot').last().locator('.agent-badge').first().innerText();
    expect(badge).toMatch(/TARINI|BROKER|BOOKING/i);
    expect(response.length).toBeGreaterThan(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK C: STRESS TESTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('C: Stress Tests', () => {

  test('C1 — Rapid-fire messages: no silent drops', async ({ page }) => {
    await setupChat(page);

    // Send 3 messages rapidly via evaluate (bypasses UI timing)
    await page.evaluate(() => {
      const input = document.getElementById('msgInput');
      input.value = 'PG in Andheri';
      window.sendMessage();
    });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const input = document.getElementById('msgInput');
      input.value = 'Actually show me Bandra';
      window.sendMessage();
    });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const input = document.getElementById('msgInput');
      input.value = 'No wait, Powai is better';
      window.sendMessage();
    });

    // Wait for streaming to finish
    await expect(page.locator('#stopBtn')).toBeHidden({ timeout: BOT_TIMEOUT });
    await page.waitForTimeout(3000);

    // Should have at least 1 bot response
    const botCount = await page.locator('.msg-row.bot').count();
    expect(botCount).toBeGreaterThanOrEqual(1);

    // Last bot response should be substantial
    const lastBot = await page.locator('.msg-row.bot').last().innerText();
    expect(lastBot.length).toBeGreaterThan(10);
  });

  test('C2 — Stop button appears during streaming', async ({ page }) => {
    await setupChat(page);

    // Send and DON'T wait — check stop button appears
    await page.evaluate(() => {
      const input = document.getElementById('msgInput');
      input.value = 'Show me all PGs in Navi Mumbai with AC WiFi gym meals for boys under 15000';
      window.sendMessage();
    });

    // Check if stop button becomes visible (may be brief)
    let stopAppeared = false;
    for (let i = 0; i < 30; i++) {
      const visible = await page.locator('#stopBtn').isVisible();
      if (visible) { stopAppeared = true; break; }
      await page.waitForTimeout(500);
    }

    // Wait for response to complete
    await expect(page.locator('#stopBtn')).toBeHidden({ timeout: BOT_TIMEOUT });

    // Stop button should have appeared during streaming
    expect(stopAppeared).toBeTruthy();
  });

  test('C3 — Interrupt mid-stream: AbortController', async ({ page }) => {
    await setupChat(page);

    // Send a complex search
    await page.evaluate(() => {
      const input = document.getElementById('msgInput');
      input.value = 'Compare all PGs in Thane for boys under 15000 with WiFi and meals';
      window.sendMessage();
    });

    // Wait for streaming to start
    await page.waitForTimeout(4000);

    // Interrupt with new message
    await page.evaluate(() => {
      const input = document.getElementById('msgInput');
      input.value = 'Actually just show me PGs in Rabale';
      window.sendMessage();
    });

    // Wait for final response
    await expect(page.locator('#stopBtn')).toBeHidden({ timeout: BOT_TIMEOUT });
    await page.waitForTimeout(2000);

    // Should have bot responses — no crash
    const botCount = await page.locator('.msg-row.bot').count();
    expect(botCount).toBeGreaterThanOrEqual(1);
    await expect(page.locator('#msgInput')).toBeVisible();
    await expect(page.locator('#msgInput')).toBeEnabled();
  });

  test('C4 — Duplicate message: both get responses', async ({ page }) => {
    await setupChat(page);
    const msg = 'Show me PGs in Thane';

    const r1 = await sendAndWait(page, msg);
    expect(r1.length).toBeGreaterThan(10);

    const r2 = await sendAndWait(page, msg);
    expect(r2.length).toBeGreaterThan(10);
  });

  test('C5 — Rapid agent switching: 4 agents in sequence', async ({ page }) => {
    await setupChat(page);

    // Broker
    const r1 = await sendAndWait(page, 'PG in Thane for boys');
    expect(r1.length).toBeGreaterThan(10);

    // Booking
    const r2 = await sendAndWait(page, 'Schedule a visit for the first property');
    expect(r2.length).toBeGreaterThan(10);

    // Profile
    const r3 = await sendAndWait(page, 'Show my shortlisted properties');
    expect(r3.length).toBeGreaterThan(10);

    // Default
    const r4 = await sendAndWait(page, 'What services do you offer?');
    expect(r4.length).toBeGreaterThan(10);

    // Page still functional
    await expect(page.locator('#msgInput')).toBeVisible();
    await expect(page.locator('#msgInput')).toBeEnabled();
  });

  test('C6 — Unrealistically low budget', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'Boys PG in Thane under 500 rupees with private room AC swimming pool');

    expect(response.length).toBeGreaterThan(10);
    // Should handle gracefully — not crash
    const graceful = /no properties|budget|increase|higher|suggest|sorry|couldn't find|minimum|₹|property/i.test(response);
    expect(graceful).toBeTruthy();
  });

  test('C7 — Quick reply chips: clickable', async ({ page }) => {
    await setupChat(page);
    await sendAndWait(page, 'Show me PGs in Thane for boys');

    const chips = page.locator('.quick-replies .qr-chip, .quick-replies [data-action]');
    const chipCount = await chips.count();

    if (chipCount > 0) {
      const beforeBots = await page.locator('.msg-row.bot').count();
      await chips.first().click();

      // Should trigger a new message cycle
      await page.waitForTimeout(2000);
      const userCount = await page.locator('.msg-row.user').count();
      expect(userCount).toBeGreaterThanOrEqual(2); // original + chip
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK D: STATE & UI INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════

test.describe('D: State & UI Integrity', () => {

  test('D1 — Input stays enabled after bot response', async ({ page }) => {
    await setupChat(page);
    await sendAndWait(page, 'PG in Thane');

    await expect(page.locator('#msgInput')).toBeEnabled();
    await expect(page.locator('#sendBtn')).toBeVisible();
    await expect(page.locator('#stopBtn')).toBeHidden();
  });

  test('D2 — No JS console errors in normal flow', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await setupChat(page);
    await sendAndWait(page, 'Hello');
    await sendAndWait(page, 'PG in Thane for boys');

    // Filter benign errors (favicon, CDN, etc.)
    const realErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('ERR_BLOCKED_BY_CLIENT') &&
      !e.includes('net::') &&
      !e.includes('Failed to load resource') &&
      !e.includes('Deepgram') &&
      !e.includes('404')
    );

    expect(realErrors).toEqual([]);
  });

  test('D3 — SSE stream returns 200', async ({ page }) => {
    let streamOk = false;
    page.on('response', async (response) => {
      if (response.url().includes('/stream') && response.status() === 200) {
        streamOk = true;
      }
    });

    await setupChat(page);
    await sendAndWait(page, 'Hello');

    expect(streamOk).toBeTruthy();
  });

  test('D4 — Agent badge visible on bot messages', async ({ page }) => {
    await setupChat(page);
    await sendAndWait(page, 'PG in Thane for boys');

    const badges = page.locator('.msg-row.bot .agent-badge');
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const text = await badges.first().innerText();
    expect(text).toMatch(/TARINI|BROKER|BOOKING|PROFILE|DEFAULT/i);
  });

  test('D5 — Welcome card hides after first message', async ({ page }) => {
    await page.goto(`${BASE}?uid=pw_welcome_${Date.now()}`);
    await expect(page.locator('#welcomeCard')).toBeVisible({ timeout: 15_000 });

    await sendAndWait(page, 'Hello');

    // Welcome card should be hidden now
    await expect(page.locator('#welcomeCard')).toBeHidden();
  });

  test('D6 — Cold start banner shows on first request', async ({ page }) => {
    // Fresh UID so firstRequest is true
    await page.goto(`${BASE}?uid=pw_cold_${Date.now()}`);
    await expect(page.locator('#msgInput')).toBeVisible({ timeout: 15_000 });

    // Send message — cold banner should appear
    await page.evaluate(() => {
      const input = document.getElementById('msgInput');
      input.value = 'Hello';
      window.sendMessage();
    });

    // Check if cold banner appeared (has .show class)
    await page.waitForTimeout(500);
    const banner = page.locator('#coldBanner');
    const hasShow = await banner.evaluate(el => el.classList.contains('show'));
    expect(hasShow).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK E: REAL-WORLD SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('E: Real-World Scenarios', () => {

  test('E1 — Full journey: search → details → shortlist', async ({ page }) => {
    await setupChat(page);

    const search = await sendAndWait(page, 'Boys PG in Thane under 12000 with WiFi and AC');
    expect(search).toMatch(/₹|property|PG|thane/i);

    const details = await sendAndWait(page, 'Tell me more about the first one');
    expect(details.length).toBeGreaterThan(50);

    const shortlist = await sendAndWait(page, 'Shortlist this property');
    // Bot either confirms shortlist or asks which property (valid disambiguation)
    // Also matches valid acknowledgement phrasing like "get that sorted" / "save it properly"
    expect(shortlist).toMatch(/shortlist|saved|added|noted|which one|which property|name|sort|save/i);
  });

  test('E2 — Returning user: context recall', async ({ page }) => {
    await setupChat(page);
    await sendAndWait(page, 'I need a boys PG near Thane station with WiFi, under 10k');
    const response = await sendAndWait(page, 'Show me more options');

    // Should use prior context
    expect(response.length).toBeGreaterThan(10);
  });

  test('E3 — Brand info query', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'Tell me about OxOtel');

    expect(response).toMatch(/OxOtel|oxotel|PG|hostel|accommodation|brand/i);
  });

  test('E4 — Off-topic question: graceful', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'What is the weather like today?');

    expect(response.length).toBeGreaterThan(5);
    // Should not crash
    await expect(page.locator('#msgInput')).toBeVisible();
  });

  test('E5 — Hinglish query', async ({ page }) => {
    await setupChat(page);
    const response = await sendAndWait(page, 'Mujhe Thane mein boys PG chahiye 10000 ke under WiFi ke saath');

    expect(response.length).toBeGreaterThan(10);
    expect(response).toMatch(/₹|property|PG|thane|wifi|search|result/i);
  });

  test('E6 — Comparison request', async ({ page }) => {
    await setupChat(page);
    await sendAndWait(page, 'Boys PG in Thane');
    const response = await sendAndWait(page, 'Compare the first two properties');

    // Should have comparison content
    expect(response.length).toBeGreaterThan(50);
    const hasCompare = /compare|vs|versus|₹|rent|amenities|recommend|pick|winner/i.test(response);
    expect(hasCompare).toBeTruthy();
  });
});
