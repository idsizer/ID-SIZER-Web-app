/* =====================================================================
   SIZER web edition — site configuration
   ---------------------------------------------------------------------
   Edit this file after uploading. It is loaded before the app.

   activationUrl
     The Cloudflare Worker / activation API base URL.
     Leave "" to run in offline trial mode.

   mlBase
     Where the background-removal model lives.
     Keep "ml/" when the ml folder sits next to index.html.
     You can also point this at a CDN, for example:
       mlBase: "https://cdn.example.com/sizer/ml/"

   checkForDesktopUpdates
     false on the web build. The update bar downloads a Windows installer,
     which does not apply to a browser.
   ===================================================================== */
window.IDPL_WEB_CONFIG = {
  version: "4.7.5",
  activationUrl: "https://idpl-activation.jasonirishilot99.workers.dev",
  mlBase: "ml/",
  checkForDesktopUpdates: false
};
