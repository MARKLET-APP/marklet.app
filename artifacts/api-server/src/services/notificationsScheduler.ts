/**
 * LAZEMNI — Notifications Automation Scheduler
 * Handles: inactive user nudges (3/7/14 days), service rating prompts, daily tasks
 * Uses: PostgreSQL (Drizzle ORM) + existing sendPushToUser from pushService
 */

import { db, usersTable, notificationsTable } from "@workspace/db";
import { and, lt, isNotNull, gte, lte, eq } from "drizzle-orm";
import { sendPushToUser } from "./pushService.js";

// ─── Inactive User Notifications ─────────────────────────────────────────────

interface InactivityLevel {
  minDays: number;
  maxDays: number;
  title: string;
  body: string;
  tag: string;
}

const INACTIVITY_LEVELS: InactivityLevel[] = [
  {
    minDays: 3,
    maxDays: 4,
    title: "إعلانات جديدة تنتظرك 🚗",
    body: "تصفّح آخر السيارات والعروض المضافة في منطقتك — لا تفوّت صفقة مناسبة",
    tag: "inactive-3d",
  },
  {
    minDays: 7,
    maxDays: 8,
    title: "هل وجدت ما تبحث عنه؟ 🔍",
    body: "أكثر من 100 إعلان جديد أضيفت هذا الأسبوع — سيارات، عقارات، وظائف وأكثر",
    tag: "inactive-7d",
  },
  {
    minDays: 14,
    maxDays: 15,
    title: "الفرصة لا تنتظر 💥",
    body: "أفضل الأسعار والعروض في LAZEMNI — تصفّح الآن وأضف إعلانك مجاناً",
    tag: "inactive-14d",
  },
];

export async function notifyInactiveUsers(): Promise<void> {
  const now = new Date();

  for (const level of INACTIVITY_LEVELS) {
    const minDate = new Date(now.getTime() - level.maxDays * 24 * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() - level.minDays * 24 * 60 * 60 * 1000);

    try {
      const users = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          and(
            isNotNull(usersTable.lastActiveAt),
            gte(usersTable.lastActiveAt, minDate),
            lte(usersTable.lastActiveAt, maxDate),
            eq(usersTable.isBanned, false)
          )
        );

      let sent = 0;
      for (const user of users) {
        try {
          await sendPushToUser(user.id, {
            title: level.title,
            body: level.body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-96.png",
            url: "/",
            tag: level.tag,
          });
          sent++;
        } catch {
          // Silent — user may have no push tokens
        }
      }

      if (users.length > 0) {
        console.log(`[Scheduler] Inactive ${level.minDays}d: sent to ${sent}/${users.length} users`);
      }
    } catch (err) {
      console.error(`[Scheduler] notifyInactiveUsers (${level.minDays}d) error:`, err);
    }
  }
}

// ─── Service Rating Notification ─────────────────────────────────────────────

type ServiceType = "inspection" | "showroom" | "scrap" | "buy-request";

const SERVICE_LABELS: Record<ServiceType, string> = {
  inspection: "فحص السيارة",
  showroom: "زيارة المعرض",
  scrap: "مركز الخردة",
  "buy-request": "طلب الشراء",
};

/**
 * Call this after a user completes or interacts with a service
 * (e.g. after booking an inspection, or after a buy-request is matched)
 */
export async function notifyServiceRating(
  userId: number,
  serviceType: ServiceType,
  serviceId?: number
): Promise<void> {
  const label = SERVICE_LABELS[serviceType] || "الخدمة";

  try {
    await sendPushToUser(userId, {
      title: "كيف كانت تجربتك؟ ⭐",
      body: `قيّم ${label} الآن وساعدنا في تحسين المنصة`,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      url: serviceId ? `/${serviceType}s/${serviceId}` : "/",
      tag: `rating-${serviceType}-${serviceId ?? ""}`,
    });
  } catch (err) {
    console.error(`[Scheduler] notifyServiceRating error (user ${userId}):`, err);
  }
}

// ─── New Message Notification (helper for chat routes) ────────────────────────

/**
 * Send a push notification for a new chat message
 */
export async function notifyNewMessage(
  toUserId: number,
  fromUserName: string,
  messageText: string,
  conversationId: number
): Promise<void> {
  const shortText =
    messageText.length > 60 ? messageText.slice(0, 60) + "..." : messageText;

  try {
    await sendPushToUser(toUserId, {
      title: `رسالة من ${fromUserName}`,
      body: shortText || "رسالة جديدة",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      url: `/chat?conv=${conversationId}`,
      tag: `chat-${conversationId}`,
    });
  } catch (err) {
    console.error(`[Scheduler] notifyNewMessage error (user ${toUserId}):`, err);
  }
}

// ─── Daily Tasks Runner ───────────────────────────────────────────────────────

export async function runDailyTasks(): Promise<void> {
  console.log("[Scheduler] Running daily tasks...");
  try {
    await notifyInactiveUsers();
    console.log("[Scheduler] Daily tasks completed ✓");
  } catch (err) {
    console.error("[Scheduler] Daily tasks error:", err);
  }
}

// ─── Scheduler Startup ───────────────────────────────────────────────────────

const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let schedulerTimer: NodeJS.Timeout | null = null;

export function startNotificationsScheduler(): void {
  if (schedulerTimer) return; // Already running

  // Run once after 5 min on startup to avoid hammering on cold start
  const startupDelay = 5 * 60 * 1000;

  const initialTimer = setTimeout(async () => {
    await runDailyTasks();

    // Then repeat every 24 hours
    schedulerTimer = setInterval(runDailyTasks, DAILY_INTERVAL_MS);
  }, startupDelay);

  // Keep reference to allow cleanup
  (initialTimer as NodeJS.Timeout).unref?.();

  console.log(`[Scheduler] Notifications scheduler started — first run in 5 min, then every 24h`);
}

export function stopNotificationsScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[Scheduler] Stopped");
  }
}
