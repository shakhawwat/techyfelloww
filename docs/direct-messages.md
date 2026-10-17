# Community direct messages

Community Messages (`/blog/messages`, `/blog/messages/:id`) is member-to-member messaging. `/blog/support` and the corporate account Inbox remain support entry points, backed by the original support records and admin Inbox. No support history is converted. Community profile Message links and member search use public display names and public profile fields, never account emails. There is no username field in the current account model.

Direct conversations have an explicit `direct` type and a deterministic canonical member-pair ID, with a unique pair index. Support records keep their existing collection and now default to the explicit `support` type; older support records continue working. Direct messages have unique `(conversation, sender, key)` and `(conversation, sequence)` indexes. New models are included in the existing `db:indexes` command. Apply those indexes as part of the normal environment setup; this work does not deploy anything.

Every `/account/direct` endpoint requires the member cookie specifically, and a MEMBER identity. Every conversation and private media operation checks membership. Admin cookies and inbox permissions alone grant no direct-message access. Explicit community-review permissions now permit reason-based, audited moderator access through separate endpoints. The original support media endpoint cannot serve direct attachments. Mongo transactions serialize sends with block/accept/decline changes and bind uploads atomically. Message retries retain their original key and cannot append duplicates, even after a lost response.

Direct messages are free between normal member accounts, independently of friendship. Selecting a recipient prepares the existing canonical conversation so text, attachments, camera and voice are immediately available. Old pending/declined conversations keep all their history and are no longer gated. Empty prepared threads are omitted from conversation lists. Either member can block; sends and uploads remain disabled until every blocking participant removes their own block. Unblocking cannot remove the other member's block. Ordinary history access remains limited to the two participants; authorized moderation review follows the separate audited policy.

Private image/PDF/audio uploads reuse support validation and HTTP byte-range playback. Limits: 3 attachments/message, 8 MiB/file, 200 MiB stored/member, 30 uploads/minute. Friend requests: 20/hour; friendship controls: 60/minute; sends: 30/minute; public-name searches: 60/minute; reports: 10/hour. Unbound files expire after 24 hours. Bound files are retained with their messages. Camera/microphone are requested only by icon actions and stopped on cancellation, document hiding, leaving the conversation or logout.

History is paged in batches of 100 with Load older messages. Fetching history changes no read state. The rendered chat marks through the visible final message only when the document is visible, focused and the message-list end is in view. Notifications have separate persisted read state. Notification links distinguish direct messages, support replies and Blog comments. Polling is visibility-aware with cleanup and failure backoff. No online, delivery or read receipts are invented.

Report mode selects 1–10 messages plus a reason as initial evidence and preserves the conversation reference. Authorized moderators with explicit community permissions may review the related history and shared attachments with a recorded reason. The workspace retains investigation history and reversible enforcement; see [community-moderation.md](community-moderation.md). Private member APIs remain participant-only. Files require successful malware scans before download; missing scanner infrastructure quarantines unscanned files.

Tests use random disposable databases and isolated synthetic accounts. Run after backend/frontend builds:

```
NODE_ENV=test TECHYFELLOW_TEST_MONGO=mongodb://172.28.0.2:27017 node --test backend/test/direct-messaging.integration.test.mjs
NODE_ENV=test TECHYFELLOW_TEST_MONGO=mongodb://172.28.0.2:27017 node frontend/test/direct-messaging-browser.mjs
```

The browser suite uses headless Chrome with simulated camera/microphone hardware. Real device and OS permission-dialog checks remain separate manual checks.


## Friendship

The existing messaging module registers `friendships`, `friend_operations` and `friend_notifications` alongside the existing MongoDB models. A canonical pair has one friendship state. Revision checks prevent stale controls from changing a newer relationship. A UUID operation key makes retries safe even after cancel, decline or unfriend. Crossing requests become a single friendship, with one acceptance notification. All transitions serialize on the existing direct-conversation pair lock, including block changes. Follow records are independent and untouched.

`/account/friends` strictly selects the member session. Profiles and the Inbox use `/account/friends/:memberId`; Friends/Requests lists are private to the acting member. Requests notify the recipient; acceptance notifies the original requester. Cancel/decline/unfriend produce no new notification. Request notifications are resolved as read when the request ends and expose Accept/Decline only while the matching request generation is still pending. Notifications include current friendship state, not a stale actionable snapshot.

The profile tabs, profile/Inbox controls and notification controls use visibility-aware polling with backoff and cleaned-up requests. Successful actions refresh the current page and notify other tabs using the existing browser BroadcastChannel capability. Every response is scoped to the current member. Unfriend requires confirmation; it preserves conversations, private files, Follow state and the ability to message. Blocking prevents requests/acceptance and new messages; members can still decline/cancel requests or remove friendships while blocked.
