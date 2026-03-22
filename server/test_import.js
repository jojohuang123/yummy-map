import { confirmImport, createImport, getImportById } from "./src/services/import-service.js";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const imp = await createImport({ cityName: "上海", cityAdcode: "310000", text: "老吉士酒家" });
  
  let ready = false;
  for (let i = 0; i < 20; i++) {
    const preview = await getImportById(imp.id);
    if (preview.status === "preview_ready") {
       ready = true; break;
    }
    await sleep(200);
  }
  
  const res = await confirmImport(imp.id);
  console.log("Confirm result:", res);
  
  const { getDb } = await import("./src/lib/db.js");
  const db = await (await import("./src/lib/db.js")).getDb();
  const rows = db.exec("SELECT data FROM favorites");
  if(rows && rows[0]) {
    console.log(rows[0].values[0][0]);
  } else {
    console.log("NO ROWS");
  }
}
run();
