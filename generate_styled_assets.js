const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const workspaceDir = 'D:\\PetCircle';
const scratchDir = 'C:\\Users\\alexb\\.gemini\\antigravity\\brain\\e5f926c4-0820-44d8-a209-2053f025b64d\\scratch';
const screensHtmlDir = path.join(scratchDir, 'ui_screens_html');
const screensPngDir = path.join(scratchDir, 'ui_screens_png');
const slidesHtmlDir = path.join(scratchDir, 'slides_html');
const storeDir = path.join(workspaceDir, 'assets', 'store');
const screenshotsDir = path.join(storeDir, 'screenshots');
const styledDir = path.join(screenshotsDir, 'Styled App Previews');

fs.mkdirSync(screensHtmlDir, { recursive: true });
fs.mkdirSync(screensPngDir, { recursive: true });
fs.mkdirSync(slidesHtmlDir, { recursive: true });
fs.mkdirSync(storeDir, { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(styledDir, { recursive: true });

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function fetchAsDataUrl(url, mime) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Referer': 'https://theapplaunchpad.com/',
        'Origin': 'https://theapplaunchpad.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        console.log(`Fetched ${path.basename(url.split('?')[0])} (${Math.round(buf.length / 1024)} KB)`);
        resolve(`data:${mime};base64,${buf.toString('base64')}`);
      });
    }).on('error', reject);
  });
}

function localToDataUrl(relPath, mime = 'image/jpeg') {
  const full = path.join(workspaceDir, relPath);
  if (fs.existsSync(full)) {
    return `data:${mime};base64,` + fs.readFileSync(full).toString('base64');
  }
  return '';
}

const miloB64 = localToDataUrl('assets/milo.jpg', 'image/jpeg');
const iconB64 = localToDataUrl('assets/icon.png', 'image/png');

// PetCircle high-fidelity CSS matching theme.ts
const baseCss = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Text:ital@0;1&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1170px;
    height: 2532px;
    background: #F7F6F2;
    color: #202923;
    font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow: hidden;
    position: relative;
  }
  h1, h2, .font-serif {
    font-family: 'DM Serif Text', serif;
  }
  .status-bar {
    height: 130px;
    padding: 44px 80px 0 84px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 40px;
    font-weight: 700;
    color: #202923;
  }
  .content {
    padding: 24px 56px 260px 56px;
  }
  .card {
    background: #FFFFFF;
    border-radius: 40px;
    padding: 44px;
    border: 2px solid #E3E7DF;
    box-shadow: 0 12px 32px rgba(20, 61, 49, 0.05);
    margin-bottom: 32px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 12px 26px;
    border-radius: 999px;
    font-size: 28px;
    font-weight: 700;
  }
  .pill-green { background: #E7F0E6; color: #143D31; }
  .pill-mint { background: #BBD0B9; color: #143D31; }
  .pill-peach { background: #F4E6D9; color: #A14431; }
  .pill-dark { background: #143D31; color: #FFFFFF; }
  .pill-yellow { background: #F8ECCC; color: #78350F; }
  .btn-primary {
    background: #143D31;
    color: #FFFFFF;
    border-radius: 32px;
    padding: 34px 44px;
    font-size: 36px;
    font-weight: 700;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    box-shadow: 0 12px 28px rgba(20, 61, 49, 0.25);
  }
  .tab-bar {
    position: absolute;
    bottom: 50px;
    left: 48px;
    right: 48px;
    height: 190px;
    background: rgba(255,255,255,0.98);
    border-radius: 80px;
    box-shadow: 0 20px 50px rgba(20, 61, 49, 0.12);
    border: 2px solid #E3E7DF;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0 20px;
  }
  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-size: 28px;
    font-weight: 600;
    color: #58645C;
  }
  .tab-item.active {
    color: #143D31;
    font-weight: 800;
  }
`;

// Build 6 high-fidelity PetCircle screens
const uiScreens = [
  // s0: Today / Care Dashboard
  `
  <div class="status-bar"><span>9:41</span><span>􀋒 􀙇 􀛨</span></div>
  <div class="content">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
      <div>
        <div style="font-size:28px; font-weight:700; color:#58645C; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">Sunday, 15 Nov</div>
        <h1 style="font-size:60px; font-weight:400; color:#143D31; letter-spacing:-0.5px;">PetCircle</h1>
      </div>
      <div style="display:flex; align-items:center; gap:16px; background:#FFFFFF; padding:12px 24px 12px 16px; border-radius:999px; border:2px solid #E3E7DF; box-shadow:0 6px 18px rgba(0,0,0,0.04);">
        <img src="${miloB64}" style="width:56px; height:56px; border-radius:50%; object-fit:cover;" />
        <span style="font-size:30px; font-weight:700; color:#143D31;">Milo ▾</span>
      </div>
    </div>

    <!-- Status Banner -->
    <div style="background:#143D31; border-radius:36px; padding:36px 44px; color:#FFFFFF; margin-bottom:32px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <span style="width:18px; height:18px; border-radius:50%; background:#BBD0B9; display:inline-block;"></span>
          <span style="font-size:28px; font-weight:700; color:#BBD0B9; text-transform:uppercase; letter-spacing:1px;">All Care on Track</span>
        </div>
        <div style="font-size:36px; font-weight:600; color:#E7F0E6;">Last fed 2h ago by Sarah</div>
      </div>
      <span style="background:rgba(187,208,185,0.2); border:2px solid #BBD0B9; color:#BBD0B9; padding:12px 24px; border-radius:20px; font-size:26px; font-weight:700;">MILO</span>
    </div>

    <!-- Today Routines List -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h2 style="font-size:40px; color:#143D31;">Today's Routines</h2>
      <span style="font-size:26px; font-weight:700; color:#58645C;">3 / 4 Done</span>
    </div>

    <!-- Routine 1: Feed (Done) -->
    <div class="card" style="padding:32px 40px; margin-bottom:20px; border-left:12px solid #356249;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:20px;">
          <div style="width:60px; height:60px; border-radius:20px; background:#E7F0E6; color:#143D31; display:flex; align-items:center; justify-content:center; font-size:32px;">🥣</div>
          <div>
            <div style="font-size:34px; font-weight:700; color:#202923;">Morning Feed (200g Kibble)</div>
            <div style="font-size:26px; color:#58645C; margin-top:4px;">08:15 GMT · Completed by Sarah</div>
          </div>
        </div>
        <span class="pill pill-green">DONE ✓</span>
      </div>
    </div>

    <!-- Routine 2: Walk (Done) -->
    <div class="card" style="padding:32px 40px; margin-bottom:20px; border-left:12px solid #356249;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:20px;">
          <div style="width:60px; height:60px; border-radius:20px; background:#E7F0E6; color:#143D31; display:flex; align-items:center; justify-content:center; font-size:32px;">🦮</div>
          <div>
            <div style="font-size:34px; font-weight:700; color:#202923;">Morning Park Walk (45m)</div>
            <div style="font-size:26px; color:#58645C; margin-top:4px;">09:30 GMT · Completed by Alex</div>
          </div>
        </div>
        <span class="pill pill-green">DONE ✓</span>
      </div>
    </div>

    <!-- Routine 3: Afternoon Walk (Due Soon) -->
    <div class="card" style="padding:32px 40px; margin-bottom:20px; border-left:12px solid #F8ECCC;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:20px;">
          <div style="width:60px; height:60px; border-radius:20px; background:#F8ECCC; color:#78350F; display:flex; align-items:center; justify-content:center; font-size:32px;">⏰</div>
          <div>
            <div style="font-size:34px; font-weight:700; color:#202923;">Afternoon Walk & Exercise</div>
            <div style="font-size:26px; color:#58645C; margin-top:4px;">Scheduled for 14:00 (In 45 mins)</div>
          </div>
        </div>
        <span class="pill pill-yellow">DUE SOON</span>
      </div>
    </div>

    <div class="btn-primary" style="margin-top:16px;">
      <span>+ Quick Log Care (Feed, Walk, Meds)</span>
    </div>
  </div>

  <div class="tab-bar">
    <div class="tab-item active"><span style="font-size:46px;">􀋂</span><span>Today</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀌞</span><span>Care Log</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀈷</span><span>Health</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀉪</span><span>Circle</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀣌</span><span>Kit</span></div>
  </div>
  `,

  // s1: Care Log & Feed History
  `
  <div class="status-bar"><span>9:41</span><span>􀋒 􀙇 􀛨</span></div>
  <div class="content">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px;">
      <span style="font-size:40px; font-weight:700; color:#143D31;">‹ Milo's Timeline</span>
      <span class="pill pill-mint">LIVE SYNC</span>
    </div>
    <h1 style="font-size:52px; font-weight:400; color:#143D31; margin-bottom:8px;">Care Activity Feed</h1>
    <div style="font-size:30px; color:#58645C; margin-bottom:32px;">Every meal, walk & medication recorded</div>

    <!-- Filter chips -->
    <div style="display:flex; gap:16px; margin-bottom:28px; overflow:hidden;">
      <span class="pill pill-dark">All Care (24)</span>
      <span class="pill pill-green">Meals (8)</span>
      <span class="pill pill-green">Walks (10)</span>
      <span class="pill pill-green">Meds (6)</span>
    </div>

    <!-- Feed Item 1: Afternoon Walk -->
    <div class="card" style="padding:32px 36px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
        <div style="display:flex; gap:18px; align-items:center;">
          <div style="width:58px; height:58px; border-radius:18px; background:#E7F0E6; color:#143D31; display:flex; align-items:center; justify-content:center; font-size:30px;">🦮</div>
          <div>
            <div style="font-size:32px; font-weight:700; color:#202923;">Park & Woods Loop</div>
            <div style="font-size:24px; color:#58645C;">Logged by Dave (Walker)</div>
          </div>
        </div>
        <span style="font-size:24px; font-family:'JetBrains Mono',monospace; color:#58645C;">14:32 GMT</span>
      </div>
      <div style="background:#F7F6F2; padding:20px 24px; border-radius:20px; font-size:26px; color:#202923; line-height:1.4;">
        "Great energy today! Milo ran for 35 mins, met two labradors, drank water and was pee/poo normal."
      </div>
    </div>

    <!-- Feed Item 2: Medication -->
    <div class="card" style="padding:32px 36px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
        <div style="display:flex; gap:18px; align-items:center;">
          <div style="width:58px; height:58px; border-radius:18px; background:#F4E6D9; color:#A14431; display:flex; align-items:center; justify-content:center; font-size:30px;">💊</div>
          <div>
            <div style="font-size:32px; font-weight:700; color:#202923;">Apoquel Allergy Tablet (16mg)</div>
            <div style="font-size:24px; color:#58645C;">Logged by Sarah (Owner)</div>
          </div>
        </div>
        <span style="font-size:24px; font-family:'JetBrains Mono',monospace; color:#58645C;">12:15 GMT</span>
      </div>
      <div style="background:#F7F6F2; padding:20px 24px; border-radius:20px; font-size:26px; color:#202923;">
        Given with cheese slice after lunch. Next dose tomorrow 12:00.
      </div>
    </div>

    <!-- Feed Item 3: Morning Meal -->
    <div class="card" style="padding:32px 36px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
        <div style="display:flex; gap:18px; align-items:center;">
          <div style="width:58px; height:58px; border-radius:18px; background:#E7F0E6; color:#143D31; display:flex; align-items:center; justify-content:center; font-size:30px;">🥣</div>
          <div>
            <div style="font-size:32px; font-weight:700; color:#202923;">Salmon & Sweet Potato (200g)</div>
            <div style="font-size:24px; color:#58645C;">Logged by Sarah (Owner)</div>
          </div>
        </div>
        <span style="font-size:24px; font-family:'JetBrains Mono',monospace; color:#58645C;">08:15 GMT</span>
      </div>
      <div style="background:#F7F6F2; padding:20px 24px; border-radius:20px; font-size:26px; color:#202923;">
        Ate full portion immediately. Fresh bowl of water provided.
      </div>
    </div>
  </div>

  <div class="tab-bar">
    <div class="tab-item"><span style="font-size:46px;">􀋂</span><span>Today</span></div>
    <div class="tab-item active"><span style="font-size:46px;">􀌞</span><span>Care Log</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀈷</span><span>Health</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀉪</span><span>Circle</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀣌</span><span>Kit</span></div>
  </div>
  `,

  // s2: Health & Weight Tracking
  `
  <div class="status-bar"><span>9:41</span><span>􀋒 􀙇 􀛨</span></div>
  <div class="content">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px;">
      <span style="font-size:40px; font-weight:700; color:#143D31;">‹ Records</span>
      <span class="pill pill-green">VET VERIFIED</span>
    </div>
    <h1 style="font-size:52px; font-weight:400; color:#143D31; margin-bottom:8px;">Health & Weight</h1>
    <div style="font-size:30px; color:#58645C; margin-bottom:32px;">Clinical history, vaccines & symptoms</div>

    <!-- Weight Trend Card -->
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div>
          <div style="font-size:26px; font-weight:700; color:#58645C; text-transform:uppercase;">Current Weight</div>
          <div style="font-size:48px; font-weight:800; color:#143D31;">28.4 kg <span style="font-size:26px; color:#356249; font-weight:700;">▲ +0.2 kg</span></div>
        </div>
        <span class="pill pill-green">TARGET: 28.0 kg</span>
      </div>
      <!-- SVG Weight Chart -->
      <div style="height:180px; width:100%; margin-bottom:16px;">
        <svg viewBox="0 0 500 120" style="width:100%; height:100%;">
          <path d="M 30 80 Q 140 60 250 65 T 370 45 T 470 35" fill="none" stroke="#143D31" stroke-width="5" stroke-linecap="round" />
          <circle cx="30" cy="80" r="7" fill="#143D31" />
          <circle cx="250" cy="65" r="7" fill="#143D31" />
          <circle cx="470" cy="35" r="9" fill="#356249" />
          <text x="30" y="110" font-size="18" fill="#58645C">Sep</text>
          <text x="250" y="110" font-size="18" fill="#58645C">Oct</text>
          <text x="450" y="110" font-size="18" fill="#143D31" font-weight="bold">Nov</text>
        </svg>
      </div>
    </div>

    <!-- Vaccine Reminder Card -->
    <div class="card" style="padding:32px 36px; margin-bottom:20px; border-left:12px solid #F8ECCC;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-size:32px; font-weight:700; color:#202923;">💉 Kennel Cough & Booster</span>
        <span class="pill pill-yellow">IN 18 DAYS</span>
      </div>
      <div style="font-size:26px; color:#58645C;">
        Due: 03 Dec 2026 · Oakwood Animal Hospital · Appointment booked for 10:30
      </div>
    </div>

    <!-- Symptom Tracker -->
    <div class="card" style="padding:32px 36px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-size:32px; font-weight:700; color:#202923;">📋 Logged Observations</span>
        <span style="font-size:26px; color:#356249; font-weight:700;">+ New Symptom</span>
      </div>
      <div style="background:#F7F6F2; padding:20px 24px; border-radius:20px; font-size:26px; color:#202923; line-height:1.4;">
        "Mild right ear shaking after Sunday swim. Cleared with ear drops; resolved in 24 hours."
      </div>
    </div>
  </div>

  <div class="tab-bar">
    <div class="tab-item"><span style="font-size:46px;">􀋂</span><span>Today</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀌞</span><span>Care Log</span></div>
    <div class="tab-item active"><span style="font-size:46px;">􀈷</span><span>Health</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀉪</span><span>Circle</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀣌</span><span>Kit</span></div>
  </div>
  `,

  // s3: Circle & Sitter Handover
  `
  <div class="status-bar"><span>9:41</span><span>􀋒 􀙇 􀛨</span></div>
  <div class="content">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px;">
      <span style="font-size:40px; font-weight:700; color:#143D31;">‹ Shared Access</span>
      <span class="pill pill-mint">4 CARERS</span>
    </div>
    <h1 style="font-size:52px; font-weight:400; color:#143D31; margin-bottom:8px;">Circle & Handover</h1>
    <div style="font-size:30px; color:#58645C; margin-bottom:32px;">Family, dog walkers & pet sitters in sync</div>

    <!-- Sitter Pass Active -->
    <div class="card" style="background:#143D31; color:#FFFFFF; margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <span style="font-size:26px; font-weight:700; color:#BBD0B9; text-transform:uppercase;">Sitter Pass Active</span>
        <span style="background:rgba(187,208,185,0.25); color:#BBD0B9; border:1px solid #BBD0B9; padding:8px 18px; border-radius:14px; font-size:22px; font-weight:700;">EXPIRES SUN 20:00</span>
      </div>
      <div style="font-size:38px; font-weight:700; color:#FFFFFF; margin-bottom:8px;">Weekend Sit · Emma Watson</div>
      <div style="font-size:28px; color:#E7F0E6; line-height:1.4; margin-bottom:24px;">
        Grants care log & routine access. Sensitives (insurance, microchip) safely withheld.
      </div>
      <div style="display:flex; gap:16px;">
        <span style="background:#E7F0E6; color:#143D31; padding:12px 24px; border-radius:20px; font-size:26px; font-weight:700;">Print Handover PDF</span>
        <span style="background:rgba(255,255,255,0.15); color:#FFFFFF; padding:12px 24px; border-radius:20px; font-size:26px; font-weight:700;">Revoke Access</span>
      </div>
    </div>

    <!-- Circle Members List -->
    <div class="card" style="padding:32px 36px; margin-bottom:20px;">
      <div style="font-size:32px; font-weight:700; color:#202923; margin-bottom:20px;">Active Circle Members</div>
      
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="width:52px; height:52px; border-radius:50%; background:#143D31; color:#FFFFFF; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:700;">S</div>
            <div>
              <div style="font-size:30px; font-weight:700; color:#202923;">Sarah Jenkins</div>
              <div style="font-size:24px; color:#58645C;">Primary Owner · Full Control</div>
            </div>
          </div>
          <span class="pill pill-green">OWNER</span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="width:52px; height:52px; border-radius:50%; background:#356249; color:#FFFFFF; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:700;">A</div>
            <div>
              <div style="font-size:30px; font-weight:700; color:#202923;">Alex Jenkins</div>
              <div style="font-size:24px; color:#58645C;">Family Member · Can Log & Edit</div>
            </div>
          </div>
          <span class="pill pill-green">FAMILY</span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="width:52px; height:52px; border-radius:50%; background:#BBD0B9; color:#143D31; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:700;">D</div>
            <div>
              <div style="font-size:30px; font-weight:700; color:#202923;">Dave Walker</div>
              <div style="font-size:24px; color:#58645C;">Dog Walker · Care Logging Only</div>
            </div>
          </div>
          <span class="pill pill-mint">WALKER</span>
        </div>
      </div>
    </div>
  </div>

  <div class="tab-bar">
    <div class="tab-item"><span style="font-size:46px;">􀋂</span><span>Today</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀌞</span><span>Care Log</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀈷</span><span>Health</span></div>
    <div class="tab-item active"><span style="font-size:46px;">􀉪</span><span>Circle</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀣌</span><span>Kit</span></div>
  </div>
  `,

  // s4: Emergency Kit & Lost Pet Poster
  `
  <div class="status-bar"><span>9:41</span><span>􀋒 􀙇 􀛨</span></div>
  <div class="content">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px;">
      <span style="font-size:40px; font-weight:700; color:#143D31;">‹ Safety Vault</span>
      <span class="pill pill-peach">EMERGENCY READY</span>
    </div>
    <h1 style="font-size:52px; font-weight:400; color:#143D31; margin-bottom:8px;">Pet Safety Kit</h1>
    <div style="font-size:30px; color:#58645C; margin-bottom:32px;">Vet, microchip & instant lost pet poster</div>

    <!-- Microchip & Insurance Grid -->
    <div class="card" style="padding:36px; margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #E3E7DF; padding-bottom:20px; margin-bottom:20px;">
        <div>
          <div style="font-size:24px; font-weight:700; color:#58645C; text-transform:uppercase;">Microchip Number</div>
          <div style="font-size:36px; font-weight:800; font-family:'JetBrains Mono',monospace; color:#143D31; margin-top:4px;">9851 4100 2348 910</div>
        </div>
        <span class="pill pill-green">VERIFIED</span>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <div>
          <div style="font-size:22px; color:#58645C; text-transform:uppercase;">Insurance Policy</div>
          <div style="font-size:28px; font-weight:700; color:#202923; margin-top:4px;">Petplan #POL-88319</div>
        </div>
        <div>
          <div style="font-size:22px; color:#58645C; text-transform:uppercase;">Emergency Vet</div>
          <div style="font-size:28px; font-weight:700; color:#143D31; margin-top:4px;">01225 832900 (24h)</div>
        </div>
      </div>
    </div>

    <!-- Mini Lost Pet Poster Preview Card -->
    <div class="card" style="border:3px solid #A14431; padding:32px; background:#FFFAF8; margin-bottom:24px;">
      <div style="display:flex; gap:24px; align-items:center; margin-bottom:16px;">
        <img src="${miloB64}" style="width:130px; height:130px; border-radius:24px; object-fit:cover; border:3px solid #A14431;" />
        <div>
          <span style="background:#A14431; color:#FFFFFF; font-size:22px; font-weight:800; padding:6px 16px; border-radius:10px;">LOST PET POSTER</span>
          <div style="font-size:36px; font-weight:800; color:#202923; margin-top:8px;">Milo · Golden Retriever</div>
          <div style="font-size:26px; color:#58645C;">Instant print & share with contact details</div>
        </div>
      </div>
      <div style="font-size:24px; color:#58645C; line-height:1.4;">
        Generates ready-to-print A4 PDF poster with high-res photo, collar tag ID, microchip and direct phone numbers.
      </div>
    </div>

    <div class="btn-primary">
      <span>Generate Lost Pet Poster (PDF) 􀈂</span>
    </div>
  </div>

  <div class="tab-bar">
    <div class="tab-item"><span style="font-size:46px;">􀋂</span><span>Today</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀌞</span><span>Care Log</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀈷</span><span>Health</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀉪</span><span>Circle</span></div>
    <div class="tab-item active"><span style="font-size:46px;">􀣌</span><span>Kit</span></div>
  </div>
  `,

  // s5: 100% Offline Device Mode & Privacy
  `
  <div class="status-bar"><span>9:41</span><span>􀋒 􀙇 􀛨</span></div>
  <div class="content">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px;">
      <span style="font-size:40px; font-weight:700; color:#143D31;">‹ Privacy</span>
      <span class="pill pill-green">LOCAL VAULT</span>
    </div>
    <h1 style="font-size:52px; font-weight:400; color:#143D31; margin-bottom:8px;">Private & Local-First</h1>
    <div style="font-size:30px; color:#58645C; margin-bottom:32px;">Works offline anywhere with zero forced accounts</div>

    <div class="card" style="background:#143D31; color:#FFFFFF; margin-bottom:32px;">
      <div style="font-size:42px; font-weight:800; color:#BBD0B9; margin-bottom:12px;">Your Data Stays Yours</div>
      <div style="font-size:30px; color:#E7F0E6; line-height:1.45; margin-bottom:28px;">
        All feeding times, medications, routines and pet records store directly on your device. Zero cloud dependency unless you choose to share.
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <div style="background:rgba(255,255,255,0.1); border-radius:24px; padding:24px; text-align:center;">
          <div style="font-size:44px; font-weight:800; color:#BBD0B9;">100%</div>
          <div style="font-size:24px; color:#E7F0E6; margin-top:4px;">Offline Ready</div>
        </div>
        <div style="background:rgba(255,255,255,0.1); border-radius:24px; padding:24px; text-align:center;">
          <div style="font-size:44px; font-weight:800; color:#BBD0B9;">0 Ads</div>
          <div style="font-size:24px; color:#E7F0E6; margin-top:4px;">No Tracking</div>
        </div>
      </div>
    </div>

    <!-- Feature Checklist -->
    <div class="card">
      <div style="display:flex; flex-direction:column; gap:24px;">
        <div style="display:flex; align-items:center; gap:20px;">
          <span style="color:#143D31; font-size:36px;">✓</span>
          <span style="font-size:32px; font-weight:600; color:#202923;">Full care logging on walks and remote areas</span>
        </div>
        <div style="display:flex; align-items:center; gap:20px;">
          <span style="color:#143D31; font-size:36px;">✓</span>
          <span style="font-size:32px; font-weight:600; color:#202923;">Secure local storage with biometric lock</span>
        </div>
        <div style="display:flex; align-items:center; gap:20px;">
          <span style="color:#143D31; font-size:36px;">✓</span>
          <span style="font-size:32px; font-weight:600; color:#202923;">Instant export via AirDrop, WhatsApp or PDF</span>
        </div>
      </div>
    </div>
  </div>

  <div class="tab-bar">
    <div class="tab-item"><span style="font-size:46px;">􀋂</span><span>Today</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀌞</span><span>Care Log</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀈷</span><span>Health</span></div>
    <div class="tab-item"><span style="font-size:46px;">􀉪</span><span>Circle</span></div>
    <div class="tab-item active"><span style="font-size:46px;">􀣌</span><span>Kit</span></div>
  </div>
  `
];

(async () => {
  console.log('1. Rendering 6 high-fidelity UI screens for PetCircle...');
  const screens = {};
  for (let i = 0; i < uiScreens.length; i++) {
    const htmlFile = path.join(screensHtmlDir, `s${i}.html`);
    const pngFile = path.join(screensPngDir, `s${i}.png`);
    fs.writeFileSync(htmlFile, `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}</style></head><body>${uiScreens[i]}</body></html>`);
    const profile = `C:\\Users\\alexb\\AppData\\Local\\Temp\\chrome-pet-ui-${Date.now()}-${i}`;
    execFileSync(chromePath, [
      '--headless=new',
      `--user-data-dir=${profile}`,
      '--window-size=1170,2532',
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      '--virtual-time-budget=4000',
      `--screenshot=${pngFile}`,
      `file:///${htmlFile.replace(/\\/g, '/')}`
    ], { stdio: 'ignore' });
    screens[`s${i}`] = 'data:image/png;base64,' + fs.readFileSync(pngFile).toString('base64');
    console.log(`Rendered UI screen s${i}.png`);
  }

  // 2. Fetch 3D device frame assets
  console.log('2. Fetching 3D frame assets from S3...');
  const frame63fv82 = await fetchAsDataUrl('https://ol-design-assets.s3.us-west-2.amazonaws.com/dashboard/applaunchpad-assets/devices/custom-device/63fv82.webp', 'image/webp');
  const frameC1ndr8 = await fetchAsDataUrl('https://ol-design-assets.s3.us-west-2.amazonaws.com/dashboard/applaunchpad-assets/devices/custom-device/c1ndr8.webp', 'image/webp');
  const frameTitanium = await fetchAsDataUrl('https://ol-design-assets.s3.us-west-2.amazonaws.com/dashboard/applaunchpad-assets/devices/iphone-16-pro-max/black-titanium.webp', 'image/webp');

  const raw = fs.readFileSync('C:/Users/alexb/.gemini/antigravity/brain/859d0ab6-9c12-4f06-abc4-fb3210a60603/.system_generated/steps/1048/output.txt', 'utf8');
  const jsonStr = raw.split('```json\n')[1].split('\n```')[0];
  const artboards = JSON.parse(jsonStr);

  function commonTransform(html) {
    html = html.replace('transform: scale(0.250358); transform-origin: 0px 0px;', 'left: 0px; top: 0px;');
    html = html.replace(/loading="lazy"/g, 'loading="eager"');
    html = html.replace(/crossorigin="anonymous"/g, '');
    html = html.replace(/\?x-request=xhr/g, '');
    html = html.replace(/https:\/\/ol-design-assets\.s3\.us-west-2\.amazonaws\.com\/dashboard\/applaunchpad-assets\/devices\/custom-device\/63fv82\.webp/g, frame63fv82);
    html = html.replace(/https:\/\/ol-design-assets\.s3\.us-west-2\.amazonaws\.com\/dashboard\/applaunchpad-assets\/devices\/custom-device\/c1ndr8\.webp/g, frameC1ndr8);
    html = html.replace(/https:\/\/ol-design-assets\.s3\.us-west-2\.amazonaws\.com\/dashboard\/applaunchpad-assets\/devices\/iphone-16-pro-max\/black-titanium\.webp/g, frameTitanium);
    // Replace purple accents with PetCircle's signature dark green & mint
    html = html.replace(/rgb\(226,\s*195,\s*255\)/g, 'rgb(187, 208, 185)');
    html = html.replace(/rgb\(182,\s*105,\s*255\)/g, 'rgb(20, 61, 49)');
    return html;
  }

  // Slide 1 (AB 0): 3D Hero Spread Left
  let ab0 = commonTransform(artboards[0].html);
  ab0 = ab0.replace(/<div id="7ef4p2"[\s\S]*?<\/div><\/div>/, '');
  ab0 = ab0.replace('https://ol-design-assets.s3.us-west-2.amazonaws.com/dashboard/applaunchpad-assets/default-images/screenshots/8ae0ee76-a5c5-4fc5-8c0b-761150c47555.webp', screens.s1);
  ab0 = ab0.replace('https://ol-design-assets.s3.us-west-2.amazonaws.com/dashboard/users-assets/project-assets/693a935b-4936-4c2b-901f-f3dd58911da8.jpeg', screens.s0);
  ab0 = ab0.replace(/transform-origin: 0px 0px;/g, 'transform-origin: 0px 0px; z-index: 2;');
  ab0 = ab0.replace(/font-size:\s*201px/g, 'font-size: 154px');
  ab0 = ab0.replace('Your health,', 'Your pet,');
  ab0 = ab0.replace('Nutrify AI: Your Health Coach', 'PetCircle: Shared Pet Care');
  ab0 = ab0.replace(/TRACK\s*EVERYTHING IN ONE APP!/, 'PET CARE &\nROUTINES IN SYNC!');
  ab0 = ab0.replace('top: 1879.91px;', 'top: 1740px; z-index: 15;');
  ab0 = ab0.replace('id="ue25fy" class="border-0" style="position: absolute;', 'id="ue25fy" class="border-0" style="position: absolute; z-index: 10;');
  ab0 = ab0.replace('<div class="outsideNodeWrapper">', `<div class="outsideNodeWrapper"><img src="${iconB64}" style="position:absolute; left:32px; top:142px; width:88px; height:88px; border-radius:22px; z-index:20; box-shadow: 0 8px 24px rgba(0,0,0,0.4);" />`);

  // Slide 2 (AB 1): 3D Hero Spread Right
  let ab1 = commonTransform(artboards[1].html);
  ab1 = ab1.replace(/<div id="bdrz9p"[\s\S]*?<\/div><\/div>/, '');
  ab1 = ab1.replace('https://ol-design-assets.s3.us-west-2.amazonaws.com/dashboard/users-assets/project-assets/c94597d2-c73f-4a0e-a9c9-51e6ef39632c.jpeg', screens.s1);
  ab1 = ab1.replace('https://ol-design-assets.s3.us-west-2.amazonaws.com/dashboard/users-assets/project-assets/693a935b-4936-4c2b-901f-f3dd58911da8.jpeg', screens.s0);
  ab1 = ab1.replace(/transform-origin: 0px 0px;/g, 'transform-origin: 0px 0px; z-index: 2;');
  ab1 = ab1.replace(/font-size:\s*120px;\s*font-family:\s*Calistoga;\s*line-height:\s*130px;/g, 'font-size: 76px; font-family: Calistoga; line-height: 88px;');
  ab1 = ab1.replace(/Tell Nutrify your goal\s*/, 'Shared Live Care Feed');
  ab1 = ab1.replace(/Your AI coach builds the plan\s*/, 'Never double-feed or miss medications');

  // Slide 3 (AB 2): Health & Weight Tracking (s2)
  let ab2 = commonTransform(artboards[2].html);
  ab2 = ab2.replace('https://ol-design-assets.s3.us-west-2.amazonaws.com/dashboard/users-assets/project-assets/ca9a89ab-83d3-45e0-b29d-6cb7fa40248c.jpeg', screens.s2);
  ab2 = ab2.replace(/font-size:\s*70px;\s*font-family:\s*Poppins;\s*line-height:\s*80px;/g, 'font-size: 50px; font-family: Poppins; line-height: 62px;');
  ab2 = ab2.replace("Just say it. We'll log it.&nbsp;One coach. Every health tool.", 'Weight, Vaccine&nbsp;& Clinical Records.');
  ab2 = ab2.replace('"I ran 10 miles" — calories, steps, macros, all sorted.', 'Track weight trends, vet visits, booster reminders and clinical notes.');

  // Slide 4 (AB 3): Circle & Sitter Handover (s3)
  let ab3 = commonTransform(artboards[3].html);
  ab3 = ab3.replace('https://ol-design-assets.s3.us-west-2.amazonaws.com/dashboard/users-assets/project-assets/2b81f16f-5d04-4f42-88da-cf233e387e32.jpeg', screens.s3);
  ab3 = ab3.replace(/font-size:\s*208px;\s*font-family:\s*Calistoga;\s*line-height:\s*218px;/g, 'font-size: 140px; font-family: Calistoga; line-height: 150px;');
  ab3 = ab3.replace(/font-size:\s*62px;\s*font-family:\s*Poppins;\s*line-height:\s*72px;/g, 'font-size: 50px; font-family: Poppins; line-height: 64px;');
  ab3 = ab3.replace(/Meals built for your goals/, 'Sitter & Walker Pass');
  ab3 = ab3.replace(/Smart Kitchen\s*/, 'Sitter Handover');
  ab3 = ab3.replace('Plan, Cook, Track, Repeat', 'Time-limited passes with sensitive data protection');

  // Slide 5 (AB 4): Safety Kit & Lost Pet Poster (s4)
  let ab4 = commonTransform(artboards[4].html);
  ab4 = ab4.replace('https://ol-design-assets.s3.us-west-2.amazonaws.com/dashboard/users-assets/project-assets/ab902b0d-7935-4097-a446-aed5d522dc5f.jpeg', screens.s4);
  ab4 = ab4.replace('Track Everything', 'Instant Safety Kit');
  ab4 = ab4.replace('Make smart decisions, scan meals, track workouts', 'Microchip, insurance & 1-tap printable lost pet posters');

  // Slide 6 (AB 5): 100% Offline Vault (s5)
  let ab5 = commonTransform(artboards[5].html);
  ab5 = ab5.replace('https://ol-design-assets.s3.us-west-2.amazonaws.com/dashboard/users-assets/project-assets/42763fe7-965f-4871-bdea-bf29dab9bca1.jpeg', screens.s5);
  ab5 = ab5.replace('Workouts that fit your week', '100% Private & Offline');
  ab5 = ab5.replace('Personalized plans, every week', 'Full care functionality anywhere with zero mandatory accounts');

  const slides = [ab0, ab1, ab2, ab3, ab4, ab5];

  console.log('3. Rendering 6 marketing slides (1290x2796)...');
  slides.forEach((slideHtml, i) => {
    const num = i + 1;
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Text:ital@0;1&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 1290px;
    height: 2796px;
    overflow: hidden;
    background: #091D17;
  }
  .relative {
    position: relative;
    width: 100% !important;
    height: 100% !important;
    isolation: isolate;
  }
  .wrapper.absolute {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: auto !important;
    pointer-events: none;
  }
</style>
</head>
<body>
${slideHtml}
</body>
</html>`;

    const htmlFile = path.join(slidesHtmlDir, `slide_${num}.html`);
    fs.writeFileSync(htmlFile, fullHtml);
    const outPng = path.join(styledDir, `slide_${num}.png`);
    const slideProfile = `C:\\Users\\alexb\\AppData\\Local\\Temp\\chrome-pet-slide-${Date.now()}-${num}`;
    execFileSync(chromePath, [
      '--headless=new',
      `--user-data-dir=${slideProfile}`,
      '--window-size=1290,2796',
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      '--default-background-color=ff091d17',
      '--virtual-time-budget=5000',
      `--screenshot=${outPng}`,
      `file:///${htmlFile.replace(/\\/g, '/')}`
    ], { stdio: 'ignore' });
    console.log(`Saved slide_${num}.png in Styled App Previews`);
  });

  // 4. Render Google Play Feature Graphic (1024x500)
  console.log('4. Rendering Google Play feature graphic (1024x500)...');
  const fgHtmlFile = path.join(slidesHtmlDir, 'feature_graphic.html');
  const fgPng = path.join(storeDir, 'play-store-feature-graphic-1024x500.png');
  fs.writeFileSync(fgHtmlFile, `<!DOCTYPE html><html><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Text:ital@0;1&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 1024px; height: 500px; overflow: hidden;
      background: linear-gradient(135deg, #091D17 0%, #143D31 55%, #1D5443 100%);
      font-family: 'Manrope', sans-serif; color: #FFFFFF;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 64px; position: relative;
    }
    .glow {
      position: absolute; width: 440px; height: 440px; border-radius: 50%;
      background: radial-gradient(circle, rgba(187,208,185,0.3) 0%, rgba(187,208,185,0) 70%);
      right: -40px; top: -60px;
    }
  </style></head><body>
    <div class="glow"></div>
    <div style="max-width: 580px; z-index: 2;">
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:18px;">
        <img src="${iconB64}" style="width:68px; height:68px; border-radius:18px; box-shadow:0 8px 24px rgba(0,0,0,0.4);" />
        <span style="background:rgba(187,208,185,0.2); color:#BBD0B9; border:1px solid rgba(187,208,185,0.4); padding:6px 16px; border-radius:999px; font-size:15px; font-weight:800; letter-spacing:1px;">SHARED PET CARE & ROUTINES</span>
      </div>
      <h1 style="font-family:'DM Serif Text', serif; font-size:46px; line-height:1.15; font-weight:400; margin-bottom:16px; letter-spacing:-0.5px;">
        Family & Sitter Pet Care in Perfect Sync.
      </h1>
      <p style="font-size:20px; color:#E7F0E6; line-height:1.45; margin-bottom:24px;">
        Coordinate feedings, walks, medications and vet records with family and sitters. 100% offline capable.
      </p>
      <div style="display:flex; gap:12px;">
        <span style="background:#143D31; border:1px solid #BBD0B9; color:#BBD0B9; padding:8px 18px; border-radius:999px; font-size:15px; font-weight:700;">✓ Live Feeding Log</span>
        <span style="background:#143D31; border:1px solid #BBD0B9; color:#BBD0B9; padding:8px 18px; border-radius:999px; font-size:15px; font-weight:700;">✓ Sitter Handover</span>
      </div>
    </div>
    <div style="z-index:2; transform: rotate(-4deg) translateY(20px);">
      <img src="${screens.s0}" style="width:280px; border-radius:28px; border:6px solid #FFFFFF; box-shadow:0 24px 60px rgba(0,0,0,0.6);" />
    </div>
  </body></html>`);

  const fgProfile = `C:\\Users\\alexb\\AppData\\Local\\Temp\\chrome-pet-fg-${Date.now()}`;
  execFileSync(chromePath, [
    '--headless=new',
    `--user-data-dir=${fgProfile}`,
    '--window-size=1024,500',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    '--virtual-time-budget=3000',
    `--screenshot=${fgPng}`,
    `file:///${fgHtmlFile.replace(/\\/g, '/')}`
  ], { stdio: 'ignore' });
  console.log('Saved play-store-feature-graphic-1024x500.png');

  // 5. Generate all required store resolutions via PowerShell System.Drawing (24-bit RGB)
  console.log('5. Converting and resizing to match TradeVoice AI asset structure...');
  const psScript = `
Add-Type -AssemblyName System.Drawing
function Save-24Bit($src, $dst, $w, $h) {
  $img = [System.Drawing.Image]::FromFile($src)
  $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(9, 29, 23))
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose()
  $img.Dispose()
  $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$styled = "${styledDir.replace(/\\/g, '\\\\')}"
$screens = "${screenshotsDir.replace(/\\/g, '\\\\')}"
$store = "${storeDir.replace(/\\/g, '\\\\')}"

for ($i = 1; $i -le 6; $i++) {
  $s = "$styled\\slide_$i.png"
  $tmp = "$styled\\slide_$($i)_rgb.png"
  Save-24Bit $s $tmp 1290 2796
  Move-Item -Force $tmp $s

  # Formats for Apple App Store in Styled App Previews
  Save-24Bit $s "$styled\\slide_$($i)_1206x2622.png" 1206 2622
  Save-24Bit $s "$styled\\slide_$($i)_1179x2556.png" 1179 2556
  Save-24Bit $s "$styled\\slide_$($i)_1284x2778.png" 1284 2778

  # Formats for screenshots parent directory matching TradeVoice AI
  Copy-Item -Force $s "$screens\\slide_$i.png"
  Save-24Bit $s "$screens\\slide_$($i)_1080x1920.png" 1080 1920
  Save-24Bit $s "$screens\\ipad_slide_$i.png" 2048 2732
}

# 512x512 Play Store Icon
Save-24Bit "D:\\PetCircle\\assets\\icon.png" "$store\\play-store-icon-512x512.png" 512 512

# 1024x500 Feature Graphic RGB ensure
$fg = "$store\\play-store-feature-graphic-1024x500.png"
$tmpFg = "$store\\fg_rgb.png"
Save-24Bit $fg $tmpFg 1024 500
Move-Item -Force $tmpFg $fg
`;

  execFileSync('powershell.exe', ['-NoProfile', '-Command', psScript]);
  console.log('All store assets matching TradeVoice AI structure generated successfully!');
})();
