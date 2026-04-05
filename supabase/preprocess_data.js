const filename = "data.group.json";
const backupName = "data.group.before.json";

const file = Bun.file(filename);
const transactions = await file.json();

await Bun.write(backupName, file);

const processed = transactions
  .map((item) => ({
    ...item,
    amount: Number(item.amount),
  }))
  .sort((a, b) => a.category.localeCompare(b.category));

// 3. Write processed data back to original file
await Bun.write(filename, JSON.stringify(processed, null, 2));

console.log("Backup created and file updated successfully.");
