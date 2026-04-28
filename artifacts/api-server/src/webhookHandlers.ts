import { getStripeSync } from './stripeClient';
import { storage } from './storage';
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    
    // After processing, sync subscription status to users table
    await WebhookHandlers.syncUserSubscriptions();
  }
  
  static async syncUserSubscriptions(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) return;
    
    const sqlClient = neon(connectionString);
    const db = drizzle(sqlClient);
    
    try {
      // Update users table with subscription status from stripe.subscriptions
      await db.execute(sql`
        UPDATE users u
        SET 
          stripe_subscription_id = s.id,
          subscription_status = s.status
        FROM stripe.subscriptions s
        JOIN stripe.customers c ON s.customer = c.id
        WHERE c.metadata->>'userId' = u.id
        AND s.status IN ('active', 'trialing', 'past_due', 'canceled')
      `);
      
      console.log('[Webhook] Synced subscription status to users table');
    } catch (error) {
      console.error('[Webhook] Failed to sync subscription status:', error);
    }
  }
}
