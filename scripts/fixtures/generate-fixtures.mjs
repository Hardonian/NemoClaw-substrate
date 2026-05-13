import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// A deterministic random number generator for fixture generation
function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateDeterministicId(seedStr) {
  return crypto.createHash('sha256').update(seedStr).digest('hex').substring(0, 12);
}

function generateReceiptFixture(seed) {
  return {
    id: generateDeterministicId(`receipt-${seed}`),
    timestamp: "2026-05-12T12:00:00.000Z",
    status: "completed",
    attestation: {
      hash: generateDeterministicId(`hash-${seed}`),
      redacted: true
    },
    metrics: {
      duration_ms: Math.floor(seededRandom(seed) * 1000) + 500,
      tokens_used: Math.floor(seededRandom(seed + 1) * 5000) + 100
    }
  };
}

function generateReplayEnvelopeFixture(seed) {
  return {
    envelope_id: generateDeterministicId(`envelope-${seed}`),
    version: "1.0.0",
    events: [
      { type: "start", timestamp: "2026-05-12T12:00:00.000Z" },
      { type: "log", payload: "redacted_content", timestamp: "2026-05-12T12:00:01.000Z" },
      { type: "end", timestamp: "2026-05-12T12:00:02.000Z" }
    ]
  };
}

function generateDiagnosticsFixture(seed) {
  return {
    diag_id: generateDeterministicId(`diag-${seed}`),
    system_health: "ok",
    components: {
      sandbox: "active",
      router: "active",
      policy_engine: "active"
    },
    memory_usage_mb: Math.floor(seededRandom(seed) * 100) + 50
  };
}

async function writeFixtures() {
  const fixtureDir = path.resolve('./fixtures/generated');
  await fs.mkdir(fixtureDir, { recursive: true });

  const seed = 42; // Deterministic seed

  const receipt = generateReceiptFixture(seed);
  await fs.writeFile(path.join(fixtureDir, 'receipt.json'), JSON.stringify(receipt, null, 2));

  const envelope = generateReplayEnvelopeFixture(seed);
  await fs.writeFile(path.join(fixtureDir, 'replay-envelope.json'), JSON.stringify(envelope, null, 2));

  const diag = generateDiagnosticsFixture(seed);
  await fs.writeFile(path.join(fixtureDir, 'diagnostics.json'), JSON.stringify(diag, null, 2));

  console.log('[generate-fixtures] Generated deterministic fixtures in ./fixtures/generated');
}

writeFixtures().catch(err => {
  console.error(err);
  process.exit(1);
});
