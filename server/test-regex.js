const dbRows = [
  '1梅苑食街·嗜睹鸡煲(市里面的老字号',
  '刚开',
  '始鸡有点硬',
  '慢慢煮一下就好很多',
  '好!)'
];
const combined = dbRows.join('\u000a');
console.log('--- BEFORE ---');
console.log(combined);

// Regex we currently use
const cleanText = combined.replace(/[（(][^）)]*[）)]/g, '【STRIPPED】');

console.log('\n--- AFTER ---');
console.log(cleanText);
