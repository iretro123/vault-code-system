import { expect, it } from 'vitest';
import { parseWebSubscription } from '../../supabase/functions/_shared/webPushPolicy';
const subscription = (endpoint: string) => JSON.stringify({ endpoint, keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) } });
it.each(['https://fcm.googleapis.com/fcm/send/id','https://updates.push.services.mozilla.com/wpush/v2/id','https://web.push.apple.com/id','https://wns2-db5p.notify.windows.com/id'])('accepts browser push provider %s',url=>expect(parseWebSubscription(subscription(url))).not.toBeNull());
it.each(['http://fcm.googleapis.com/id','https://fcm.googleapis.com.evil.test/id','https://localhost/id','https://169.254.169.254/id','https://a@fcm.googleapis.com/id','https://fcm.googleapis.com:8443/id'])('rejects unsafe network destination %s',url=>expect(parseWebSubscription(subscription(url))).toBeNull());
it('rejects malformed encryption keys',()=>expect(parseWebSubscription('{"endpoint":"https://fcm.googleapis.com/id","keys":{}}')).toBeNull());
