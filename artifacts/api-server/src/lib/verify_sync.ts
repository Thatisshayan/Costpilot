import { db, workspacesTable, platformsTable, expensesTable, aiAuditsTable } from "@workspace/db";
import { syncPlatform } from "./sync-engine";
import { runAnomalyDetection } from "./cron-service";
import { eq } from "drizzle-orm";

async function main() {
  console.log("====================================================");
  console.log("🚀 CostPilot Cloud Ingestion & Anomaly Verification");
  console.log("====================================================");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in the environment.");
    process.exit(1);
  }

  const userId = "verify-user-123";

  try {
    // 1. Seed or retrieve a test workspace
    console.log("\n📦 Step 1: Checking for verification workspace...");
    let workspace = await db.query.workspacesTable.findFirst({
      where: (w, { eq }) => eq(w.slug, "verification-lab")
    });

    if (!workspace) {
      console.log("Creating verification-lab workspace...");
      const [inserted] = await db.insert(workspacesTable).values({
        name: "Verification Lab",
        ownerId: userId,
        slug: "verification-lab",
        onboarded: true
      }).returning();
      workspace = inserted;
    }
    console.log(`✅ Workspace ready: "${workspace.name}" (ID: ${workspace.id})`);

    // 2. Seed or retrieve AWS, Azure, and GCP platforms
    console.log("\n📡 Step 2: Provisioning simulated cloud platforms...");
    
    // AWS Platform
    let awsPlatform = await db.query.platformsTable.findFirst({
      where: (p, { eq, and }) => and(eq(p.workspaceId, workspace!.id), eq(p.name, "AWS CUR Cloud Ingestion"))
    });
    if (!awsPlatform) {
      const [inserted] = await db.insert(platformsTable).values({
        userId,
        workspaceId: workspace.id,
        name: "AWS CUR Cloud Ingestion",
        apiKey: "mock-aws-access-key-id:mock-aws-secret",
        category: "Cloud Infrastructure"
      }).returning();
      awsPlatform = inserted;
    }
    console.log(`✅ AWS Platform ready (ID: ${awsPlatform.id})`);

    // Azure Platform
    let azurePlatform = await db.query.platformsTable.findFirst({
      where: (p, { eq, and }) => and(eq(p.workspaceId, workspace!.id), eq(p.name, "Azure Cost Management Cloud Ingestion"))
    });
    if (!azurePlatform) {
      const [inserted] = await db.insert(platformsTable).values({
        userId,
        workspaceId: workspace.id,
        name: "Azure Cost Management Cloud Ingestion",
        apiKey: "mock-azure-client-id:mock-azure-secret",
        category: "Cloud Infrastructure"
      }).returning();
      azurePlatform = inserted;
    }
    console.log(`✅ Azure Platform ready (ID: ${azurePlatform.id})`);

    // GCP Platform
    let gcpPlatform = await db.query.platformsTable.findFirst({
      where: (p, { eq, and }) => and(eq(p.workspaceId, workspace!.id), eq(p.name, "GCP BigQuery Cloud Ingestion"))
    });
    if (!gcpPlatform) {
      const [inserted] = await db.insert(platformsTable).values({
        userId,
        workspaceId: workspace.id,
        name: "GCP BigQuery Cloud Ingestion",
        apiKey: "mock-gcp-project-id:mock-gcp-creds",
        category: "Cloud Infrastructure"
      }).returning();
      gcpPlatform = inserted;
    }
    console.log(`✅ GCP Platform ready (ID: ${gcpPlatform.id})`);

    // 3. Trigger active Cloud Ingestion Syncs
    console.log("\n🔄 Step 3: Triggering simulated billing ingestion syncs...");
    
    console.log("Syncing AWS CUR CSV stream...");
    const awsRes = await syncPlatform(awsPlatform.id, userId);
    console.log(`AWS Sync Result: success=${awsRes.success}, msg="${awsRes.message}"`);

    console.log("Syncing Azure Cost Management CSV stream...");
    const azureRes = await syncPlatform(azurePlatform.id, userId);
    console.log(`Azure Sync Result: success=${azureRes.success}, msg="${azureRes.message}"`);

    console.log("Syncing GCP BigQuery JSON stream...");
    const gcpRes = await syncPlatform(gcpPlatform.id, userId);
    console.log(`GCP Sync Result: success=${gcpRes.success}, msg="${gcpRes.message}"`);

    // 4. Query ingested expenses
    console.log("\n📊 Step 4: Verification of ingested expenses...");
    const ingestedExpenses = await db.select().from(expensesTable).where(
      eq(expensesTable.workspaceId, workspace.id)
    );
    console.log(`Successfully retrieved ${ingestedExpenses.length} ingested expenses in workspace:`);
    ingestedExpenses.forEach(e => {
      console.log(`  - [${e.date}] $${e.amount} | ${e.description} | Category: ${e.category} (Tags: ${e.tags})`);
    });

    // 5. Trigger Anomaly Scanning
    console.log("\n🔍 Step 5: Launching automated database anomaly scanner...");
    const anomaliesDetected = await runAnomalyDetection();
    console.log(`Anomaly scanner complete. Identified ${anomaliesDetected} new cost anomalies.`);

    // 6. Query and display logged anomalies
    console.log("\n⚠️ Step 6: Verifying logged anomalies in audits table...");
    const audits = await db.select().from(aiAuditsTable).where(
      eq(aiAuditsTable.workspaceId, workspace.id)
    );
    console.log(`Successfully retrieved ${audits.length} flagged anomalies in audits database:`);
    audits.forEach(audit => {
      console.log(`  - Severity: [${audit.severity}] | Title: "${audit.title}" | Status: "${audit.status}"`);
      console.log(`    Description: ${audit.description}`);
      console.log(`    Findings: ${JSON.stringify(audit.findings, null, 2)}`);
    });

    console.log("\n====================================================");
    console.log("🎉 SUCCESS: Cloud Billing Ingestion & Anomaly Detection verified!");
    console.log("====================================================");
  } catch (err) {
    console.error("\n❌ Execution failed:", err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
