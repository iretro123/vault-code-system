
The user wants me to:
1. Deploy the existing push-notify edge function
2. Replace the SQL trigger function `public.push_notify_on_insert()` to call the edge function directly via pg_net (no ALTER DATABASE settings) with hardcoded URL + secret

⚠️ Concern: They pasted a secret value in plain text. This will land in a SQL migration file in the codebase, which is not ideal but they explicitly want it inline (since ALTER DATABASE settings are blocked). I'll proceed as instructed but flag it.

Also there are pre-existing build errors unrelated to this task. I should NOT try to fix those — they're separate. Just focus on deploy + SQL.

Plan is simple, presenting concisely.
