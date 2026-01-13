# WhatsApp Cloud API Integration Guide for Node.js/Express

This guide outlines the steps to integrate the WhatsApp Cloud API into your Node.js/Express web application to send weekly and monthly PDF sales reports. We will leverage Meta's free tier, which allows for 1,000 free conversations per month.

## 1. Meta Developer Account and WhatsApp Business App Setup

To begin, you need to set up a Meta Developer account and create a WhatsApp Business App. This app will serve as the interface between your web application and the WhatsApp Cloud API.

### 1.1 Create a Meta Developer Account

If you don't already have one, navigate to the [Meta for Developers website](https://developers.facebook.com/) and sign up or log in using your Facebook account.

### 1.2 Create a New WhatsApp Business App

1.  Once logged in, go to the [Apps Dashboard](https://developers.facebook.com/apps/).
2.  Click on **"Create App"**.
3.  Select the **"Business"** app type and click **"Next"**.
4.  Provide a **"Display Name"** for your app (e.g., "Sales Report App"), your **"App Contact Email"**, and select a **"Business Account"** (if you have one, otherwise create a new one).
5.  Click **"Create App"**.
6.  On the app dashboard, locate the **"WhatsApp"** product and click **"Set up"**.

### 1.3 Obtain Access Tokens

During development, Meta provides a temporary access token that is valid for 24 hours. For production, you will need to generate a permanent access token. It is crucial to handle these tokens securely.

1.  After setting up the WhatsApp product, you will be directed to the WhatsApp Getting Started page.
2.  Here, you will find a **"Temporary Access Token"**. Copy this token and store it securely. This token is for testing purposes only.
3.  For a **permanent access token**, you will need to follow the instructions provided by Meta to set up System Users and assign them to your WhatsApp Business Account. This process involves using the Business Manager and is more involved. Refer to the official Meta documentation for detailed steps on [Generating a Permanent Access Token](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/authentication).

## 2. WhatsApp Business Account (WABA) and Phone Number Setup

Your WhatsApp Business App needs to be linked to a WhatsApp Business Account (WABA) and a phone number to send messages.

1.  On the WhatsApp Getting Started page within your Meta Developer App, you will see a section for **"Step 2: To send and receive messages, add a phone number."**.
2.  You can use a temporary test phone number provided by Meta for initial testing.
3.  To send messages from your own business number, you will need to **add your own phone number** and verify it. This involves a verification process by Meta.

## 3. Message Template Creation for PDF Reports

To send business-initiated messages, such as sales reports, outside of a 24-hour customer service window, you must use pre-approved **Message Templates**. For sending PDF reports, you will need a template with a `DOCUMENT` header.

1.  Navigate to the **"Message Templates"** section under the WhatsApp product in your Meta Developer App.
2.  Click **"Create Template"**.
3.  Choose a **"Category"** (e.g., "Utility"), a **"Name"** (e.g., "monthly_sales_report"), and a **"Language"**.
4.  For the **"Header"** type, select **"Document"**. This will allow you to attach a PDF file.
5.  In the **"Body"** section, write the message content that will accompany your PDF report. You can use variables (e.g., `{{1}}`, `{{2}}`) for dynamic content like the reporting period or a personalized greeting.
    *Example Body*: "Hello {{1}}, here is your sales report for {{2}}."
6.  Optionally, add a **"Footer"** and **"Buttons"**.
7.  Submit the template for review. Meta typically reviews templates within minutes, but it can take longer.

## 4. PDF Generation in Node.js

Since you are using Node.js/Express, you can use a library like `pdfkit` or `html-pdf` to generate PDF files dynamically from your sales data. Here's a basic example using `pdfkit`:

First, install the library:

```bash
npm install pdfkit
```

Then, you can create a function to generate your PDF:

```javascript
const PDFDocument = require("pdfkit");
const fs = require("fs");

async function generateSalesReportPdf(data, filename) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filename);

    doc.pipe(stream);

    doc.fontSize(25).text("Monthly Sales Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Report Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Example: Add data to the PDF
    data.forEach(item => {
      doc.text(`Product: ${item.product}, Sales: ${item.sales}`);
    });

    doc.end();

    stream.on("finish", () => {
      resolve(filename);
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
}

// Example usage:
// const salesData = [
//   { product: "Product A", sales: 1000 },
//   { product: "Product B", sales: 1500 },
// ];
// generateSalesReportPdf(salesData, "./sales_report.pdf")
//   .then(filePath => console.log(`PDF generated at: ${filePath}`))В 
//   .catch(err => console.error("Error generating PDF:", err));
```

## 5. SQL Server 2008 Integration with Node.js

To fetch data from SQL Server 2008, you can use the `mssql` package in Node.js. You'll need to ensure you have the necessary drivers and configurations.

First, install the package:

```bash
npm install mssql
```

Then, you can configure your connection and query data:

```javascript
const sql = require("mssql");

const config = {
  user: "your_username",
  password: "your_password",
  server: "your_server_address", // You may need to specify port, e.g., 'localhost\\SQLEXPRESS'
  database: "your_database_name",
  options: {
    encrypt: false, // For SQL Server 2008, you might need to set this to false
    trustServerCertificate: true, // Change to true for local dev / self-signed certs
  },
};

async function getSalesData() {
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT ProductName, SUM(SalesAmount) as Sales FROM SalesTable GROUP BY ProductName`;
    console.log(result.recordset);
    return result.recordset;
  } catch (err) {
    console.error("SQL error", err);
    throw err;
  } finally {
    await sql.close();
  }
}

// Example usage:
// getSalesData()
//   .then(data => console.log("Fetched sales data:", data))
//   .catch(err => console.error("Error fetching data:", err));
```

**Important Considerations for SQL Server 2008:**

*   **Connectivity**: Ensure your Node.js application can connect to the SQL Server instance. This might involve network configuration, firewall rules, and enabling TCP/IP for SQL Server.
*   **Authentication**: Use appropriate authentication methods (SQL Server Authentication or Windows Authentication).
*   **`encrypt` and `trustServerCertificate`**: For older SQL Server versions or local development, you might need to adjust these options in the `mssql` configuration.

## 6. Sending PDF Reports via WhatsApp Cloud API (Node.js/Express)

Once you have your PDF generated and a pre-approved message template, you can send the PDF using the WhatsApp Cloud API. You'll need to upload the PDF to a publicly accessible URL or directly to Meta's servers (which is more complex for media).

For simplicity, we'll assume the PDF is generated and saved to a location accessible via a public URL. If your web app is not publicly accessible, you might need to use a service like `ngrok` during development or upload the PDF to a cloud storage service (e.g., AWS S3, Google Cloud Storage) and generate a signed URL.

```javascript
const axios = require("axios");

async function sendWhatsAppPdfReport(recipientPhoneNumber, pdfUrl, reportPeriod) {
  const accessToken = "YOUR_PERMANENT_ACCESS_TOKEN"; // Replace with your permanent access token
  const phoneNumberId = "YOUR_PHONE_NUMBER_ID"; // Replace with your WhatsApp Phone Number ID
  const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  try {
    const response = await axios.post(apiUrl, {
      messaging_product: "whatsapp",
      to: recipientPhoneNumber,
      type: "template",
      template: {
        name: "monthly_sales_report", // Must match your approved template name
        language: {
          code: "en_US",
        },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "document",
                document: {
                  link: pdfUrl,
                  filename: `sales_report_${reportPeriod}.pdf`, // Optional: specify filename
                },
              },
            ],
          },
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: "Customer Name", // Corresponds to {{1}} in your template body
              },
              {
                type: "text",
                text: reportPeriod, // Corresponds to {{2}} in your template body
              },
            ],
          },
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("WhatsApp message sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error.response ? error.response.data : error.message);
    throw error;
  }
}

// Example usage:
// const recipient = "2348012345678"; // Recipient's WhatsApp number with country code
// const pdfReportUrl = "https://example.com/reports/monthly_sales_report_jan_2026.pdf";
// const period = "January 2026";
// sendWhatsAppPdfReport(recipient, pdfReportUrl, period)
//   .then(() => console.log("Report sent!"))
//   .catch(err => console.error("Failed to send report:", err));
```

**Note on `axios`:** If you don't have `axios` installed, you can install it via npm:

```bash
npm install axios
```

## 7. Putting it all together (Example Flow)

Here's how you might combine these pieces in your Express application:

```javascript
const express = require("express");
const app = express();
const port = 3000;

// ... (PDF generation and SQL Server connection functions from above)

app.get("/send-monthly-report", async (req, res) => {
  try {
    const salesData = await getSalesData(); // Fetch data from SQL Server
    const reportFilename = `./reports/monthly_sales_report_${new Date().getFullYear()}_${new Date().getMonth() + 1}.pdf`;
    const pdfFilePath = await generateSalesReportPdf(salesData, reportFilename); // Generate PDF

    // In a real application, you would upload this PDF to a public storage
    // and get a public URL. For demonstration, let's assume it's accessible.
    const publicPdfUrl = "YOUR_PUBLIC_URL_TO_REPORT"; // Replace with actual public URL

    const recipient = "RECIPIENT_WHATSAPP_NUMBER"; // Replace with actual recipient
    const reportPeriod = "January 2026"; // Dynamic report period

    await sendWhatsAppPdfReport(recipient, publicPdfUrl, reportPeriod);

    res.status(200).send("Monthly report sent successfully!");
  } catch (error) {
    console.error("Error sending monthly report:", error);
    res.status(500).send("Failed to send monthly report.");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
```

**Next Steps:**

*   Implement the actual logic for fetching and formatting your sales data from SQL Server into the PDF.
*   Set up a mechanism to make your generated PDFs publicly accessible (e.g., upload to cloud storage).
*   Replace placeholder values (`YOUR_PERMANENT_ACCESS_TOKEN`, `YOUR_PHONE_NUMBER_ID`, `RECIPIENT_WHATSAPP_NUMBER`, `YOUR_PUBLIC_URL_TO_REPORT`).
*   Consider error handling and logging for production environments.
*   For scheduling, you would integrate this logic with a cron job or a Node.js scheduling library like `node-cron` (covered in the next phase).

## References

1.  [Meta for Developers - WhatsApp Business Platform Pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
2.  [Meta for Developers - Sending Document Messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/document-messages/)
3.  [Meta for Developers - Message Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/message-templates)
4.  [PDFKit - A JavaScript PDF generation library](http://pdfkit.org/)
5.  [mssql - Microsoft SQL Server client for Node.js](https://www.npmjs.com/package/mssql)
6.  [Axios - Promise based HTTP client for the browser and node.js](https://axios-http.com/docs/)

## 8. Scheduling Weekly and Monthly Reports

To automate the sending of reports, you can use the `node-cron` package. This allows you to schedule tasks using cron syntax.

### 8.1 Install node-cron

```bash
npm install node-cron
```

### 8.2 Implementation Example

Add this to your main application file (e.g., `app.js` or `server.js`):

```javascript
const cron = require('node-cron');

// ... (Include your PDF generation and WhatsApp sending functions)

// Schedule Weekly Report: Every Monday at 9:00 AM
cron.schedule('0 9 * * 1', async () => {
    console.log('Running Weekly Sales Report Task...');
    try {
        const salesData = await getWeeklySalesData(); // Implement this function
        const filename = `./reports/weekly_report_${new Date().toISOString().split('T')[0]}.pdf`;
        await generateSalesReportPdf(salesData, filename);
        
        // Upload to cloud storage and get URL
        const pdfUrl = await uploadToCloud(filename); 
        
        await sendWhatsAppPdfReport("RECIPIENT_NUMBER", pdfUrl, "Last Week");
        console.log('Weekly report sent successfully.');
    } catch (error) {
        console.error('Error in weekly report task:', error);
    }
});

// Schedule Monthly Report: 1st day of every month at 10:00 AM
cron.schedule('0 10 1 * *', async () => {
    console.log('Running Monthly Sales Report Task...');
    try {
        const salesData = await getMonthlySalesData(); // Implement this function
        const filename = `./reports/monthly_report_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`;
        await generateSalesReportPdf(salesData, filename);
        
        const pdfUrl = await uploadToCloud(filename);
        
        await sendWhatsAppPdfReport("RECIPIENT_NUMBER", pdfUrl, "Last Month");
        console.log('Monthly report sent successfully.');
    } catch (error) {
        console.error('Error in monthly report task:', error);
    }
});
```

### 8.3 Cron Syntax Reference

| Field | Description | Range |
|---|---|---|
| 1 | Minute | 0-59 |
| 2 | Hour | 0-23 |
| 3 | Day of Month | 1-31 |
| 4 | Month | 1-12 |
| 5 | Day of Week | 0-7 (0 or 7 is Sunday) |

- `0 9 * * 1`: 0th minute, 9th hour, any day of month, any month, Monday.
- `0 10 1 * *`: 0th minute, 10th hour, 1st day of month, any month, any day of week.
