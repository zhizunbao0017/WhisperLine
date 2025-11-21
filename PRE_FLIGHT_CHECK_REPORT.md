# Pre-flight Check Report

Here are the critical credentials configured in your local project. Please manually verify them against the data on developer.apple.com.

---

### 1. Apple Team ID

*   **Source:** `eas.json`
*   **Value:** ❌ **NOT FOUND** (not explicitly configured in local files)
*   **Status:** ⚠️ **MUST BE VERIFIED MANUALLY**

**Action Required:** Check your Apple Developer account at [developer.apple.com/account](https://developer.apple.com/account) → **Membership** section to find your Team ID, or check EAS credentials via `eas credentials --platform ios`.

---

### 2. Bundle Identifier

*   **Source:** `eas.json`
*   **Value:** ❌ **NOT EXPLICITLY SET** (inherits from app.json/app.config.js)

*   **Source:** `app.json`
*   **Value:** `com.xietian.whisperline`

*   **Source:** `app.config.js`
*   **Value:** `com.xietian.whisperline` (read from app.json)
*   **Consistency Check:** ✅ **MATCH** (both files use the same value)

---

**Final Action Required:**

Please log in to your Apple Developer account and **word-for-word** verify that the values above are **identical** to what is configured on the portal. Any tiny difference (a typo, an extra character) will cause the build to fail.

**Verification Steps:**

1. **Apple Team ID:**
   - Go to [developer.apple.com/account](https://developer.apple.com/account) → **Membership**
   - Copy your Team ID exactly
   - Verify it matches what EAS has stored

2. **Bundle Identifier:**
   - Go to [developer.apple.com/account](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Identifiers**
   - Search for: `com.xietian.whisperline`
   - Verify it exists and matches **exactly** (case-sensitive, no typos, no extra characters)

3. **Provisioning Profile:**
   - Ensure you have a valid **Distribution** provisioning profile for `com.xietian.whisperline`
   - Verify it's not expired
   - Verify it's associated with the correct Team ID
