Nexus Res-Q Final Development Rules & Guidelines
🔒 1. login.js Protection
Do NOT edit, refactor, or improve login.js or login.html without explicit written consent from project ownership.

Any PR or suggestion involving these files must be reviewed and approved first.

🗃️ 2. Data Access and Firestore Structure
All data must be accessed via the client-specific path:

Root: clients/{clientId} (where clientId = client subdomain, always lowercase)

Assets: clients/{clientId}/assets

Users: clients/{clientId}/users/{username} (username always lowercase)

Other data: under correct client root (e.g., clients/{clientId}/logs, clients/{clientId}/assignments, etc.)

Collection and document names must be descriptive: "assets", "users", "logs", etc.

"clientId" and "subdomain" are interchangeable—always use the right path for the active client session.

NEVER use or expose global/root-level data outside the client folder.

All retrievals, queries, and edits must dig into the correct client’s Firestore branch.

🏢 3. Client Data Isolation & Path Context
Every user’s view and data is fully isolated to their own client organization.

ALL data and UI shown in the dashboard must be sourced ONLY from the client’s own Firestore documents.

Path structure: clients/{clientId}/{docOrCollectionName}

NEVER surface or combine data from other clients.

All edits/updates/deletions must target the specific client doc/collection and maintain perfect sync with Firestore.

Strict context isolation and path discipline are mandatory.

🎨 4. UI/UX Consistency
All new features, screens, and style updates must visually match the Nexus theme:

Reference: index.html, login.html, nexus-admin.html, and associated CSS.

Match fonts, colors, button/modal styles, spacing, hover/active states, etc.

Do not introduce new UI paradigms or colors that break from the established look/feel.

Modernizations (e.g., loaders, subtle shadows, transitions, better controls) are welcome ONLY IF they fit the current brand.

Ensure mobile responsiveness where relevant.

🛠️ 5. Admin, Manager, and Nexus Permissions
Data is editable by client admin and manager users.

Nexus employees (role: "nexus") are superadmins with universal access/edit rights.

Always check user role in session/auth and enforce permissions accordingly.

🧹 6. Codebase Cleanup & Organization
Condense and clarify code.

Remove dead/redundant code, excessive comments, and outdated logic.

Favor smaller, well-documented, and readable files.

Move all CSS to /css/, all JS to /js/, separated by feature/page/module.

No inline CSS/JS except for minor HTML tweaks.

Do not break currently working features. All changes must be tested on a branch first.

If in doubt, leave a comment or request review.

🚚 7. Asset Movement, Location Creation & Mirrored Arrays
Every location node (zone, sublocation, precision location) MUST have an assets array of asset IDs.

When assets are created, assigned, moved, or deleted, all relevant assets arrays at every tier must be updated.

No asset may exist in a location’s array if it is not currently assigned there.

If a move is requested to a location code that does not exist:

Auto-create the required node with name: "Blank Text" and code as ID before moving.

Infer and create all required parent/sub-location structure, using client’s naming pattern, as needed.

Apply same logic in both dashboard and device, but keep UI triggers/flows separate and modular.

NEVER move an asset to a non-existent node.

No dangling asset IDs or partial moves—updates must be atomic and reliable.

No asset may reference a location that does not exist in Firestore.

🔄 8. Modular Move Logic
Dashboard and scanner/device move logic must remain modular and isolated.

UI triggers/flows should not be shared.

Shared backend utility modules for updating Firestore and mirrored arrays are allowed.

All move actions (by admin or scanner) must update mirrored arrays, asset location fields, and be fully logged for audit/history.

📝 9. Logging and Auditing
ALL significant dashboard and app (scanner) actions—especially asset moves and inspection events—must be logged at:
clients/{clientId}/logs/{logId}

Log must include: timestamp, user, action, affected asset(s), old/new location(s), and context/device info.

⚡ 10. Onboarding and Data Completeness
Onboarding must capture all needed client info and insert placeholder values in all necessary collections/docs.

No orphaned assets/locations, no missing required fields.

Optimize onboarding workflow to capture all possible client configuration up front.

⚠️ 11. "Do Not" List
Do NOT touch or propose changes to login.js or login.html without explicit permission.

Do NOT pull or write data outside clients/{clientId}.

Do NOT introduce new styles or UI paradigms outside the established brand.

Do NOT bypass mirrored arrays or asset field updates when moving/assigning/deleting assets.

Do NOT create locations/assets anywhere except under the client’s path.

Do NOT leave incomplete moves or data references.

Primary Goals
Correct, context-aware data recall and editing

Keep UI/UX on-brand and professional

Codebase is simple, modular, and maintainable

All critical auth and move logic is protected

Client data is always isolated and consistent

No broken, orphaned, or out-of-sync asset/location relationships—ever

If you are unsure about a change, ASK. Protect the client, the brand, and the data.
