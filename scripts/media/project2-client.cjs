const auth = require("firebase-tools/lib/auth");
const PROJECT = "proyecto2responsibleai";
async function operatorFetch(url, options = {}) {
  if (
    !["storage.googleapis.com", "firestore.googleapis.com"].includes(
      new URL(url).hostname,
    )
  )
    throw Error("Unexpected operator destination");
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account) throw Error("No authenticated Project2 operator");
  const token = await auth.getAccessToken(account.tokens.refresh_token, [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/firebase",
  ]);
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token.access_token}`,
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Error(
      `Project2 request failed (${response.status}): ${data.error?.message ?? "unknown error"}`,
    );
  }
  return response;
}
module.exports = { PROJECT, operatorFetch };
