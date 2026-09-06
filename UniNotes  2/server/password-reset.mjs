import { createHash, randomBytes, pbkdf2Sync } from "node:crypto";
import { chmod, readFile, rename, writeFile } from "node:fs/promises";

const databasePath = process.env.NOTEIT_DB_PATH;
const resetBaseUrl = process.env.NOTEIT_RESET_BASE_URL;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.NOTEIT_FROM_EMAIL || "Note'it <noreply@example.com>";

async function readDatabase() {
  if (!databasePath) throw new Error("NOTEIT_DB_PATH mangler.");
  return JSON.parse(await readFile(databasePath, "utf8"));
}

async function saveDatabase(database) {
  const temporaryPath = `${databasePath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(database, null, 2), { mode: 0o600 });
  await rename(temporaryPath, databasePath);
  await chmod(databasePath, 0o600);
}

function accounts(database) {
  return JSON.parse(database.storage?.["noteit-accounts"] || "[]");
}

function canonicalEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function tokenHash(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export async function requestPasswordReset(req, res) {
  try {
    if (!resendApiKey || !resetBaseUrl) {
      return res.status(503).json({ error: "Mailtjenesten er ikke konfigureret." });
    }
    const email = canonicalEmail(req.body?.email);
    const database = await readDatabase();
    const account = accounts(database).find(item => canonicalEmail(item.email) === email);

    // Return the same response whether the account exists or not.
    if (!account) return res.json({ ok: true });

    const token = randomBytes(32).toString("hex");
    database.passwordResetTokens ||= [];
    database.passwordResetAttempts = (database.passwordResetAttempts || []).filter(item =>
      new Date(item.createdAt).getTime() > Date.now() - 60 * 60 * 1000
    );
    const recentRequests = database.passwordResetAttempts.filter(item => item.email === email);
    if (recentRequests.length >= 3) return res.status(429).json({ error: "Prøv igen senere." });
    database.passwordResetAttempts.push({ email, createdAt: new Date().toISOString() });
    database.passwordResetTokens = database.passwordResetTokens
      .filter(item => new Date(item.expiresAt).getTime() > Date.now() && item.email !== email);
    database.passwordResetTokens.push({
      tokenHash: tokenHash(token),
      email,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    await saveDatabase(database);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "Nulstil din adgangskode til Note'it",
        html: `<p>Du har bedt om at nulstille din adgangskode.</p>
          <p><a href="${resetBaseUrl}?token=${encodeURIComponent(token)}">Nulstil adgangskoden</a></p>
          <p>Linket udløber om 30 minutter. Ignorér mailen, hvis du ikke bad om dette.</p>`,
      }),
    });
    if (!response.ok) throw new Error("Mailudbyderen afviste beskeden.");
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Nulstillingsmailen kunne ikke sendes." });
  }
}

export async function completePasswordReset(req, res) {
  try {
    const token = String(req.body?.token || "");
    const password = String(req.body?.password || "");
    if (password.length < 8) return res.status(400).json({ error: "Adgangskoden skal være mindst 8 tegn." });

    const database = await readDatabase();
    const requestedTokenHash = tokenHash(token);
    const reset = (database.passwordResetTokens || []).find(item =>
      (item.tokenHash === requestedTokenHash || item.token === token)
      && new Date(item.expiresAt).getTime() > Date.now()
    );
    if (!reset) return res.status(400).json({ error: "Linket er ugyldigt eller udløbet." });

    const list = accounts(database);
    const account = list.find(item => canonicalEmail(item.email) === reset.email);
    if (!account) return res.status(400).json({ error: "Profilen findes ikke." });

    const salt = randomBytes(16).toString("hex");
    account.passwordSalt = salt;
    account.passwordHash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
    account.passwordUpdatedAt = new Date().toISOString();
    database.storage["noteit-accounts"] = JSON.stringify(list);
    database.passwordResetTokens = database.passwordResetTokens.filter(item =>
      item.tokenHash !== requestedTokenHash && item.token !== token
    );
    await saveDatabase(database);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Adgangskoden kunne ikke nulstilles." });
  }
}
