import {expect,it} from 'vitest';
import {fcmTokenIsUnregistered,apnsFailureReason} from '../../supabase/functions/_shared/pushProviderResponse';
it('requires an explicit typed FCM unregistered response before retiring a token',()=>{
 expect(fcmTokenIsUnregistered(JSON.stringify({error:{details:[{'@type':'type.googleapis.com/google.firebase.fcm.v1.FcmError',errorCode:'UNREGISTERED'}]}}))).toBe(true);
 for(const body of ['404 Not Found','UNREGISTERED',JSON.stringify({error:{message:'UNREGISTERED',status:'NOT_FOUND'}}),JSON.stringify({error:{details:[{errorCode:'UNREGISTERED'}]}})])expect(fcmTokenIsUnregistered(body)).toBe(false);
});
it('never carries an earlier bad-token reason into an alternate host transient response',()=>{
 expect(apnsFailureReason('{"reason":"BadDeviceToken"}')).toBe('BadDeviceToken');
 expect(apnsFailureReason('gateway unavailable')).toBe('');
 expect(apnsFailureReason('{}')).toBe('');
 expect(apnsFailureReason('{"reason":"ServiceUnavailable"}')).toBe('ServiceUnavailable');
});
it('only returns safe provider reason identifiers',()=>{
 expect(apnsFailureReason('{"reason":"private token data"}')).toBe('');expect(apnsFailureReason('{"reason":null}')).toBe('');
});
