# Privacy Policy for Khatha Finance

**Last Updated:** October 18, 2026

## 1. Overview
Khatha Finance ("we", "our", or "the App") is an offline-first personal financial and ledger tracking application. Your privacy is a fundamental priority. This Privacy Policy outlines how your information is handled, stored, and protected when using the App and its cloud backup services.

## 2. Information We Collect and Process

### Local Data
- **Financial & Transaction Records:** Information regarding customers, lending, borrowing, and payments is stored locally on your device in an encrypted SQLite database.
- **Device Identity:** A randomly generated, anonymized device identifier and friendly device name to distinguish multiple devices when creating backups.

### Google Account & Drive Data
When you enable Google Drive Cloud Backup, the App connects directly to Google APIs using OAuth 2.0:
- **Google User Info:** We retrieve your authorized email address and display name strictly to verify account identity in the App interface.
- **Google Drive Storage:** The App uses the restricted `https://www.googleapis.com/auth/drive.file` scope. This permission grants access **only to files and folders created by Khatha Finance** (inside the dedicated `Khatha Finance Backups` folder).
- **No Third-Party Servers:** We operate **no external backend servers**. Data transfers occur directly and securely between your device and Google's official REST API endpoints using TLS/HTTPS encryption.

## 3. How We Use Information
Your data is used solely to:
- Maintain your local personal finance ledgers.
- Provide automated and manual cloud backup and restore functionality to your private Google Drive account.
- Prevent duplicate uploads using SHA-256 integrity checksums.

## 4. Google API Limited Use Disclosure
Khatha Finance's use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements:
- The App does not access, read, alter, or delete any files in your Google Drive outside of the files created by the App.
- We do not sell, rent, or transfer your Google user data to any third parties or data brokers.
- We do not use Google user data for advertising, personalized marketing, or training machine learning models.

## 5. Data Retention & Deletion
- **Local Data:** You may delete your local database at any time by clearing application data or uninstalling the app.
- **Cloud Backups:** Backups in Google Drive can be viewed and deleted directly through the App's Cloud Backup management screen or through the Google Drive web interface.
- **Account Disconnection:** You can disconnect your Google account and revoke access at any time through the App settings or via [Google Account Security Settings](https://myaccount.google.com/permissions).

## 6. Security
All communication with Google APIs utilizes industry-standard HTTPS encryption. Authentication tokens are securely stored on your device using hardware-backed SecureStore where available.

## 7. Children's Privacy
Khatha Finance is not directed to individuals under the age of 13. We do not knowingly collect personal information from children.

## 8. Changes to This Privacy Policy
We may update this Privacy Policy from time to time. Any changes will be posted to this repository with an updated revision date.

## 9. Contact Us
If you have any questions or concerns regarding this Privacy Policy, please contact:
- **Developer:** MSK Reddy
- **Email:** mskreddy9963@gmail.com
- **Repository:** [https://github.com/MSKReddy7/khatha-finance-app](https://github.com/MSKReddy7/khatha-finance-app)
