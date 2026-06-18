import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ServiceClient = ReturnType<typeof createClient>;

async function deleteRows(
  sb: ServiceClient,
  table: string,
  column: string,
  value: string | string[],
  warnings: string[],
) {
  const query = sb.from(table).delete();
  const result = Array.isArray(value) ? query.in(column, value) : query.eq(column, value);
  const { error } = await result;
  if (error) {
    const warning = `${table}.${column}: ${error.message}`;
    warnings.push(warning);
    console.warn("[delete-account] cleanup warning:", warning);
  }
}

async function updateDeletedMessages(sb: ServiceClient, callerId: string, warnings: string[]) {
  const { error } = await sb
    .from("academy_messages")
    .update({
      body: "[deleted]",
      attachments: null,
      original_content: null,
      user_name: "Deleted User",
      user_role: "deleted_user",
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: callerId,
      edited_at: new Date().toISOString(),
    })
    .eq("user_id", callerId);

  if (error) {
    const warning = `academy_messages.update: ${error.message}`;
    warnings.push(warning);
    console.warn("[delete-account] cleanup warning:", warning);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await callerClient.auth.getClaims(token);
    const callerId = claims?.claims?.sub as string | undefined;

    if (claimsErr || !callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, serviceKey);
    const warnings: string[] = [];

    console.log("[delete-account] deleting self account:", callerId);

    const { data: profile } = await sb
      .from("profiles")
      .select("email")
      .eq("user_id", callerId)
      .maybeSingle();
    const email = profile?.email?.trim().toLowerCase() ?? null;

    const { data: student } = await sb
      .from("students")
      .select("id")
      .eq("auth_user_id", callerId)
      .maybeSingle();

    const { data: messageRows } = await sb
      .from("academy_messages")
      .select("id")
      .eq("user_id", callerId);
    const messageIds = (messageRows ?? []).map((row) => row.id);

    const { data: replyRows } = await sb
      .from("coach_ticket_replies")
      .select("id")
      .eq("user_id", callerId);
    const replyIds = (replyRows ?? []).map((row) => row.id);

    const { data: ticketRows } = await sb
      .from("coach_tickets")
      .select("id")
      .eq("user_id", callerId);
    const ticketIds = (ticketRows ?? []).map((row) => row.id);

    const { data: threadRows } = await sb
      .from("dm_threads")
      .select("id")
      .eq("user_id", callerId);
    const threadIds = (threadRows ?? []).map((row) => row.id);

    const { data: notificationRows } = await sb
      .from("academy_notifications")
      .select("id")
      .eq("user_id", callerId);
    const notificationIds = (notificationRows ?? []).map((row) => row.id);

    if (replyIds.length) {
      await deleteRows(sb, "coach_answer_reads", "reply_id", replyIds, warnings);
    }

    if (ticketIds.length) {
      const { data: ticketReplyRows } = await sb
        .from("coach_ticket_replies")
        .select("id")
        .in("ticket_id", ticketIds);
      const ticketReplyIds = (ticketReplyRows ?? []).map((row) => row.id);
      if (ticketReplyIds.length) {
        await deleteRows(sb, "coach_answer_reads", "reply_id", ticketReplyIds, warnings);
      }
      await deleteRows(sb, "coach_ticket_replies", "ticket_id", ticketIds, warnings);
    }

    if (notificationIds.length) {
      await deleteRows(sb, "notification_push_dispatches", "notification_id", notificationIds, warnings);
    }

    if (messageIds.length) {
      await deleteRows(sb, "pinned_messages", "message_id", messageIds, warnings);
      await updateDeletedMessages(sb, callerId, warnings);
    }

    if (threadIds.length) {
      await deleteRows(sb, "dm_messages", "thread_id", threadIds, warnings);
      await deleteRows(sb, "inbox_items", "dm_thread_id", threadIds, warnings);
      await deleteRows(sb, "dm_threads", "id", threadIds, warnings);
    }

    if (student?.id) {
      await deleteRows(sb, "student_access", "user_id", student.id, warnings);
    }

    await deleteRows(sb, "trade_entries", "user_id", callerId, warnings);
    await deleteRows(sb, "approved_plans", "user_id", callerId, warnings);
    await deleteRows(sb, "trade_intents", "user_id", callerId, warnings);
    await deleteRows(sb, "journal_entries", "user_id", callerId, warnings);
    await deleteRows(sb, "lesson_progress", "user_id", callerId, warnings);
    await deleteRows(sb, "playbook_progress", "user_id", callerId, warnings);
    await deleteRows(sb, "playbook_notes", "user_id", callerId, warnings);
    await deleteRows(sb, "user_playbook_state", "user_id", callerId, warnings);
    await deleteRows(sb, "onboarding_state", "user_id", callerId, warnings);
    await deleteRows(sb, "coach_requests", "user_id", callerId, warnings);
    await deleteRows(sb, "coach_answer_reads", "user_id", callerId, warnings);
    await deleteRows(sb, "coach_ticket_replies", "user_id", callerId, warnings);
    await deleteRows(sb, "coach_tickets", "user_id", callerId, warnings);
    await deleteRows(sb, "daily_checkin_responses", "user_id", callerId, warnings);
    await deleteRows(sb, "daily_memory", "user_id", callerId, warnings);
    await deleteRows(sb, "live_session_attendance", "user_id", callerId, warnings);
    await deleteRows(sb, "notification_log", "user_id", callerId, warnings);
    await deleteRows(sb, "academy_notification_reads", "user_id", callerId, warnings);
    await deleteRows(sb, "academy_notifications", "user_id", callerId, warnings);
    await deleteRows(sb, "device_tokens", "user_id", callerId, warnings);
    await deleteRows(sb, "user_preferences", "user_id", callerId, warnings);
    await deleteRows(sb, "vault_daily_checklist", "user_id", callerId, warnings);
    await deleteRows(sb, "vault_focus_sessions", "user_id", callerId, warnings);
    await deleteRows(sb, "vault_events", "user_id", callerId, warnings);
    await deleteRows(sb, "vault_state", "user_id", callerId, warnings);
    await deleteRows(sb, "trader_dna", "user_id", callerId, warnings);
    await deleteRows(sb, "user_task", "user_id", callerId, warnings);
    await deleteRows(sb, "academy_user_roles", "user_id", callerId, warnings);
    await deleteRows(sb, "user_roles", "user_id", callerId, warnings);
    await deleteRows(sb, "content_reports", "reporter_id", callerId, warnings);
    await deleteRows(sb, "content_reports", "reported_user_id", callerId, warnings);
    await deleteRows(sb, "inbox_dismissals", "user_id", callerId, warnings);
    await deleteRows(sb, "inbox_items", "user_id", callerId, warnings);
    await deleteRows(sb, "inbox_items", "sender_id", callerId, warnings);
    await deleteRows(sb, "dm_messages", "sender_id", callerId, warnings);
    await deleteRows(sb, "ios_membership_activations", "user_id", callerId, warnings);
    await deleteRows(sb, "referrals", "referrer_user_id", callerId, warnings);
    await deleteRows(sb, "referrals", "referred_user_id", callerId, warnings);
    await deleteRows(sb, "students", "auth_user_id", callerId, warnings);

    if (email) {
      await deleteRows(sb, "allowed_signups", "email", email, warnings);
    }

    await deleteRows(sb, "profiles", "user_id", callerId, warnings);

    const { error: deleteAuthError } = await sb.auth.admin.deleteUser(callerId);
    if (deleteAuthError) throw deleteAuthError;

    return new Response(JSON.stringify({ deleted: true, warnings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[delete-account] error:", error);
    return new Response(JSON.stringify({ error: "We couldn't delete your account. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
