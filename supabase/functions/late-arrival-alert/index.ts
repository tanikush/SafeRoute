
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: journeys, error } = await supabase
    .from("journeys")
    .select("id, user_id, destination, expected_arrival, status, late_alert_sent")
    .eq("status", "active")
    .eq("late_alert_sent", false)
    .lt("expected_arrival", new Date().toISOString());

  if (error) {
    console.error("Journey lookup failed:", error.message);
    return Response.json({ error: "Database query failed" }, { status: 500 });
  }

  return Response.json({
    message: "Overdue journey check completed",
    overdueCount: journeys?.length ?? 0,
    journeys: journeys ?? [],
  });
});
