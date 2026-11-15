import { db } from "../db/index.js";
import { userDevices } from "../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class PushService {
  /**
   * Register or update a mobile/web device token for a user
   */
  static async registerDevice(userId: string, token: string, platform: "android" | "ios" | "web" = "android") {
    const cleanToken = token.trim();
    if (!cleanToken) {
      throw new Error("Device push token cannot be empty");
    }

    // Check if token already registered for this user
    const [existing] = await db
      .select()
      .from(userDevices)
      .where(and(eq(userDevices.userId, userId), eq(userDevices.token, cleanToken)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(userDevices)
        .set({ platform, updatedAt: new Date() })
        .where(eq(userDevices.id, existing.id))
        .returning();
      return updated;
    }

    const [newDevice] = await db
      .insert(userDevices)
      .values({
        userId,
        token: cleanToken,
        platform,
      })
      .returning();

    return newDevice;
  }

  /**
   * Unregister / remove device push token (e.g. on logout)
   */
  static async removeDevice(userId: string, token: string) {
    const cleanToken = token.trim();
    await db
      .delete(userDevices)
      .where(and(eq(userDevices.userId, userId), eq(userDevices.token, cleanToken)));

    return { message: "Device token unregistered successfully" };
  }

  /**
   * Dispatches push notification to all active devices of the target user.
   * If FCM_SERVER_KEY is configured, sends via Firebase Cloud Messaging.
   * Gracefully falls back to mock logger in non-FCM environments.
   */
  static async sendPushNotification(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<{ success: boolean; deviceCount: number }> {
    try {
      const devices = await db
        .select()
        .from(userDevices)
        .where(eq(userDevices.userId, userId));

      if (!devices || devices.length === 0) {
        return { success: false, deviceCount: 0 };
      }

      const fcmKey = process.env.FCM_SERVER_KEY;

      if (fcmKey) {
        // Production FCM dispatch
        const sendPromises = devices.map(async (device) => {
          try {
            const response = await fetch("https://fcm.googleapis.com/fcm/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `key=${fcmKey}`,
              },
              body: JSON.stringify({
                to: device.token,
                notification: {
                  title: payload.title,
                  body: payload.body,
                  sound: "default",
                },
                data: payload.data || {},
              }),
            });

            const data: any = await response.json();
            if (data?.results?.[0]?.error === "NotRegistered" || data?.results?.[0]?.error === "InvalidRegistration") {
              // Stale token, remove from database
              await db.delete(userDevices).where(eq(userDevices.id, device.id));
            }
          } catch (err) {
            console.warn(`[PushService] Failed to dispatch FCM push to device ${device.id}:`, err);
          }
        });

        await Promise.allSettled(sendPromises);
      } else {
        // Fallback / Log notification transmission
        console.log(
          `📱 [PushService] Push Notification dispatched to ${devices.length} device(s) of User ${userId}: "${payload.title}" - ${payload.body}`
        );
      }

      return { success: true, deviceCount: devices.length };
    } catch (error) {
      console.warn(`[PushService] Error in sendPushNotification for User ${userId}:`, error);
      return { success: false, deviceCount: 0 };
    }
  }
}
