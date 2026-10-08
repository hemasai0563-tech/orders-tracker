import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);

const BILLS_TABLE = "OrdersTracker_Bills";
const CONFIG_TABLE = "OrdersTracker_Config";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Content-Type": "application/json"
};

export const handler = async (event) => {
  const method = (event.requestContext?.http?.method || event.httpMethod || "GET").toUpperCase();

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ status: "ok" })
    };
  }

  try {
    if (method === "GET") {
      // 1. Scan Bills
      const scanBillsRes = await ddb.send(new ScanCommand({ TableName: BILLS_TABLE }));
      const bills = scanBillsRes.Items || [];

      // 2. Fetch Attendance, Accounts, and Locations config
      let attendance = null;
      let accounts = null;
      let locations = null;
      try {
        const attRes = await ddb.send(new GetCommand({ TableName: CONFIG_TABLE, Key: { configKey: "attendance" } }));
        attendance = attRes.Item?.data || null;

        const accRes = await ddb.send(new GetCommand({ TableName: CONFIG_TABLE, Key: { configKey: "accounts" } }));
        accounts = accRes.Item?.data || null;

        const locRes = await ddb.send(new GetCommand({ TableName: CONFIG_TABLE, Key: { configKey: "agent_locations" } }));
        locations = locRes.Item?.data || null;
      } catch (err) {
        console.warn("Config fetch warning:", err);
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: "success",
          count: bills.length,
          bills: bills,
          attendance: attendance,
          accounts: accounts,
          locations: locations,
          serverTime: new Date().toISOString()
        })
      };
    }

    if (method === "POST" || method === "PUT") {
      let body = {};
      if (event.body) {
        try {
          body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        } catch (e) {
          if (event.isBase64Encoded) {
            const buff = Buffer.from(event.body, 'base64');
            body = JSON.parse(buff.toString('utf-8'));
          } else {
            return {
              statusCode: 400,
              headers: CORS_HEADERS,
              body: JSON.stringify({ status: "error", message: "Invalid JSON body" })
            };
          }
        }
      }

      const action = body.action || (body.bill?.invoiceNo ? "upsert_bill" : (body.bills ? "sync_all" : "unknown"));

      // 1. Update Attendance
      if (action === "update_attendance" || body.attendance) {
        const attendanceData = body.attendance || body.data?.attendance || body.data;
        await ddb.send(new PutCommand({
          TableName: CONFIG_TABLE,
          Item: {
            configKey: "attendance",
            data: attendanceData,
            updatedAt: new Date().toISOString()
          }
        }));

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ status: "success", message: "Attendance synced to AWS." })
        };
      }

      // 2. Update Accounts
      if (action === "update_accounts" || body.accounts) {
        const accountsData = body.accounts || body.data?.accounts || body.data;
        await ddb.send(new PutCommand({
          TableName: CONFIG_TABLE,
          Item: {
            configKey: "accounts",
            data: accountsData,
            updatedAt: new Date().toISOString()
          }
        }));

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ status: "success", message: "Accounts synced to AWS." })
        };
      }

      // 3. Update Agent Locations (Live Duty Telemetry)
      if (action === "update_locations" || action === "update_agent_location" || body.agentLocations || body.locations) {
        const locData = body.agentLocations || body.locations || body.data;
        await ddb.send(new PutCommand({
          TableName: CONFIG_TABLE,
          Item: {
            configKey: "agent_locations",
            data: locData,
            updatedAt: new Date().toISOString()
          }
        }));

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ status: "success", message: "Live agent locations synced to AWS." })
        };
      }

      // 3. Delete Bill
      if (action === "delete_bill" || body.action === "delete") {
        const invoiceNo = String(body.invoiceNo || body.bill?.invoiceNo || "");
        if (!invoiceNo) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ status: "error", message: "Missing invoiceNo for delete" })
          };
        }
        await ddb.send(new DeleteCommand({
          TableName: BILLS_TABLE,
          Key: { invoiceNo }
        }));

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ status: "success", message: `Bill ${invoiceNo} deleted.` })
        };
      }

      // 4. Full Bulk Sync
      if (action === "sync_all" || Array.isArray(body.bills)) {
        const bills = body.bills || [];
        for (const bill of bills) {
          if (bill && bill.invoiceNo) {
            bill.lastUpdated = bill.lastUpdated || new Date().toISOString();
            await ddb.send(new PutCommand({
              TableName: BILLS_TABLE,
              Item: bill
            }));
          }
        }

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ status: "success", message: `Synced ${bills.length} bills to AWS DynamoDB.` })
        };
      }

      // 5. Single Bill Upsert
      if (action === "upsert_bill" || body.bill || body.invoiceNo) {
        const bill = body.bill || body;
        if (!bill.invoiceNo) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ status: "error", message: "Missing invoiceNo" })
          };
        }

        bill.lastUpdated = bill.lastUpdated || new Date().toISOString();
        await ddb.send(new PutCommand({
          TableName: BILLS_TABLE,
          Item: bill
        }));

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ status: "success", message: `Bill ${bill.invoiceNo} saved in AWS DynamoDB.`, bill })
        };
      }

      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ status: "error", message: `Unknown action: ${action}` })
      };
    }

    if (method === "DELETE") {
      const invoiceNo = event.queryStringParameters?.invoiceNo;
      if (!invoiceNo) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ status: "error", message: "Missing invoiceNo parameter" })
        };
      }

      await ddb.send(new DeleteCommand({
        TableName: BILLS_TABLE,
        Key: { invoiceNo }
      }));

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ status: "success", message: `Bill ${invoiceNo} deleted from AWS.` })
      };
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ status: "error", message: `Method ${method} not allowed` })
    };
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ status: "error", message: error.message || error.toString() })
    };
  }
};
