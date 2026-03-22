const text = `1梅苑食街·嗜睹鸡煲(市里面的老字号
刚开
始鸡有点硬
慢慢煮一下就好很多
好!)`;
const cleanText = text.replace(/[（(][^）)]*[）)]/g, '');
console.log('cleanText:', JSON.stringify(cleanText));
